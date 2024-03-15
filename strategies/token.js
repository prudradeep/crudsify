"use strict";

const Boom = require("@hapi/boom");
const Jwt = require("jsonwebtoken");

exports.tokenStrategy = async function (req, res, next) {
  try {
    const decoded = await Jwt.verify(
      req.headers.authorization.replace("Bearer ", ""),
      configStore.get("/jwt").secret
    );
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
