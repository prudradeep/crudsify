"use strict";

const Boom = require("@hapi/boom");
const { EXPIRATION_PERIOD, TOKEN_TYPES } = require("crudsify/config/constants");
const { Logger } = require("crudsify/helpers/logger");
const { generateToken, verifyToken } = require("crudsify/utils");
const {
  getAuthenticatedSession,
  getSessionTokenData,
} = require("./authenticated-session");

exports.refreshStrategy = async function (req, res, next) {
  try {
    const decoded = await verifyToken(
      req.headers.authorization.replace("Bearer ", "")
    );
    if (
      decoded.tokenType !== TOKEN_TYPES.REFRESH ||
      !decoded.sessionId ||
      !decoded.sessionKey
    ) {
      throw Boom.unauthorized("Refresh token required");
    }

    const { user, session, scope } = await getAuthenticatedSession(
      decoded.sessionId,
      decoded.sessionKey
    );
    if (!session || !user) throw Boom.unauthorized("Authentication failed");

    if (res) {
      const sessionData = getSessionTokenData(session);
      res.set(
        "X-Access-Token",
        generateToken(
          { tokenType: TOKEN_TYPES.ACCESS, ...sessionData },
          EXPIRATION_PERIOD.SHORT
        )
      );
      res.set(
        "X-Refresh-Token",
        generateToken(
          { tokenType: TOKEN_TYPES.REFRESH, ...sessionData },
          EXPIRATION_PERIOD.LONG
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
