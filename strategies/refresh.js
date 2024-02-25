"use strict";

exports.refreshStrategy = async function (decoded, res) {
  try {
    /* // if the token is expired, respond with token type so the client can switch to refresh token if necessary
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
    } */
  } catch (err) {
    next(err);
  }
};
