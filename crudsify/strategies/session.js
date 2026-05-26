"use strict";

const Boom = require("@hapi/boom");
const { EXPIRATION_PERIOD, TOKEN_TYPES } = require("crudsify/config/constants");
const { Logger } = require("crudsify/helpers/logger");
const { generateToken, verifyToken } = require("crudsify/utils");
const {
  getAuthenticatedSession,
  getSessionTokenData,
  passwordUpdateRequired,
} = require("./authenticated-session");

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
    const { user, session, scope } = await getAuthenticatedSession(
      decoded.sessionId,
      decoded.sessionKey
    );
    if (!session || !user) throw Boom.unauthorized("Authentication failed");
    if (passwordUpdateRequired(user, req.path)) {
      throw Boom.forbidden("Password update required");
    }

    if (res) {
      res.set(
        "X-Access-Token",
        generateToken(
          {
            tokenType: TOKEN_TYPES.ACCESS,
            ...getSessionTokenData(session),
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
    if (Boom.isBoom(err) && err.output.statusCode === 403) {
      return next(err);
    }
    next(Boom.unauthorized("Authentication failed"));
  }
};
