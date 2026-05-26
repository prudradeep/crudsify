"use strict";

const Boom = require("@hapi/boom");
const configStore = require("crudsify/config");
const { EXPIRATION_PERIOD, TOKEN_TYPES } = require("crudsify/config/constants");
const { Logger } = require("crudsify/helpers/logger");
const { generateToken, ucfirst, verifyToken } = require("crudsify/utils");

const getUserSession = async (sessionId, sessionKey) => {
  try {
    const {
      user: User,
      session: Session,
      role,
      permission: Permission,
    } = require("crudsify/models");
    const session = await Session.findByCredentials(sessionId, sessionKey);
    if (!session) {
      return { user: null, session };
    }
    const user = await User.unscoped().findByPk(
      session[`user${ucfirst(configStore.get("/dbPrimaryKey").name)}`],
      { include: { model: role } }
    );
    const scope = user ? await Permission.getScope(user) : null;
    return { user, session, scope };
  } catch (err) {
    throw err;
  }
}

exports.sessionStrategy = async function (req, res, next) {
  try {
    const decoded = await verifyToken(
      req.headers.authorization.replace("Bearer ", "")
    );
    if (decoded.tokenType !== TOKEN_TYPES.REFRESH) {
      throw Boom.unauthorized("Authentication failed");
    }
    const { sessionId, sessionKey } = decoded;
    const { user, session, scope } = await getUserSession(sessionId, sessionKey);
    if (!session || !user || user.password !== session.passwordHash) {
      throw Boom.unauthorized("Authentication failed");
    }
    if (res) {
      const data = {
        tokenType: TOKEN_TYPES.REFRESH,
        sessionId: session[configStore.get("/dbPrimaryKey").name],
        sessionKey: session.key,
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
    Logger.error(err);
    next(Boom.unauthorized("Authentication failed"))
  }
};
