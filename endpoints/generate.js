"use strict";

const express = require("express");
const Endpoints = express.Router();
const _ = require("lodash");
const Jwt = require("jsonwebtoken");
const { Logger } = require("../helpers/logger");
const configStore = require("../config");
const {
  validationMiddleware,
  jsonFieldQuery,
  headerValidationMiddleware,
} = require("../middlewares/validate");
const { getScopeMiddleware } = require("../middlewares/scope");
const { swaggerHelper } = require("../helpers/swagger");
const {
  saveLogMiddleware,
  logApiMiddleware,
} = require("../middlewares/audit-log");

let authMiddleware = async (req, res, next) => {
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
};

const setAuthMiddleware = (middleware) => {
  authMiddleware = middleware;
};

const generateEndpoint = ({
  method,
  path,
  auth,
  swaggerPath,
  summary,
  tags,
  validate,
  scope,
  isJsonFields,
  model,
  middlewares,
  handler,
  afterMiddlewares,
  log,
}) => {
  if (configStore.get("/logRoutes")) Logger.info(log);

  middlewares = middlewares ? middlewares : [];
  validate = validate ? validate : {};

  if (validate) {
    Object.keys(validate).forEach((val) => {
      if (val !== "form") {
        middlewares.unshift(validationMiddleware(validate[val], val));
      }
    });
  }

  if (isJsonFields) {
    if (model) middlewares.unshift(jsonFieldQuery(model));
    else Logger.error("Model is not defined");
  }

  if (auth) {
    if (scope) {
      if (!_.isArray(scope)) scope = [scope];
      if (!_.isEmpty(scope)) middlewares.unshift(getScopeMiddleware(scope));
    }
    middlewares = [headerValidationMiddleware, authMiddleware, ...middlewares];
  }

  afterMiddlewares = afterMiddlewares
    ? [...afterMiddlewares, saveLogMiddleware]
    : [logApiMiddleware(), saveLogMiddleware];

  method = method.toLowerCase();

  Endpoints[method](path, middlewares, handler, afterMiddlewares);

  if (configStore.get("/enableSwagger")) {
    path = swaggerPath ? swaggerPath : path;
    path = path.replace(/(:[a-zA-Z]+)/gm, `{$1}`).replace(/:/g, "");
    method = method === "use" ? "get" : method;
    swaggerHelper({ method, path, summary, tags, validate, auth });
  }
};

module.exports = { generateEndpoint, Endpoints, setAuthMiddleware };
