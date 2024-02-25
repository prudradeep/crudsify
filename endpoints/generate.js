"use strict";

const express = require('express')
const Endpoints = express.Router()
const configStore = require("../config");
const { validationMiddleware, jsonFieldQuery, headerValidationMiddleware } = require('../middlewares/validate');
const { getScopeMiddleware } = require('../middlewares/scope');
const { authMiddleware } = require('../middlewares/auth');
const { createdByMiddleware, updatedByMiddleware, deletedByMiddleware } = require('../middlewares/add-meta-data');
const { swaggerHelper } = require('../helpers/swagger');
const { saveLogMiddleware, logApiMiddleware } = require('../middlewares/audit-log');

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
  if (configStore.get("/logRoutes")) Log.info(log);

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
    else Log.error("Model is not defined");
  }

  if (scope) {
    if (!_.isArray(scope)) scope = [scope];
    if (!_.isEmpty(scope)) middlewares.unshift(getScopeMiddleware(scope));
  }

  if (auth)
    middlewares = [headerValidationMiddleware, authMiddleware, ...middlewares];

  afterMiddlewares = afterMiddlewares
    ? [...afterMiddlewares, saveLogMiddleware]
    : [logApiMiddleware(), saveLogMiddleware];
    

  method = method.toLowerCase();
  if (auth) {
    switch (method) {
      case "put":
        if (configStore.get("/enableUpdatedBy")) middlewares.push(updatedByMiddleware);
        break;
      case "delete":
        if (configStore.get("/enableDeletedBy")) middlewares.push(deletedByMiddleware);
        break;
      case "post":
        if (configStore.get("/enableCreatedBy")) middlewares.push(createdByMiddleware);
        break;
    }
  }

  Endpoints[method](path, middlewares, handler, afterMiddlewares);

  if (configStore.get("/enableSwagger")) {
    path = swaggerPath ? swaggerPath : path;
    path = path.replace(/(:[a-zA-Z]+)/gm, `{$1}`).replace(/:/g, "");
    method = method === "use" ? "get" : method;
    swaggerHelper({ method, path, summary, tags, validate, auth });
  }
};

module.exports = { generateEndpoint, Endpoints }
