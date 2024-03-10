"use strict";

const Joi = require("joi");
const Boom = require("@hapi/boom");
const _ = require("lodash");
const Jwt = require("jsonwebtoken");
const Bcrypt = require("bcryptjs");
const zxcvbn = require("zxcvbn");
const generatePassword = require("password-generator");
const {
  authAttempt: AuthAttempt,
  user: User,
  role: Role,
  permission: Permission,
  session: Session,
  otp: Otp,
} = require("../models");
const configStore = require("../config");
const { sendResponse } = require("../helpers/sendResponse");
const { generateEndpoint } = require("../endpoints/generate");
const { getIP, generateHash, ucfirst, generateToken } = require("../utils");
const { logApiMiddleware } = require("../middlewares/audit-log");
const { Op } = require("sequelize");
const { deleteHandler } = require("../handlers/remove");
const { createHandler, updateHandler } = require("../handlers/create");
const USER_ROLES = require("../config/constants").USER_ROLES;
const REQUIRED_PASSWORD_STRENGTH =
  require("../config/constants").REQUIRED_PASSWORD_STRENGTH;
const AUTH_STRATEGIES = require("../config/constants").AUTH_STRATEGIES;
const EXPIRATION_PERIOD = require("../config/constants").EXPIRATION_PERIOD;
const authStrategy = configStore.get("/authStrategy");

const checkUserHandler = async function (req, res, next) {
  try {
    let result = await User.findOne({
      where: {
        [Op.or]: {
          mobile: req.body.mobile_email,
          email: req.body.mobile_email,
        },
      },
    });
    if (result) {
      sendResponse({
        data: { exist: true, name: result.name },
        status: 200,
        res,
        next,
      });
    } else {
      sendResponse({
        data: { exist: false },
        status: 200,
        res,
        next,
      });
    }
  } catch (err) {
    next(err);
  }
};

generateEndpoint({
  method: "post",
  path: `/check-user`,
  summary: "Check user is exists",
  tags: ["auth"],
  validate: {
    body: Joi.object({
      mobile_email: Joi.alternatives(
        Joi.string().regex(/^[0-9]{10}$/),
        Joi.string().email()
      )
        .required()
        .messages({
          "alternatives.match": "Please enter valid email or mobile number",
          "any.required": "Please enter valid email or mobile number",
        }),
    }),
  },
  auth: false,
  handler: checkUserHandler,
  log: `Generating Check Mobile endpoint for user.`,
});

const checkPasswordHandler = async function (req, res, next) {
  try {
    const results = zxcvbn(req.body.password);
    sendResponse({
      data: {
        score: results.score,
        suggestions: results.feedback.suggestions,
      },
      status: 200,
      res,
      next,
    });
  } catch (err) {
    next(err);
  }
};

generateEndpoint({
  method: "post",
  path: `/check-password`,
  summary: "Check password strength",
  tags: ["auth"],
  validate: {
    body: Joi.object({
      password: Joi.string().required().messages({
        "any.required": "Password is required",
        "string.empty": "Password can't be empty",
      }),
    }),
  },
  auth: false,
  handler: checkPasswordHandler,
  log: `Generating Check Password Strength endpoint for user.`,
});

