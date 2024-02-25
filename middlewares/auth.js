"use strict";

const Boom = require("@hapi/boom");
const Jwt = require("jsonwebtoken");
const configStore = require("../config");
const { tokenStrategy } = require("../strategies/token");
const { sessionStrategy } = require("../strategies/session");
const { refreshStrategy } = require("../strategies/refresh");

exports.basicAuthMiddleware = (req, res, next) => {
  const authheader = req.headers.authorization;
  if (authheader) {
    const auth = new Buffer.from(authheader.split(" ")[1], "base64")
      .toString()
      .split(":");

    if (
      auth[0] == configStore.get("/basicAuth").username &&
      auth[1] == configStore.get("/basicAuth").password
    )
      return next();
  }
  res.setHeader("WWW-Authenticate", 'Basic realm="401"');
  res.status(401).end("You are not authenticated!");
};

exports.authMiddleware = async (req, res, next) => {
  let validate = {};
  try {
    const decoded = await Jwt.verify(
      req.headers.authorization.replace("Bearer ", ""),
      configStore.get("/jwt").secret
    );
    const authStrategy = configStore.get("/authStrategy");
    const AUTH_STRATEGIES = configStore.get("/constants/AUTH_STRATEGIES");
    switch (authStrategy) {
      case AUTH_STRATEGIES.TOKEN:
        validate = await tokenStrategy(decoded);
        break;
      case AUTH_STRATEGIES.SESSION:
        validate = await sessionStrategy(decoded, res);
        break;
      case AUTH_STRATEGIES.REFRESH:
        validate = await refreshStrategy(decoded, res);
        break;
      default:
        break;
    }
    if (validate.isValid) {
      req.auth = validate;
      next();
    } else {
      next(Boom.unauthorized("Authentication failed"));
    }
  } catch (err) {
    next(Boom.unauthorized("Authentication failed"));
  }
};
