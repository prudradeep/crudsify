"use strict";

const Boom = require("@hapi/boom");
const Jwt = require("jsonwebtoken");
const configStore = require("crudsify/config");
const { EXPIRATION_PERIOD } = require("crudsify/config/constants");
const { generateToken, ucfirst } = require("crudsify/utils");

const getUserSession = async (sessionId, sessionKey) => {
  try {
    const { user: User, session: Session, role } = require("crudsify/models");
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