const registerMiddleware = {
  decoded: async function (req, res, next) {
    try {
      const decode = await Jwt.verify(
        req.body.token,
        configStore.get("/jwt").secret
      );
      req.decoded = decode;
      delete req.body.token;
      next();
    } catch (err) {
      next(Boom.badRequest("Invalid token"));
    }
  },
  setMobileEmail: async function (req, res, next) {
    try {
      const user = req.decoded.mobile_email;
      const mobilePattern = /^[0-9]{10}$/;
      const emailPattern = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,63}$/;
      if (mobilePattern.test(user)) req.body.mobile = user;
      else if (emailPattern.test(user)) req.body.email = user;
      else throw Boom.badRequest("Invalid request");
      next();
    } catch (err) {
      next(err);
    }
  },
  checkUser: async function (req, res, next) {
    try {
      const condition = {
        where: {
          [Op.or]: {
            mobile: req.body.mobile,
            email: req.body.email,
          },
        },
      };
      let user = await User.findOne(condition);
      if (user) throw Boom.badRequest("User already exist.");
      next();
    } catch (err) {
      next(err);
    }
  },
  role: async function (req, res, next) {
    try {
      const conditions = {
        where: {
          name: USER_ROLES.USER,
        },
      };

      let role = await Role.findOne(conditions);
      if (!role) {
        throw Boom.badRequest("Role doesn't exist.");
      }
      req.role = role;
      next();
    } catch (err) {
      next(err);
    }
  },
  passwordStregth: async function (req, res, next) {
    try {
      const results = zxcvbn(req.body.password);

      let requiredPasswordStrength = 4;

      switch (req.role.name) {
        case USER_ROLES.USER:
          requiredPasswordStrength = REQUIRED_PASSWORD_STRENGTH.USER;
          break;
        case USER_ROLES.ADMIN:
          requiredPasswordStrength = REQUIRED_PASSWORD_STRENGTH.ADMIN;
          break;
        case USER_ROLES.SUPER_ADMIN:
          requiredPasswordStrength = REQUIRED_PASSWORD_STRENGTH.SUPER_ADMIN;
          break;
      }

      if (results.score < requiredPasswordStrength) {
        const err = Boom.badRequest("Stronger password required.");
        err.output.payload.data = results.feedback.suggestions;
        res.status(err.output.payload.statusCode).send(err.output.payload);
      } else next();
    } catch (err) {
      next(err);
    }
  },
};

const registerHandler = async function (req, res, next) {
  try {
    let user = {};

    user = req.body;
    delete user.confirmPassword;

    user[`role${ucfirst(configStore.get("/dbPrimaryKey").name)}`] =
      req.role[configStore.get("/dbPrimaryKey").name];

    user.isActive = true;

    await createHandler(User, { body: user });
    delete user.password;
    sendResponse({
      data: { user },
      status: 200,
      res,
      next,
    });
  } catch (err) {
    next(err);
  }
};

generateEndpoint({
  method: "post",
  path: `/register`,
  summary: "User registration",
  tags: ["auth"],
  validate: {
    body: Joi.object({
      token: Joi.string().required().messages({
        "any.required": "Token is required",
        "string.empty": "Token can't be empty",
      }),
      mobile: Joi.string()
        .regex(/^[0-9]{10}$/)
        .required()
        .messages({
          "any.required": "Mobile number is required",
          "string.empty": "Mobile number can't be empty",
          "string.pattern.base": "Mobile number must have 10 digits!",
        }),
      email: Joi.string().email().required().messages({
        "any.required": "Email is required",
        "string.empty": "Email can't be empty",
        "string.email": "Email must be a valid email",
      }),
      name: Joi.string().required().messages({
        "any.required": "Name is required",
        "string.empty": "Name can't be empty",
      }),
      password: Joi.string().required().messages({
        "any.required": "Password is required",
        "string.empty": "Password can't be empty",
      }),
      confirmPassword: Joi.any()
        .equal(Joi.ref("password"))
        .required()
        .messages({
          "any.required": "Confirm password is required",
          "string.empty": "Confirm password can't be empty",
          "any.only": "Password does not match",
        }),
    }),
  },
  middlewares: Object.values(registerMiddleware),
  handler: registerHandler,
  afterMiddlewares: [
    logApiMiddleware({
      payloadFilter: ["name", "mobile", "email"],
    }),
  ],
  log: `Generating registration endpoint.`,
});

