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
} = require("crudsify/models");
const configStore = require("crudsify/config");
const { sendResponse } = require("crudsify/helpers/sendResponse");
const { generateEndpoint } = require("crudsify/endpoints/generate");
const {
  getIP,
  generateHash,
  ucfirst,
  generateToken,
  verifyToken,
} = require("crudsify/utils");
const { logApiMiddleware } = require("crudsify/middlewares/audit-log");
const { refreshStrategy } = require("../strategies/refresh");
const { Op } = require("sequelize");
const { deleteHandler } = require("crudsify/handlers/remove");
const { createHandler, updateHandler } = require("crudsify/handlers/create");
const {
  OTP_SEND_ATTEMPT_PREFIX,
  OTP_VERIFY_ATTEMPT_PREFIX,
  PUBLIC_AUTH_ATTEMPT_PREFIX,
  OTP_VALIDITY_PERIOD_MS,
  TOKEN_TYPES,
  USER_ROLES,
  REQUIRED_PASSWORD_STRENGTH,
  PASSWORD_MAX_LENGTH,
  EXPIRATION_PERIOD,
  AUTH_ATTEMPTS,
} = require("crudsify/config/constants");

const publicAuthRateLimitMiddleware = async function (req, res, next) {
  try {
    const ip = `${PUBLIC_AUTH_ATTEMPT_PREFIX}${getIP(req) || "unknown"}`;
    if (await AuthAttempt.ipAbuseDetected(ip, AUTH_ATTEMPTS.FOR_PUBLIC_IP)) {
      throw Boom.tooManyRequests("Too many authentication requests. Try again later.");
    }
    await AuthAttempt.createInstance(ip, `${PUBLIC_AUTH_ATTEMPT_PREFIX}${req.path}`);
    next();
  } catch (err) {
    next(err);
  }
};

const checkUserHandler = async function (req, res, next) {
  try {
    sendResponse({
      data: {
        message: "If an account exists, further instructions will follow.",
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
  middlewares: [publicAuthRateLimitMiddleware],
  handler: checkUserHandler,
  afterMiddlewares: [logApiMiddleware({ payloadFilter: [] })],
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
      password: Joi.string().max(PASSWORD_MAX_LENGTH).required().messages({
        "any.required": "Password is required",
        "string.empty": "Password can't be empty",
      }),
    }),
  },
  auth: false,
  middlewares: [publicAuthRateLimitMiddleware],
  handler: checkPasswordHandler,
  afterMiddlewares: [logApiMiddleware({ payloadFilter: [] })],
  log: `Generating Check Password Strength endpoint for user.`,
});

