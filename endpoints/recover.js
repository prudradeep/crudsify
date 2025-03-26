"use strict";

const _ = require("lodash");
const Joi = require("joi");
const { getPathName, getScopes, getModelName } = require("../utils");
const { generateEndpoint } = require("./generate");
const configStore = require("../config");
const { Logger } = require("../helpers/logger");
const { getRecordScopeMiddleware } = require("../middlewares/scope");
const { recoverMiddleware } = require("../middlewares/handler");
const { logRecoverMiddleware } = require("../middlewares/audit-log");
const authentication = configStore.get("/authentication");

/**
 * Creates an endpoint for PATCH /RESOURCE/{_id}
 * @param model: A model.
 */
exports.recoverOneEndpoint = function (model) {
    const routeOptions = model.routeOptions;
    if (routeOptions.allowRecover === false || !configStore.get("/enableRecoverEndpoint")) return;
  
    const routePath = getPathName(model);
  
    let middlewares = [];
    let scope = [];
    if (routeOptions.recoverAuth !== false && authentication) {
      scope = getScopes(model, "recover");
      if (!_.isEmpty(scope)) {
        if (configStore.get("/logScopes")) {
          Logger.debug(`Scope for PATCH/${routePath}/:id => ` + scope);
        }
      }
    }
  
    let prePolicies = [];
    if (
      model.policies &&
      model.policies.pre &&
      configStore.get("/enablePolicies")
    ) {
      prePolicies = model.policies.pre;
      prePolicies = (prePolicies.root || []).concat(prePolicies.recover || []);
    }
    prePolicies.forEach((val) => middlewares.push(val));
  
    if (
      routeOptions.recoverAuth !== false &&
      authentication &&
      configStore.get("/enableRecordScopes")
    ) {
      middlewares.push(getRecordScopeMiddleware("recover", model));
    }
  
    const handler = recoverMiddleware(model);
  
    let postPolicies = [];
    if (
      model.policies &&
      model.policies.post &&
      configStore.get("/enablePolicies")
    ) {
      postPolicies = model.policies.post;
      postPolicies = (postPolicies.root || []).concat(postPolicies.recover || []);
    }
    postPolicies.forEach((val) => middlewares.push(val));
  
    generateEndpoint({
      method: "patch",
      path: `/${routePath}/:id`,
      summary: `Recover a ${routePath}`,
      tags: [routePath],
      validate: {
        params: Joi.object({
          id: Joi.string().required(),
        }),
      },
      scope,
      auth: routeOptions.recoverAuth !== false && authentication,
      middlewares,
      handler,
      afterMiddlewares: [logRecoverMiddleware(model)],
      log: "Generating Recover One endpoint for " + getModelName(model),
    });
  };
  
  /**
   * Creates an endpoint for PATCH /RESOURCE/
   * @param model: A model.
   */
  exports.recoverManyEndpoint = function (model) {
    const routeOptions = model.routeOptions;
    if (routeOptions.allowRecover === false || !configStore.get("/enableRecoverEndpoint")) return;
    if (routeOptions.allowRecoverMany === false) return;
  
    const routePath = getPathName(model);
  
    let middlewares = [];
    let scope = [];
    if ((!routeOptions || routeOptions.recoverAuth !== false) && authentication) {
      scope = getScopes(model, "recover");
      if (!_.isEmpty(scope)) {
        if (configStore.get("/logScopes")) {
          Logger.debug(`Scope for PATCH/${routePath} => ` + scope);
        }
      }
    }
  
    let payloadModel = Joi.object({
        data: Joi.array().items(Joi.alternatives().try(Joi.string(), Joi.number()).required()).required()
      });
  
    if (!configStore.get("/enablePayloadValidation")) {
      payloadModel = Joi.alternatives().try(payloadModel, Joi.any());
    }
  
    let prePolicies = [];
    if (
      model.policies &&
      model.policies.pre &&
      configStore.get("/enablePolicies")
    ) {
      prePolicies = model.policies.pre;
      prePolicies = (prePolicies.root || []).concat(prePolicies.recover || []);
    }
    prePolicies.forEach((val) => middlewares.push(val));
  
    if (
      routeOptions.recoverAuth !== false &&
      authentication &&
      configStore.get("/enableRecordScopes")
    ) {
      middlewares.push(getRecordScopeMiddleware("recover", model));
    }
  
    const handler = recoverMiddleware(model);
  
    let postPolicies = [];
    if (
      model.policies &&
      model.policies.post &&
      configStore.get("/enablePolicies")
    ) {
      postPolicies = model.policies.post;
      postPolicies = (postPolicies.root || []).concat(postPolicies.recover || []);
    }
    postPolicies.forEach((val) => middlewares.push(val));
  
    generateEndpoint({
      method: "patch",
      path: `/${routePath}`,
      summary: `Recover multiple ${routePath}`,
      tags: [routePath],
      validate: {
        body: payloadModel,
      },
      scope,
      auth: routeOptions.recoverAuth !== false && authentication,
      middlewares,
      handler,
      afterMiddlewares: [logRecoverMiddleware(model)],
      log: "Generating Recover Many endpoint for " + getModelName(model),
    });
  };