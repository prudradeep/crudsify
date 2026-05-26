"use strict";

const Boom = require("@hapi/boom");
const { TOKEN_TYPES } = require("crudsify/config/constants");
const { verifyToken } = require("crudsify/utils");

exports.tokenStrategy = async function (req, res, next) {
  try {
    const decoded = await verifyToken(
      req.headers.authorization.replace("Bearer ", "")
    );
    if (decoded.tokenType !== TOKEN_TYPES.ACCESS || !decoded.user) {
      throw Boom.unauthorized("Invalid token");
    }
    const { user, scope } = decoded;
    req.auth = {
      isValid: true,
      credentials: { user, scope },
    };
    next();
  } catch (err) {
    next(Boom.badRequest("Invalid token"));
  }
};
