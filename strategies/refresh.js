"use strict";

const Boom = require("@hapi/boom");
const Jwt = require("jsonwebtoken");
const configStore = require("../config");
const { EXPIRATION_PERIOD } = require("../config/constants");
const { Logger } = require("../helpers/logger");
const { generateToken, ucfirst } = require("../utils");

const getUserSession = async (sessionId, sessionKey) => {
  try {
    const { user: User, session: Session, role } = require("../models");
    const session = await Session.findByCredentials(sessionId, sessionKey);
    if (!session) {
      return { user: null, session };
    }
    const user = await User.unscoped().findByPk(
      session[`user${ucfirst(configStore.get("/dbPrimaryKey").name)}`],
      { include: { model: role } }
    );
    return { user, session };
  } catch (err) {
    throw err;
  }
}

exports.refreshStrategy = async function (req, res, next) {
  try {
    if(!configStore.get("/enableCrudsifyModelsApis")){
      throw Boom.badImplementation("To use this strategy you should enable 'enableCrudsifyModelsApis' in config.");
    }
    const decoded = await Jwt.verify(
      req.headers.authorization.replace("Bearer ", ""),
      configStore.get("/jwt").secret
    );
    const { sessionId, sessionKey, passwordHash, scope } = decoded;
    // if the token is expired, respond with token type so the client can switch to refresh token if necessary
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      if (decoded.user) {
        throw Boom.unauthorized("Expired Access Token", "Token", null);
      } else {
        throw Boom.unauthorized("Expired Refresh Token", "Token", null);
      }
    }

    // If the token does not contain session info, then simply authenticate and continue
    if (decoded.user) {
      req.auth = {
        isValid: true,
        credentials: { user: decoded.user, scope: decoded.scope },
      };
      return next();
    }
    // If the token does contain session info (i.e. a refresh token), then use the session to
    // authenticate and respond with a fresh set of tokens in the header
    else if (sessionId) {
      const { user, session } = await getUserSession(sessionId, sessionKey);
      if (!session || !user || user.password !== passwordHash) {
        throw Boom.unauthorized("Authentication failed");
      }
      if (res) {
        const userData = {
          user: {
            name: user.name,
            mobile: user.mobile,
            role: {
              name: user.role.name,
              rank: user.role.rank,
            },
            [configStore.get("/dbPrimaryKey").name]:
              user[configStore.get("/dbPrimaryKey").name],
          },
          scope: scope,
        };
        res.set(
          "X-Access-Token",
          generateToken(userData, EXPIRATION_PERIOD.SHORT)
        );
        const sessionData = {
          sessionId: session[configStore.get("/dbPrimaryKey").name],
          sessionKey: session.key,
          passwordHash: session.passwordHash,
          scope: decoded.scope,
        };
        res.set(
          "X-Refresh-Token",
          generateToken(sessionData, EXPIRATION_PERIOD.LONG)
        );
      }
      req.auth = {
        isValid: true,
        credentials: {
          user,
          session,
          scope: decoded.scope,
        },
      };
      return next();
    }
  } catch (err) {
    Logger.error(err);
    next(err);
  }
};
