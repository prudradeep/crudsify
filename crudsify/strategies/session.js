"use strict";

const Boom = require("@hapi/boom");
const configStore = require("crudsify/config");
const { EXPIRATION_PERIOD, TOKEN_TYPES } = require("crudsify/config/constants");
const { Logger } = require("crudsify/helpers/logger");
const { generateToken, ucfirst, verifyToken } = require("crudsify/utils");

const getUserSession = async (sessionId, sessionKey) => {
  const {
    user: User,
    session: Session,
    role,
    permission: Permission,
  } = require("crudsify/models");
  const session = await Session.findByCredentials(sessionId, sessionKey);
  if (!session) return {};

  const user = await User.unscoped().findByPk(
    session[`user${ucfirst(configStore.get("/dbPrimaryKey").name)}`],
    { include: { model: role } }
  );
  const deletedAt = configStore.get("/modelOptions").deletedAt || "deletedAt";
  if (
    !user ||
    !user.isActive ||
    user[deletedAt] ||
    user.password !== session.passwordHash
  ) {
    return {};
  }

  return { user, session, scope: await Permission.getScope(user) };
};

exports.sessionStrategy = async function (req, res, next) {
  try {
    const decoded = await verifyToken(
      req.headers.authorization.replace("Bearer ", "")
    );
    if (
      decoded.tokenType !== TOKEN_TYPES.ACCESS ||
      !decoded.sessionId ||
      !decoded.sessionKey
    ) {
      throw Boom.unauthorized("Authentication failed");
    }
    const { user, session, scope } = await getUserSession(
      decoded.sessionId,
      decoded.sessionKey
    );
    if (!session || !user) throw Boom.unauthorized("Authentication failed");
    if (user.passwordUpdateRequired && req.path !== "/user/my/password") {
      throw Boom.forbidden("Password update required");
    }

    if (res) {
      res.set(
        "X-Access-Token",
        generateToken(
          {
            tokenType: TOKEN_TYPES.ACCESS,
            sessionId: session[configStore.get("/dbPrimaryKey").name],
            sessionKey: session.key,
          },
          EXPIRATION_PERIOD.SHORT
        )
      );
    }
    req.auth = {
      isValid: true,
      credentials: { user, session, scope },
    };
    next();
  } catch (err) {
    Logger.error(err);
    next(Boom.unauthorized("Authentication failed"));
  }
};