const registerMiddleware = {
  verifiedContacts: async function (req, res, next) {
    try {
      const [mobileVerification, emailVerification] = await Promise.all([
        verifyToken(req.body.mobileToken),
        verifyToken(req.body.emailToken),
      ]);
      if (
        mobileVerification.tokenType !== TOKEN_TYPES.OTP_VERIFIED ||
        emailVerification.tokenType !== TOKEN_TYPES.OTP_VERIFIED ||
        mobileVerification.otpVerified !== true ||
        emailVerification.otpVerified !== true ||
        String(mobileVerification.mobile_email) !== String(req.body.mobile) ||
        emailVerification.mobile_email !== req.body.email
      ) {
        throw Boom.unauthorized("OTP verification required.");
      }
      delete req.body.mobileToken;
      delete req.body.emailToken;
      next();
    } catch (err) {
      next(Boom.badRequest("Invalid verification token"));
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
        sendResponse({
          data: err.output.payload,
          status: err.output.payload.statusCode,
          res
        })
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
      mobileToken: Joi.string().required().messages({
        "any.required": "Mobile verification token is required",
        "string.empty": "Mobile verification token can't be empty",
      }),
      emailToken: Joi.string().required().messages({
        "any.required": "Email verification token is required",
        "string.empty": "Email verification token can't be empty",
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
      password: Joi.string().max(PASSWORD_MAX_LENGTH).required().messages({
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
  middlewares: [publicAuthRateLimitMiddleware, ...Object.values(registerMiddleware)],
  handler: registerHandler,
  afterMiddlewares: [
    logApiMiddleware({
      payloadFilter: ["name", "mobile", "email"],
    }),
  ],
  log: `Generating registration endpoint.`,
});

const getOtpAttemptKeys = (req, mobileEmail, prefix) => ({
  ip: `${prefix}${getIP(req) || "unknown"}`,
  mobileEmail: `${prefix}${mobileEmail}`,
});

const rejectOtpAbuse = async (req, mobileEmail, prefix) => {
  const attempt = getOtpAttemptKeys(req, mobileEmail, prefix);
  const abuseDetected = await Promise.all([
    AuthAttempt.abuseDetected(attempt.ip, attempt.mobileEmail),
    AuthAttempt.identifierAbuseDetected(attempt.mobileEmail),
  ]);
  if (abuseDetected.includes(true)) {
    throw Boom.tooManyRequests("Too many OTP requests. Try again later.");
  }
  return attempt;
};

const recordFailedOtpAttempt = async (req) => {
  const attempt = getOtpAttemptKeys(
    req,
    req.decoded.mobile_email,
    OTP_VERIFY_ATTEMPT_PREFIX
  );
  await AuthAttempt.createInstance(attempt.ip, attempt.mobileEmail);
};

const otpAttemptMiddleware = {
  send: async function (req, res, next) {
    try {
      const attempt = await rejectOtpAbuse(
        req,
        req.body.mobile_email,
        OTP_SEND_ATTEMPT_PREFIX
      );
      await AuthAttempt.createInstance(attempt.ip, attempt.mobileEmail);
      next();
    } catch (err) {
      next(err);
    }
  },
  verify: async function (req, res, next) {
    try {
      await rejectOtpAbuse(
        req,
        req.decoded.mobile_email,
        OTP_VERIFY_ATTEMPT_PREFIX
      );
      next();
    } catch (err) {
      next(err);
    }
  },
};

const sendOtpHandler = async function (req, res, next) {
  try {
    const exposeOtpForLocalTesting =
      process.env.EXPOSE_OTP_FOR_LOCAL_TESTING === "true";
    if (
      exposeOtpForLocalTesting &&
      !["development", "test"].includes(process.env.NODE_ENV)
    ) {
      throw Boom.forbidden("OTP exposure is only allowed for local testing.");
    }
    const pin = generatePassword(4, false, /\d/);
    let keyHash = generateHash(pin);
    let exists = await Otp.findOne({
      where: {
        mobileEmail: req.body.mobile_email,
      },
    });
    if (exists) {
      const configuredCreatedAt = configStore.get("/modelOptions").createdAt;
      const createdAtKey =
        typeof configuredCreatedAt === "string" ? configuredCreatedAt : "createdAt";
      const createdAt = exists[createdAtKey]
        ? new Date(exists[createdAtKey]).getTime()
        : null;
      if (!createdAt || createdAt > Date.now() - OTP_VALIDITY_PERIOD_MS) {
        throw Boom.tooManyRequests("An OTP is already active. Try again later.");
      }
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
        tokenType: TOKEN_TYPES.OTP_CHALLENGE,
        mobile_email: req.body.mobile_email,
        id: otpData[configStore.get("/dbPrimaryKey").name],
      },
      configStore.get("/jwt").secret,
      {
        algorithm: configStore.get("/jwt").algo,
        expiresIn: EXPIRATION_PERIOD.SHORT,
      }
    );
    const data = { token };
    if (exposeOtpForLocalTesting) data.sms = sms;

    sendResponse({
      data,
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
  middlewares: [publicAuthRateLimitMiddleware, otpAttemptMiddleware.send],
  handler: sendOtpHandler,
  log: `Generating Send OTP endpoint for user.`,
});

const verifyOtpMiddleware = {
  decoded: async function (req, res, next) {
    try {
      const decode = await verifyToken(req.body.token);
      if (decode.tokenType !== TOKEN_TYPES.OTP_CHALLENGE) {
        throw Boom.badRequest("Invalid token");
      }
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
      await recordFailedOtpAttempt(req);
      throw Boom.unauthorized("Invalid token or otp.");
    }
    await deleteHandler(Otp, {
      params: { id: req.hash[configStore.get("/dbPrimaryKey").name] },
      body: { hardDelete: true },
    });
    const token = Jwt.sign(
      {
        tokenType: TOKEN_TYPES.OTP_VERIFIED,
        mobile_email: req.decoded.mobile_email,
        otpVerified: true,
      },
      configStore.get("/jwt").secret,
      {
        algorithm: configStore.get("/jwt").algo,
        expiresIn: EXPIRATION_PERIOD.MEDIUM,
      }
    );
    sendResponse({
      data: { mobile_email: req.decoded.mobile_email, token },
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
  middlewares: [
    publicAuthRateLimitMiddleware,
    ...Object.values(verifyOtpMiddleware),
    otpAttemptMiddleware.verify,
  ],
  handler: verifyOtpHandler,
  afterMiddlewares: [logApiMiddleware({ payloadFilter: [] })],
  log: "Generating Verify OTP endpoint.",
});

const forgotPasswordMiddleware = {
  ...verifyOtpMiddleware,
  throttle: otpAttemptMiddleware.verify,
  verifyOtp: async function (req, res, next) {
    try {
      const key = req.body.otp;
      let keyMatch = await Bcrypt.compare(key, req.hash.otpHash);
      if (!keyMatch) {
        await recordFailedOtpAttempt(req);
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

      req.user = await User.findOne(conditions);
      next();
    } catch (err) {
      next(err);
    }
  },
};

const forgotPasswordHandler = async function (req, res, next) {
  try {
    const keyHash = generateHash();

    const update = {
      resetPasswordHash: keyHash.hash,
    };
    if (req.user) {
      await updateHandler(User, {
        params: { id: req.user[configStore.get("/dbPrimaryKey").name] },
        body: update,
      });
    }
    const token = Jwt.sign(
      {
        tokenType: TOKEN_TYPES.PASSWORD_RESET,
        mobile_email: req.decoded.mobile_email,
        key: keyHash.key,
      },
      configStore.get("/jwt").secret,
      {
        algorithm: configStore.get("/jwt").algo,
        expiresIn: EXPIRATION_PERIOD.SHORT,
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
  middlewares: [publicAuthRateLimitMiddleware, ...Object.values(forgotPasswordMiddleware)],
  handler: forgotPasswordHandler,
  afterMiddlewares: [logApiMiddleware({ payloadFilter: [] })],
  log: "Generating Forgot Password endpoint.",
});

const resetPasswordMiddleware = {
  decoded: async function (req, res, next) {
    try {
      const decode = await verifyToken(req.body.token);
      if (decode.tokenType !== TOKEN_TYPES.PASSWORD_RESET) {
        throw Boom.badRequest("Invalid token");
      }
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
        sendResponse({
          data: err.output.payload,
          status: err.output.payload.statusCode,
          res
        });
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
      body: {
        password: passwordHash.hash,
        resetPasswordHash: null,
        passwordUpdateRequired: false,
      },
    });
    sendResponse({
      status: 204,
      res,
      next,
    });
  } catch (err) {
    next(Boom.unauthorized("Invalid mobile or key."));
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
      password: Joi.string().max(PASSWORD_MAX_LENGTH).required().messages({
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
  middlewares: [publicAuthRateLimitMiddleware, ...Object.values(resetPasswordMiddleware)],
  handler: resetPasswordHandler,
  afterMiddlewares: [
    logApiMiddleware({
      payloadFilter: [],
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
      req.session = await Session.createInstance(req.user);
      next();
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
        tokenType: TOKEN_TYPES.ACCESS,
        sessionId: req.session[configStore.get("/dbPrimaryKey").name],
        sessionKey: req.session.key,
      };
      req.standardToken = generateToken(userData, EXPIRATION_PERIOD.SHORT);
      next();
    } catch (err) {
      next(err);
    }
  },
  sessionRefreshToken: async function (req, res, next) {
    try {
      const sessionData = {
        tokenType: TOKEN_TYPES.REFRESH,
        sessionId: req.session[configStore.get("/dbPrimaryKey").name],
        sessionKey: req.session.key,
      };
      req.refreshToken = generateToken(sessionData, EXPIRATION_PERIOD.LONG);
      next();
    } catch (err) {
      next(err);
    }
  },
};

const loginHandler = async function (req, res, next) {
  const user = req.user.toJSON();
  delete user.password;
  delete user.resetPasswordHash;

  sendResponse({
    data: {
      user,
      refreshToken: req.refreshToken,
      accessToken: req.standardToken,
      scope: req.scope,
    },
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
      password: Joi.string().max(PASSWORD_MAX_LENGTH).required().messages({
        "any.required": "Password is required",
        "string.empty": "Password can't be empty",
      }),
    }),
  },
  middlewares: [publicAuthRateLimitMiddleware, ...Object.values(loginMiddleware)],
  handler: loginHandler,
  afterMiddlewares: [
    logApiMiddleware({ action: "login", payloadFilter: ["mobile_email"] }),
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
  authMiddleware: refreshStrategy,
  handler: logoutHandler,
  log: "Generating logout endpoint.",
});
