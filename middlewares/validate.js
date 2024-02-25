"use strict";

const { Boom } = require("@hapi/boom");
const { getFieldsType } = require("../helpers/query");
const { headersValidation } = require("../helpers/joi");

exports.headerValidationMiddleware = function (req, res, next) {
  try {
    const { error, value } = headersValidation.validate(req.headers);
    if (error) throw Boom.badRequest(error.message);
    else {
      next();
    }
  } catch (err) {
    next(err);
  }
};

exports.validationMiddleware = (joiObject, validate) => {
  return (req, res, next) => {
    if (!joiObject) {
      return next();
    }
    try {
      let validate_ = false;
      switch (validate) {
        case "query":
          validate_ = req.query;
          break;
        case "params":
        case "param":
          validate_ = req.params;
          break;
        case "body":
          validate_ = req.body;
          break;
      }
      const { error, value } = joiObject.validate(validate_, {
        abortEarly: false,
      });
      if (error) {
        error.details.forEach((obj) => {
          delete obj.context;
        });
        const err = Boom.badRequest(error.message);
        err.output.payload.details = error.details;
        res.status(err.output.payload.statusCode).send(err.output.payload);
      } else {
        next();
      }
    } catch (err) {
      next(err);
    }
  };
};

exports.jsonFieldQuery = (model) => {
  return async function (req, res, next) {
    const fields = getFieldsType(model);
    Object.keys(req.query).forEach((val) => {
      if (val.indexOf("$") === -1) {
        if (fields[val] === "JSON") {
          req.query[val] =
            req.query[val].indexOf(",") >= 0
              ? req.query[val].split(",")
              : [req.query[val]];
        }
      }
    });
    next();
  };
};
