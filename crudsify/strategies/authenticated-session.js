"use strict";

const configStore = require("crudsify/config");
const { ucfirst } = require("crudsify/utils");

const primaryKey = () => configStore.get("/dbPrimaryKey").name;

exports.getAuthenticatedSession = async (sessionId, sessionKey) => {
  const {
    user: User,
    session: Session,
    role,
    permission: Permission,
  } = require("crudsify/models");
  const session = await Session.findByCredentials(sessionId, sessionKey);
  if (!session) return {};

  const user = await User.unscoped().findByPk(
    session[`user${ucfirst(primaryKey())}`],
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

exports.getSessionTokenData = (session) => ({
  sessionId: session[primaryKey()],
  sessionKey: session.key,
});

exports.passwordUpdateRequired = (user, path) =>
  user.passwordUpdateRequired && path !== "/user/my/password";
