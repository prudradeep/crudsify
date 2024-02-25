"use strict";

exports.sessionStrategy = async function (decoded, res) {
  /* const { sessionId, sessionKey, passwordHash, scope } = decoded;
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
  } */
};
