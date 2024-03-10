"use strict";

const configStore = require("../config");
const { generateToken, getUserSession } = require("../utils");

exports.sessionStrategy = async function (decoded, res, next) {
  try {
    const { sessionId, sessionKey, passwordHash, scope } = decoded;
    const {user, session } = await getUserSession(sessionId, sessionKey);
    if (!session || !user || user.password !== passwordHash) {
      return { isValid: false };
    }
    if (res) {
      const data = {
        sessionId: session[configStore.get("/dbPrimaryKey").name],
        sessionKey: session.key,
        passwordHash: session.passwordHash,
        scope: scope,
      };
      res.set(
        "X-Access-Token",
        generateToken(
          data,
          configStore.get("/constants/EXPIRATION_PERIOD").LONG
        )
      );
    }
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
};