const sendOtpHandler = async function (req, res, next) {
  try {
    const pin = generatePassword(4, false, /\d/);
    let keyHash = generateHash(pin);
    let exists = await Otp.findOne({
      where: {
        mobileEmail: req.body.mobile_email,
      },
    });
    if (exists) {
      await deleteHandler(Otp, {
        params: { id: exists[configStore.get("/dbPrimaryKey").name] },
        body: { hardDelete: true },
      });
    }
    const otpData = await createHandler(Otp, {
      body: { mobileEmail: req.body.mobile_email, otpHash: keyHash.hash },
    });

    //To do: Send message on Mobile number or email address.
    let sms = "";
    try {
      sms = `Hi user, congrats on your win in Tambola. To claim it, fill in your email under the profile section. Click to update: ${pin} FeverFM`;
    } catch (err) {
      throw err;
    }

    const token = Jwt.sign(
      {
        mobile_email: req.body.mobile_email,
        id: otpData[configStore.get("/dbPrimaryKey").name],
      },
      configStore.get("/jwt").secret,
      {
        algorithm: configStore.get("/jwt").algo,
        expiresIn: EXPIRATION_PERIOD.MEDIUM,
      }
    );
    sendResponse({
      data: { sms, token },
      status: 200,
      res,
      next,
    });
  } catch (err) {
    next(err);
  }
};

generateEndpoint({
  method: "post",
  path: `/send-otp`,
  summary: "send otp",
  tags: ["auth"],
  validate: {
    body: Joi.object({
      mobile_email: Joi.alternatives(
        Joi.string().regex(/^[0-9]{10}$/),
        Joi.string().email()
      )
        .required()
        .messages({
          "alternatives.match": "Please enter valid email or mobile number",
          "any.required": "Please enter valid email or mobile number",
        }),
    }),
  },
  handler: sendOtpHandler,
  log: `Generating Send OTP endpoint for user.`,
});

const verifyOtpMiddleware = {
  decoded: async function (req, res, next) {
    try {
      const decode = await Jwt.verify(
        req.body.token,
        configStore.get("/jwt").secret
      );
      req.decoded = decode;
      next();
    } catch (err) {
      next(Boom.badRequest("Invalid token"));
    }
  },
  hash: async function (req, res, next) {
    try {
      const conditions = {
        where: {
          mobileEmail: req.decoded.mobile_email,
          [configStore.get("/dbPrimaryKey").name]: req.decoded.id,
        },
      };

      let hash = await Otp.findOne(conditions);
      if (!hash || !hash.otpHash) {
        throw Boom.unauthorized("Invalid otp.");
      }
      req.hash = hash;
      next();
    } catch (err) {
      next(err);
    }
  },
};

const verifyOtpHandler = async function (req, res, next) {
  try {
    const key = req.body.otp;
    let keyMatch = await Bcrypt.compare(key, req.hash.otpHash);
    if (!keyMatch) {
      throw Boom.unauthorized("Invalid token or otp.");
    }
    await deleteHandler(Otp, {
      params: { id: req.hash[configStore.get("/dbPrimaryKey").name] },
      body: { hardDelete: true },
    });
    sendResponse({
      data: { mobile_email: req.decoded.mobile_email, token: req.body.token },
      status: 200,
      res,
      next,
    });
  } catch (err) {
    next(err);
  }
};

generateEndpoint({
  method: "post",
  path: `/verify-otp`,
  summary: `Verify otp`,
  tags: ["auth"],
  validate: {
    body: Joi.object({
      token: Joi.string().required().messages({
        "any.required": "Token is required",
        "string.empty": "Token can't be empty",
      }),
      otp: Joi.string()
        .regex(/^[0-9]{4}$/)
        .required()
        .messages({
          "any.required": "OTP is required",
          "string.empty": "OTP can't be empty",
          "string.pattern.base": "OTP must have 4 digits",
        }),
    }),
  },
  middlewares: Object.values(verifyOtpMiddleware),
  handler: verifyOtpHandler,
  afterMiddlewares: [logApiMiddleware({ payloadFilter: ["token", "otp"] })],
  log: "Generating Verify OTP endpoint.",
});

