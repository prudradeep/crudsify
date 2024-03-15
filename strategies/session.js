"use strict";

const Boom = require("@hapi/boom");
const Jwt = require("jsonwebtoken");
const configStore = require("../config");
const { EXPIRATION_PERIOD } = require("../config/constants");
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

exports.sessionStrategy = async function (req, res, next) {
  try {
    if(!configStore.get("/enableCrudsifyModelsApis")){
      throw Boom.badImplementation("To use this strategy you should enable 'enableCrudsifyModelsApis' in config.");
    }
    const decoded = await Jwt.verify(
      req.headers.authorization.replace("Bearer ", ""),
      configStore.get("/jwt").secret
    );
    const { sessionId, sessionKey, passwordHash, scope } = decoded;
    const { user, session } = await getUserSession(sessionId, sessionKey);
    if (!session || !user || user.password !== passwordHash) {
      throw Boom.unauthorized("Authentication failed");
    }
    if (res) {
      const data = {
        sessionId: session[configStore.get("/dbPrimaryKey").name],
        sessionKey: session.key,
        passwordHash: session.passwordHash,
        scope: scope,
      };
      res.set("X-Access-Token", generateToken(data, EXPIRATION_PERIOD.LONG));
    }
    req.auth = {
      isValid: true,
      credentials: {
        user,
        session,
        scope,
      },
    };
    next();
  } catch (err) {
    next(err);
  }
};
