"use strict";

const configStore = require("../config");
const { Logger } = require("../helpers/logger");
const { getUserSession, generateToken } = require("../utils");

exports.refreshStrategy = async function (decoded, res) {
  try {
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
      return {
        isValid: true,
        credentials: { user: decoded.user, scope: decoded.scope },
      };
    }
    // If the token does contain session info (i.e. a refresh token), then use the session to
    // authenticate and respond with a fresh set of tokens in the header
    else if (sessionId) {
      const { user, session } = await getUserSession(sessionId, sessionKey);
      if (!session || !user || user.password !== passwordHash) {
        return { isValid: false };
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
            [configStore.get("/dbPrimaryKey").name]: user[configStore.get("/dbPrimaryKey").name],
          },
          scope: scope,
        };
        res.set(
          "X-Access-Token",
          generateToken(
            userData,
            configStore.get("/constants/EXPIRATION_PERIOD").SHORT
          )
        );
        const sessionData = {
          sessionId: session[configStore.get("/dbPrimaryKey").name],
          sessionKey: session.key,
          passwordHash: session.passwordHash,
          scope: decoded.scope,
        };
        res.set(
          "X-Refresh-Token",
          generateToken(
            sessionData,
            configStore.get("/constants/EXPIRATION_PERIOD").LONG
          )
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
    Logger.error(err)
    next(err);
  }
};