const forgotPasswordMiddleware = {
  ...verifyOtpMiddleware,
  verifyOtp: async function (req, res, next) {
    try {
      const key = req.body.otp;
      let keyMatch = await Bcrypt.compare(key, req.hash.otpHash);
      if (!keyMatch) {
        throw Boom.unauthorized("Invalid token or otp.");
      }
      await deleteHandler(Otp, {
        params: { id: req.hash[configStore.get("/dbPrimaryKey").name] },
        body: { hardDelete: true },
      });
      next();
    } catch (err) {
      next(err);
    }
  },
  user: async function (req, res, next) {
    try {
      const conditions = {
        where: {
          [Op.or]: {
            mobile: req.decoded.mobile_email,
            email: req.decoded.mobile_email,
          },
        },
      };

      let user = await User.findOne(conditions);
      // NOTE: For more secure applications, the server should respond with a success even if the user isn't found
      // since this reveals the existence of an account. For more information, refer to the links below:
      // https://postmarkapp.com/guides/password-reset-best-practices
      // https://security.stackexchange.com/questions/40694/disclose-to-user-if-account-exists
      if (!user) {
        throw Boom.notFound("User not found.");
      }
      req.user = user;
      next();
    } catch (err) {
      next(err);
    }
  },
};

const forgotPasswordHandler = async function (req, res, next) {
  try {
    let keyHash = {};
    let user = {};
    keyHash = generateHash();

    const update = {
      resetPasswordHash: keyHash.hash,
    };
    user = await updateHandler(User, {
      params: { id: req.user[configStore.get("/dbPrimaryKey").name] },
      body: update,
    });
    const token = Jwt.sign(
      {
        mobile_email: req.decoded.mobile_email,
        key: keyHash.key,
      },
      configStore.get("/jwt").secret,
      {
        algorithm: configStore.get("/jwt").algo,
        expiresIn: EXPIRATION_PERIOD.MEDIUM,
      }
    );

    sendResponse({
      data: { message: "Success.", token },
      status: 200,
      res,
      next,
    });
  } catch (err) {
    next(err);
  }
};

generateEndpoint({
  method: "post",
  path: `/forgot-password`,
  summary: `Forgot password`,
  tags: ["auth"],
  validate: {
    body: Joi.object({
      token: Joi.string().required().messages({
        "any.required": "Token is required",
        "string.empty": "Token can't be empty",
      }),
      otp: Joi.string()
        .regex(/^[0-9]{4}$/)
        .required()
        .messages({
          "any.required": "OTP is required",
          "string.empty": "OTP can't be empty",
          "string.pattern.base": "OTP must have 4 digits",
        }),
    }),
  },
  middlewares: Object.values(forgotPasswordMiddleware),
  handler: forgotPasswordHandler,
  log: "Generating Forgot Password endpoint.",
});

const resetPasswordMiddleware = {
  decoded: async function (req, res, next) {
    try {
      const decode = await Jwt.verify(
        req.body.token,
        configStore.get("/jwt").secret
      );
      req.decoded = decode;
      next();
    } catch (err) {
      next(Boom.badRequest("Invalid token"));
    }
  },
  user: async function (req, res, next) {
    try {
      const conditions = {
        where: {
          [Op.or]: {
            mobile: req.decoded.mobile_email,
            email: req.decoded.mobile_email,
          },
        },
        include: [{ model: Role }],
      };
      let user = await User.unscoped().findOne(conditions);
      if (!user || !user.resetPasswordHash) {
        throw Boom.badRequest("Invalid mobile or key.");
      }
      req.user = user;
      next();
    } catch (err) {
      next(err);
    }
  },
  passwordStregth: async function (req, res, next) {
    try {
      const results = zxcvbn(req.body.password);

      let requiredPasswordStrength = 4;
      switch (req.user.role.name) {
        case USER_ROLES.USER:
          requiredPasswordStrength = REQUIRED_PASSWORD_STRENGTH.USER;
          break;
        case USER_ROLES.ADMIN:
          requiredPasswordStrength = REQUIRED_PASSWORD_STRENGTH.ADMIN;
          break;
        case USER_ROLES.SUPER_ADMIN:
          requiredPasswordStrength = REQUIRED_PASSWORD_STRENGTH.SUPER_ADMIN;
          break;
      }

      if (results.score < requiredPasswordStrength) {
        const err = Boom.badRequest("Stronger password required.");
        err.output.payload.data = results.feedback.suggestions;
        res.status(err.output.payload.statusCode).send(err.output.payload);
      } else next();
    } catch (err) {
      next(err);
    }
  },
};

