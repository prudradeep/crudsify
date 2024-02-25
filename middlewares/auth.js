"use strict";

const Boom = require("@hapi/boom");
const Jwt = require("jsonwebtoken");
const configStore = require("../config");

exports.basicAuthMiddleware = (req, res, next) => {
  const authheader = req.headers.authorization;
  if (authheader) {
    const auth = new Buffer.from(authheader.split(" ")[1], "base64")
      .toString()
      .split(":");

    if (
      auth[0] == configStore.get("/basicAuth").username &&
      auth[1] == configStore.get("/basicAuth").password
    )
      return next();
  }
  res.setHeader("WWW-Authenticate", 'Basic realm="401"');
  res.status(401).end("You are not authenticated!");
};

const applyTokenStrategy = async function (decoded) {
  try {
    const { user, scope } = decoded;
    return {
      isValid: true,
      credentials: { user, scope },
    };
  } catch (err) {
    next(Boom.badRequest("Invalid token"));
  }
};

/* const applySessionStrategy = async function (decoded, res) {
  const { sessionId, sessionKey, passwordHash, scope } = decoded;
  const { user: User, session: Session, role } = require("../models");
  let session = {};
  try {
    session = await Session.findByCredentials(sessionId, sessionKey);
    if (!session) {
      return { isValid: false };
    }
    let user = await User.unscoped().findByPk(
      session[`user${ucfirst(Config.get("/dbPrimaryKey"))}`],
      { include: { model: role } }
    );
    if (!user) {
      return { isValid: false };
    }
    if (user.password !== passwordHash) {
      return { isValid: false };
    }
    if (res)
      res.set(
        "X-Access-Token",
        Token(null, session, scope, EXPIRATION_PERIOD.LONG)
      );
    return {
      isValid: true,
      credentials: {
        user,
        session,
        scope,
      },
    };
  } catch (err) {
    next(err);
  }
}; */

/* const applyRefreshStrategy = async function (decoded, res) {
  try {
    // if the token is expired, respond with token type so the client can switch to refresh token if necessary
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      if (decoded.user) {
        throw Boom.unauthorized("Expired Access Token", "Token", null);
      } else {
        throw Boom.unauthorized("Expired Refresh Token", "Token", null);
      }
    }

    let user = {};
    let session = {};

    // If the token does not contain session info, then simply authenticate and continue
    if (decoded.user) {
      user = decoded.user;

      return {
        isValid: true,
        credentials: { user, scope: decoded.scope },
      };
    }
    // If the token does contain session info (i.e. a refresh token), then use the session to
    // authenticate and respond with a fresh set of tokens in the header
    else if (decoded.sessionId) {
      const { user: User, session: Session, role } = require("../models");

      session = await Session.findByCredentials(
        decoded.sessionId,
        decoded.sessionKey
      );
      if (!session) {
        return { isValid: false };
      }

      let user = await User.unscoped().findByPk(
        session[`user${ucfirst(Config.get("/dbPrimaryKey"))}`],
        { include: { model: role } }
      );

      if (!user) {
        return { isValid: false };
      }

      if (user.password !== decoded.passwordHash) {
        return { isValid: false };
      }
      if (res) {
        res.set(
          "X-Access-Token",
          Token(user, null, decoded.scope, EXPIRATION_PERIOD.SHORT)
        );
        res.set(
          "X-Refresh-Token",
          Token(null, session, decoded.scope, EXPIRATION_PERIOD.LONG)
        );
      }
      return {
        isValid: true,
        credentials: {
          user,
          session,
          scope: decoded.scope,
        },
      };
    }
  } catch (err) {
    next(err);
  }
}; */

exports.authMiddleware = async (req, res, next) => {
  let validate = {};
  try {
    const decoded = await Jwt.verify(
      req.headers.authorization.replace("Bearer ", ""),
      configStore.get("/jwt").secret
    );
    const authStrategy = configStore.get("/authStrategy");
    const AUTH_STRATEGIES = configStore.get("/constants/AUTH_STRATEGIES");
    switch (authStrategy) {
      case AUTH_STRATEGIES.TOKEN:
        validate = await applyTokenStrategy(decoded);
        break;
     /*  case AUTH_STRATEGIES.SESSION:
        validate = await applySessionStrategy(decoded, res);
        break;
      case AUTH_STRATEGIES.REFRESH:
        validate = await applyRefreshStrategy(decoded, res);
        break; */
      default:
        break;
    }
    if (validate.isValid) {
      req.auth = validate;
      next();
    } else {
      next(Boom.unauthorized("Authentication failed"));
    }
  } catch (err) {
    next(Boom.unauthorized("Authentication failed"));
  }
};
