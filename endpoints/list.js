"use strict";

const _ = require("lodash");
const Joi = require("joi");
const { getPathName, getScopes, getModelName, ucfirst } = require("../utils");
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
const { getRecordScopeMiddleware } = require("../middlewares/scope");
const authentication = configStore.get("/authentication");

/**
 * Creates an endpoint for GET /RESOURCE.
 * @param model: A model.
 */
exports.listEndpoint = function (DB, model) {
  const routeOptions = model.routeOptions;
  if(routeOptions.allowRead === false) return;
  if (routeOptions.allowList === false) return;

  const routePath = getPathName(model);

  let middlewares = [];
  let scope = [];
  if ((!routeOptions || routeOptions.readAuth !== false) && authentication) {
    scope = getScopes(model, "read");
    if (!_.isEmpty(scope)) {
      if (configStore.get("/logScopes")) {
        Logger.debug(`Scope for GET/${routePath} => ` + scope);
      }
    }
  }

  const queryModel = generateJoiListQueryModel(model);

  let prePolicies = [];
  if (
    model.policies &&
    model.policies.pre &&
    configStore.get("/enablePolicies")
  ) {
    prePolicies = model.policies.pre;
    prePolicies = (prePolicies.root || []).concat(prePolicies.read || []);
  }
  prePolicies.forEach((val) => middlewares.push(val));

  if (
    routeOptions.readAuth !== false &&
    authentication &&
    configStore.get("/enableRecordScopes")
  ) {
    middlewares.push(getRecordScopeMiddleware("read", model));
  }

  const handler = listMiddleware(DB, model);

  let postPolicies = [];
  if (
    model.policies &&
    model.policies.post &&
    configStore.get("/enablePolicies")
  ) {
    postPolicies = model.policies.post;
    postPolicies = (postPolicies.root || []).concat(postPolicies.read || []);
  }
  postPolicies.forEach((val) => middlewares.push(val));

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
    auth: routeOptions.readAuth !== false && authentication,
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
  if ((!routeOptions || routeOptions.readAuth !== false) && authentication) {
    scope = getScopes(model, "read");
    if (!_.isEmpty(scope)) {
      if (configStore.get("/logScopes")) {
        Logger.debug(`Scope for GET/${routePath}/:id => ` + scope);
      }
    }
  }
  const queryModel = generateJoiFindQueryModel(model);

  let prePolicies = [];
  if (
    model.policies &&
    model.policies.pre &&
    configStore.get("/enablePolicies")
  ) {
    prePolicies = model.policies.pre;
    prePolicies = (prePolicies.root || []).concat(prePolicies.read || []);
  }
  prePolicies.forEach((val) => middlewares.push(val));

  if (
    routeOptions.readAuth !== false &&
    authentication &&
    configStore.get("/enableRecordScopes")
  ) {
    middlewares.push(getRecordScopeMiddleware("read", model));
  }

  const handler = findMiddleware(DB, model);

  let postPolicies = [];
  if (
    model.policies &&
    model.policies.post &&
    configStore.get("/enablePolicies")
  ) {
    postPolicies = model.policies.post;
    postPolicies = (postPolicies.root || []).concat(postPolicies.read || []);
  }
  postPolicies.forEach((val) => middlewares.push(val));

  generateEndpoint({
    method: "get",
    path: `/${routePath}/:id`,
    summary: `Get a specific ${routePath}`,
    tags: [routePath],
    validate: {
      query: queryModel,
      params: Joi.object({
        id: Joi.number().required(),
      }),
    },
    scope,
    auth: routeOptions.readAuth !== false && authentication,
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

  const ownerAlias = getPathName(ownerModel);
  const childAlias =
    (routeOptions[getModelName(target)] &&
      routeOptions[getModelName(target)].alias) ||
    getPathName(target);

  let middlewares = [];
  let scope = [];
  if (
    routeOptions[getModelName(target)] &&
    routeOptions[getModelName(target)].readAuth !== false &&
    authentication
  ) {
    scope = getScopes(ownerModel, "associate");
    const getScope =
      "get" +
      ucfirst(getModelName(ownerModel)) +
      ucfirst(getModelName(target)) +
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

  let prePolicies = [];
  if (
    ownerModel.policies &&
    ownerModel.policies.pre &&
    configStore.get("/enablePolicies")
  ) {
    prePolicies = ownerModel.policies.pre;
    prePolicies = (prePolicies.root || []).concat(prePolicies.associate || []);
  }
  prePolicies.forEach((val) => middlewares.push(val));

  if (
    routeOptions[getModelName(target)] &&
    routeOptions[getModelName(target)].readAuth !== false &&
    authentication &&
    configStore.get("/enableRecordScopes")
  ) {
    middlewares.push(getRecordScopeMiddleware("associate", ownerModel));
  }

  const handler = associationGetAllMiddleware(DB, ownerModel, association);

  let postPolicies = [];
  if (
    ownerModel.policies &&
    ownerModel.policies.post &&
    configStore.get("/enablePolicies")
  ) {
    postPolicies = ownerModel.policies.post;
    postPolicies = (postPolicies.root || []).concat(postPolicies.associate || []);
  }
  postPolicies.forEach((val) => middlewares.push(val));

  generateEndpoint({
    method: "get",
    path: `/${ownerAlias}/:ownerId/${childAlias}`,
    summary: `Get all of the ${childAlias} for a ${ownerAlias}`,
    tags: [ownerAlias],
    validate: {
      query: queryModel,
      params: Joi.object({
        ownerId: Joi.number().required(),
      }),
    },
    scope,
    isJsonFields: true,
    model: target,
    auth:
      routeOptions[getModelName(target)] &&
      routeOptions[getModelName(target)].readAuth !== false &&
      authentication,
    middlewares,
    handler,
    log:
      "Generating list association endpoint for " +
      getModelName(ownerModel) +
      " -> " +
      getModelName(target),
  });
};
