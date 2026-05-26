"use strict";

const Boom = require("@hapi/boom");
const { TOKEN_TYPES } = require("crudsify/config/constants");
const { verifyToken } = require("crudsify/utils");
const {
  getAuthenticatedSession,
  passwordUpdateRequired,
} = require("./authenticated-session");

exports.tokenStrategy = async function (req, res, next) {
  try {
    const decoded = await verifyToken(
      req.headers.authorization.replace("Bearer ", "")
    );
    if (
      decoded.tokenType !== TOKEN_TYPES.ACCESS ||
      !decoded.sessionId ||
      !decoded.sessionKey
    ) {
      throw Boom.unauthorized("Invalid token");
    }
    const { user, session, scope } = await getAuthenticatedSession(
      decoded.sessionId,
      decoded.sessionKey
    );
    if (!session || !user) throw Boom.unauthorized("Authentication failed");
    if (passwordUpdateRequired(user, req.path)) {
      throw Boom.forbidden("Password update required");
    }

    req.auth = {
      isValid: true,
      credentials: { user, session, scope },
    };
    next();
  } catch (err) {
    if (Boom.isBoom(err) && err.output.statusCode === 403) {
      return next(err);
    }
    next(Boom.unauthorized("Authentication failed"));
  }
};
