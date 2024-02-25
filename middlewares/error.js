"use strict";

const Boom = require("@hapi/boom");
const { Logger } = require("../helpers/logger");
const isSequelizeError = (err) => {
  if (err.name && err.name.indexOf("Sequelize") >= 0) return true;
  return false;
};
const sendResponse = (err, res) => {
  return res.status(err.output.statusCode).send(err.output.payload);
};

const errorResponder = (err, req, res, next) => {
  if (err.isBoom) {
    return sendResponse(err, res);
  } else if (isSequelizeError(err)) {
    let message = "";
    switch (err.name) {
      case "SequelizeValidationError":
        message = err.errors.map((val) => val.message);
        return sendResponse(Boom.preconditionRequired(message), res);
      case "SequelizeUniqueConstraintError":
        message = err.errors.map((val) => `${val.path}: '${val.value}'`);
        return sendResponse(
          Boom.conflict(`${message} | ${req.model.name} already exists!`),
          res
        );
      case "SequelizeForeignKeyConstraintError":
        return sendResponse(
          Boom.badData(`Foreign key constraints failed!`),
          res
        );
      case "SequelizeDatabaseError":
        res.status(419).send({
          statusCode: 419,
          error: "query error",
          message: err.message,
        });
        return;
      default:
        return sendResponse(Boom.badData(err.message), res);
    }
  } else if (err.name === "AggregateError") {
    let message = "";
    message = err.errors.reduce((acc, val) => {
      if (isSequelizeError(val)) {
        val.errors.errors.map((val_) => acc.push(val_.message));
      }
      return acc;
    }, []);
    message = [...new Set(message)];
    return sendResponse(Boom.preconditionRequired(message), res);
  } else if (err instanceof Error) {
    Logger.error(err);
    return sendResponse(Boom.boomify(err, { statusCode: 400 }), res);
  } else {
    Logger.error(err);
    return sendResponse(Boom.badImplementation(err.message), res);
  }
};

const handleNotFoundError = (req, res, next) => {
  Logger.error(`${req.path} URL not found error!`);
  return sendResponse(Boom.notFound("URL not found"), res);
};

module.exports = { errorResponder, handleNotFoundError };