const resetPasswordHandler = async function (req, res, next) {
  try {
    const key = req.decoded.key;
    let keyMatch = await Bcrypt.compare(key, req.user.resetPasswordHash);
    if (!keyMatch) {
      throw Boom.unauthorized("Invalid mobile or key.");
    }

    let passwordHash = generateHash(req.body.password);

    await updateHandler(User, {
      params: { id: req.user[configStore.get("/dbPrimaryKey").name] },
      body: { password: passwordHash.hash, resetPasswordHash: null },
    });
    sendResponse({
      status: 204,
      res,
      next,
    });
  } catch (err) {
    throw Boom.unauthorized("Invalid mobile or key.");
  }
};

generateEndpoint({
  method: "post",
  path: `/reset-password`,
  summary: `Reset password`,
  tags: ["auth"],
  validate: {
    body: Joi.object({
      token: Joi.string().required().messages({
        "any.required": "Token is required",
        "string.empty": "Token can't be empty",
      }),
      password: Joi.string().required().messages({
        "any.required": "Password is required",
        "string.empty": "Password can't be empty",
      }),
      confirmPassword: Joi.any()
        .equal(Joi.ref("password"))
        .required()
        .messages({
          "any.required": "Confirm password is required",
          "string.empty": "Confirm password can't be empty",
          "any.only": "Password does not match",
        }),
    }),
  },
  middlewares: Object.values(resetPasswordMiddleware),
  handler: resetPasswordHandler,
  afterMiddlewares: [
    logApiMiddleware({
      payloadFilter: ["token"],
    }),
  ],
  log: "Generating Reset Password endpoint.",
});

const loginMiddleware = {
  abuseDetected: async function (req, res, next) {
    try {
      const ip = getIP(req);
      const mobile_email = req.body.mobile_email;
      let detected = await AuthAttempt.abuseDetected(ip, mobile_email);
      if (detected) {
        throw Boom.unauthorized(
          "Maximum number of auth attempts reached. Please try again later."
        );
      }
      next();
    } catch (err) {
      next(err);
    }
  },
  user: async function (req, res, next) {
    try {
      const mobile_email = req.body.mobile_email;
      const password = req.body.password;

      const user = await User.findByCredentials(mobile_email, password);
      req.user = user;
      next();
    } catch (err) {
      next(err);
    }
  },
  logAttempt: async function (req, res, next) {
    try {
      if (req.user) {
        next();
      } else {
        const ip = getIP(req);
        const mobile_email = req.body.mobile_email;
        await AuthAttempt.createInstance(ip, mobile_email);
        throw Boom.unauthorized("Invalid Mobile or Password.");
      }
    } catch (err) {
      next(err);
    }
  },
  isActive: function (req, res, next) {
    try {
      if (!req.user.isActive) {
        throw Boom.unauthorized("Account is inactive.");
      }
      next();
    } catch (err) {
      next(err);
    }
  },
  isDeleted: async function (req, res, next) {
    try {
      if (
        req.user[
          configStore.get("/modelOptions").deletedAt
            ? configStore.get("/modelOptions").deletedAt
            : "deletedAt"
        ]
      ) {
        throw Boom.unauthorized("Account is deleted.");
      }
      next();
    } catch (err) {
      next(err);
    }
  },
  session: async function (req, res, next) {
    try {
      if (authStrategy === AUTH_STRATEGIES.TOKEN) {
        next();
      } else {
        req.session = await Session.createInstance(req.user);
        next();
      }
    } catch (err) {
      next(err);
    }
  },
  scope: async function (req, res, next) {
    try {
      req.scope = await Permission.getScope(req.user);
      next();
    } catch (err) {
      next(err);
    }
  },
  standardToken: async function (req, res, next) {
    try {
      const userData = {
        user: {
          name: req.user.name,
          mobile: req.user.mobile,
          email: req.user.email,
          role: {
            name: req.user.role.name,
            rank: req.user.role.rank,
          },
          [configStore.get("/dbPrimaryKey").name]:
            req.user[configStore.get("/dbPrimaryKey").name],
        },
        scope: req.scope,
      };
      switch (authStrategy) {
        case AUTH_STRATEGIES.TOKEN:
          req.standardToken = generateToken(userData, EXPIRATION_PERIOD.LONG);
          break;
        case AUTH_STRATEGIES.REFRESH:
          req.standardToken = generateToken(userData, EXPIRATION_PERIOD.SHORT);
          break;
      }
      next();
    } catch (err) {
      next(err);
    }
  },
  sessionToken: async function (req, res, next) {
    try {
      const sessionData = {
        sessionId: req.session[configStore.get("/dbPrimaryKey").name],
        sessionKey: req.session.key,
        passwordHash: req.session.passwordHash,
        scope: req.scope,
      };
      switch (authStrategy) {
        case AUTH_STRATEGIES.SESSION:
          req.sessionToken = generateToken(sessionData, EXPIRATION_PERIOD.LONG);
          break;
      }
      next();
    } catch (err) {
      next(err);
    }
  },
  refreshToken: async function (req, res, next) {
    try {
      const sessionData = {
        sessionId: req.session[configStore.get("/dbPrimaryKey").name],
        sessionKey: req.session.key,
        passwordHash: req.session.passwordHash,
        scope: req.scope,
      };
      switch (authStrategy) {
        case AUTH_STRATEGIES.REFRESH:
          req.refreshToken = generateToken(sessionData, EXPIRATION_PERIOD.LONG);
          break;
      }
      next();
    } catch (err) {
      next(err);
    }
  },
};

