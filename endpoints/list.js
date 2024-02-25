"use strict";

const _ = require("lodash");
const Joi = require("joi");
const { getPathName, getScopes, getModelName } = require("../utils");
const configStore = require("../config");
const { Logger } = require("../helpers/logger");
const {
  generateJoiListQueryModel,
  generateJoiFindQueryModel,
} = require("../helpers/joi");
const {
  listMiddleware,
  findMiddleware,
  associationGetAllMiddleware,
} = require("../middlewares/handler");
const { generateEndpoint } = require("./generate");
const authStrategy = configStore.get("/authStrategy");

/**
 * Creates an endpoint for GET /RESOURCE.
 * @param model: A model.
 */
exports.listEndpoint = function (DB, model) {
  const routeOptions = model.routeOptions;
  if (routeOptions.allowList === false) return;

  const routePath = getPathName(model);

  let middlewares = [];
  let scope = [];
  if ((!routeOptions || routeOptions.readAuth !== false) && authStrategy) {
    scope = getScopes(model, "read");
    if (!_.isEmpty(scope)) {
      if (configStore.get("/logScopes")) {
        Logger.debug(`Scope for GET/${routePath} => ` + scope);
      }
    }
  }

  const queryModel = generateJoiListQueryModel(model);

  let policies = [];

  if (model.policies && configStore.get("/enablePolicies")) {
    policies = model.policies;
    policies = (policies.root || []).concat(policies.read || []);
  }
  policies.forEach((val) => middlewares.push(val));

  const handler = listMiddleware(DB, model);

  generateEndpoint({
    method: "get",
    path: `/${routePath}`,
    summary: `Get a list of ${routePath}`,
    tags: [routePath],
    validate: {
      query: queryModel,
    },
    scope,
    isJsonFields: true,
    model,
    auth: (!routeOptions || routeOptions.readAuth !== false) && authStrategy,
    middlewares,
    handler,
    log: "Generating List endpoint for " + getModelName(model),
  });
};

/**
 * Creates an endpoint for GET /RESOURCE/{_id}
 * @param model: A model.
 */
exports.findEndpoint = function (DB, model) {
  const routeOptions = model.routeOptions;
  if (routeOptions.allowRead === false) return;

  const routePath = getPathName(model);

  let middlewares = [];
  let scope = [];
  if ((!routeOptions || routeOptions.readAuth !== false) && authStrategy) {
    scope = getScopes(model, "read");
    if (!_.isEmpty(scope)) {
      if (configStore.get("/logScopes")) {
        Logger.debug(`Scope for GET/${routePath}/:id => ` + scope);
      }
    }
  }
  const queryModel = generateJoiFindQueryModel(model);

  let policies = [];

  if (model.policies && configStore.get("/enablePolicies")) {
    policies = model.policies;
    policies = (policies.root || []).concat(policies.read || []);
  }
  policies.forEach((val) => middlewares.push(val));

  const handler = findMiddleware(DB, model);

  generateEndpoint({
    method: "get",
    path: `/${routePath}/:id`,
    summary: `Get a specific ${routePath}`,
    tags: [routePath],
    validate: {
      query: queryModel,
      param: Joi.object({
        id: Joi.number().required(),
      }),
    },
    scope,
    auth: (!routeOptions || routeOptions.readAuth !== false) && authStrategy,
    middlewares,
    handler,
    log: "Generating Find endpoint for " + getModelName(model),
  });
};

/**
 * Creates an endpoint for GET /OWNER_RESOURCE/{ownerId}/CHILD_RESOURCE
 * @param ownerModel: A model.
 * @param association: An object containing the association data/child model.
 */
exports.associationGetAllEndpoint = function (DB, ownerModel, association) {
  const routeOptions = ownerModel.routeOptions;
  const { target } = association;
  if (
    routeOptions[getModelName(target)] &&
    routeOptions[getModelName(target)].allowRead === false
  )
    return;

  const ownerAlias = routeOptions.alias || getModelName(ownerModel);
  const childAlias =
    (routeOptions[getModelName(target)] &&
      routeOptions[getModelName(target)].alias) ||
    getModelName(target);

  let middlewares = [];
  let scope = [];
  if (
    routeOptions[getModelName(target)] &&
    routeOptions[getModelName(target)].readAuth !== false &&
    authStrategy
  ) {
    scope = getScopes(ownerModel, "associate");
    const getScope =
      "get" +
      getModelName(ownerModel)[0].toUpperCase() +
      getModelName(ownerModel).slice(1).toLowerCase() +
      getModelName(target)[0].toUpperCase() +
      getModelName(target).slice(1).toLowerCase() +
      "Scope";
    scope = scope.concat(getScopes(ownerModel, getScope));
    if (!_.isEmpty(scope)) {
      if (configStore.get("/logScopes")) {
        Logger.debug(
          `Scope for GET/${ownerAlias}/:ownerId/${childAlias} => ` + scope
        );
      }
    }
  }
  const queryModel = generateJoiListQueryModel(target);

  let policies = [];

  if (ownerModel.policies && configStore.get("/enablePolicies")) {
    policies = ownerModel.policies;
    policies = (policies.root || []).concat(policies.read || []);
  }
  policies.forEach((val) => middlewares.push(val));

  const handler = associationGetAllMiddleware(DB, ownerModel, association);

  generateEndpoint({
    method: "get",
    path: `/${ownerAlias}/:ownerId/${childAlias}`,
    summary: `Get all of the ${childAlias} for a ${ownerAlias}`,
    tags: [ownerAlias],
    validate: {
      query: queryModel,
      param: Joi.object({
        ownerId: Joi.number().required(),
      }),
    },
    scope,
    isJsonFields: true,
    model: target,
    auth:
      routeOptions[getModelName(target)] &&
      routeOptions[getModelName(target)].readAuth !== false &&
      authStrategy,
    middlewares,
    handler,
    log:
      "Generating list association endpoint for " +
      getModelName(ownerModel) +
      " -> " +
      getModelName(target),
  });
};
