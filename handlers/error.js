"use strict";

const Boom = require("@hapi/boom");

exports.handleError = (err, message, boomFunction) => {
  message = message || "There was an error processing the request.";
  boomFunction = boomFunction || Boom.badImplementation;
  if (!err.isBoom) {
    throw boomFunction(err);
  } else {
    throw err;
  }
};