const loginHandler = async function (req, res, next) {
  let response = {};

  delete req.user.password;

  switch (authStrategy) {
    case AUTH_STRATEGIES.TOKEN:
      response = {
        user: req.user,
        accessToken: req.standardToken,
        scope: req.scope,
      };
      break;
    case AUTH_STRATEGIES.SESSION:
      response = {
        user: req.user,
        accessToken: req.sessionToken,
        scope: req.scope,
      };
      break;
    case AUTH_STRATEGIES.REFRESH:
      response = {
        user: req.user,
        refreshToken: req.refreshToken,
        accessToken: req.standardToken,
        scope: req.scope,
      };
      break;
    default:
      response = {
        user: req.user,
        scope: req.scope,
      };
      break;
  }
  sendResponse({
    data: response,
    status: 200,
    res,
    next,
  });
};

generateEndpoint({
  method: "post",
  path: `/login`,
  summary: `User login`,
  tags: ["auth"],
  validate: {
    body: Joi.object({
      mobile_email: Joi.alternatives(
        Joi.string().regex(/^[0-9]{10}$/),
        Joi.string().email()
      )
        .required()
        .messages({
          "alternatives.match": "Please enter valid email or mobile number",
          "any.required": "Please enter valid email or mobile number",
        }),
      password: Joi.string().required().messages({
        "any.required": "Password is required",
        "string.empty": "Password can't be empty",
      }),
    }),
  },
  middlewares: Object.values(loginMiddleware),
  handler: loginHandler,
  afterMiddlewares: [
    logApiMiddleware({ action: "login", payloadFilter: ["mobile"] }),
  ],
  log: "Generating login endpoint.",
});

const logoutHandler = async function (req, res, next) {
  try {
    const credentials = req.auth.credentials || { session: null };
    const session = credentials.session;

    if (session) {
      let sessionDoc = await Session.findByPk(
        session[configStore.get("/dbPrimaryKey").name]
      );
      if (!sessionDoc) {
        throw Boom.notFound("Session not found");
      }
      await Session.destroy({
        where: {
          [configStore.get("/dbPrimaryKey").name]:
            session[configStore.get("/dbPrimaryKey").name],
        },
        force: true,
      });
      res.removeHeader("X-Refresh-Token");
      res.removeHeader("X-Access-Token");
      sendResponse({
        status: 204,
        res,
        next,
      });
    } else {
      throw Boom.badRequest("Refresh token required in auth header to log out");
    }
  } catch (err) {
    next(err);
  }
};

generateEndpoint({
  method: "delete",
  path: `/logout`,
  summary: `User logout`,
  tags: ["auth"],
  auth: true,
  handler: logoutHandler,
  log: "Generating logout endpoint.",
});
