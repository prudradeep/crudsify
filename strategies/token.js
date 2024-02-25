"use strict";

const { Boom } = require("@hapi/boom");

exports.tokenStrategy = async function (decoded) {
  try {
    const { user, scope } = decoded;
    return {
      isValid: true,
      credentials: { user, scope },
    };
  } catch (err) {
    next(Boom.badRequest("Invalid token"));
  }
};
