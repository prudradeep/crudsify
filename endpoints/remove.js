"use strict";

const _ = require("lodash");
const Joi = require("joi");
const { getPathName, getScopes, getModelName } = require("../utils");
const configStore = require("../config");
const { Logger } = require("../helpers/logger");
const { generateEndpoint } = require("./generate");
const {
  deleteMiddleware,
  associationRemoveOneMiddleware,
  associationRemoveManyMiddleware,
} = require("../middlewares/handler");
const {
  logDeleteMiddleware,
  logRemoveMiddleware,
} = require("../middlewares/audit-log");
const authStrategy = configStore.get("/authStrategy");

/**
 * Creates an endpoint for DELETE /RESOURCE/{_id}
 * @param model: A model.
 */
exports.deleteOneEndpoint = function (DB, model) {
  const routeOptions = model.routeOptions;
  if (routeOptions.allowDelete === false) return;

  const routePath = getPathName(model);

  let middlewares = [];
  let scope = [];
  if ((!routeOptions || routeOptions.deleteAuth !== false) && authStrategy) {
    scope = getScopes(model, "delete");
    if (!_.isEmpty(scope)) {
      if (configStore.get("/logScopes")) {
        Logger.debug(`Scope for DELETE/${routePath}/:id => ` + scope);
      }
    }
  }
  let payloadModel = null;
  if (configStore.get("/modelOptions").paranoid) {
    payloadModel = Joi.object({ hardDelete: Joi.bool().default(false) }).allow(
      null
    );

    if (!configStore.get("/enablePayloadValidation")) {
      payloadModel = Joi.alternatives().try(payloadModel, Joi.any());
    }
  }

  let policies = [];

  if (model.policies && configStore.get("/enablePolicies")) {
    policies = model.policies;
    policies = (policies.root || []).concat(policies.delete || []);
  }
  policies.forEach((val) => middlewares.push(val));

  const handler = deleteMiddleware(DB, model);

  generateEndpoint({
    method: "delete",
    path: `/${routePath}/:id`,
    summary: `Delete a ${routePath}`,
    tags: [routePath],
    validate: {
      body: payloadModel,
      param: Joi.object({
        id: Joi.number().required(),
      }),
    },
    scope,
    auth: (!routeOptions || routeOptions.deleteAuth !== false) && authStrategy,
    middlewares,
    handler,
    afterMiddlewares: [logDeleteMiddleware(model)],
    log: "Generating Delete One endpoint for " + getModelName(model),
  });
};

/**
 * Creates an endpoint for DELETE /RESOURCE/
 * @param model: A model.
 */
exports.deleteManyEndpoint = function (DB, model) {
  const routeOptions = model.routeOptions;
  if (routeOptions.allowDeleteMany === false) return;

  const routePath = getPathName(model);

  let middlewares = [];
  let scope = [];
  if ((!routeOptions || routeOptions.deleteAuth !== false) && authStrategy) {
    scope = getScopes(model, "delete");
    if (!_.isEmpty(scope)) {
      if (configStore.get("/logScopes")) {
        Logger.debug(`Scope for DELETE/${routePath} => ` + scope);
      }
    }
  }

  let payloadModel = null;
  if (configStore.get("/modelOptions").paranoid) {
    payloadModel = Joi.object({
      data: Joi.array().items(Joi.number().required()).required(),
      hardDelete: Joi.bool().default(false),
    });
  } else {
    payloadModel = Joi.object({
      data: Joi.array().items(Joi.number().required()).required(),
    });
  }

  if (!configStore.get("/enablePayloadValidation")) {
    payloadModel = Joi.alternatives().try(payloadModel, Joi.any());
  }

  let policies = [];

  if (model.policies && configStore.get("/enablePolicies")) {
    policies = model.policies;
    policies = (policies.root || []).concat(policies.delete || []);
  }
  policies.forEach((val) => middlewares.push(val));

  const handler = deleteMiddleware(DB, model);

  generateEndpoint({
    method: "delete",
    path: `/${routePath}`,
    summary: `Delete multiple ${routePath}`,
    tags: [routePath],
    validate: {
      body: payloadModel,
    },
    scope,
    auth: (!routeOptions || routeOptions.deleteAuth !== false) && authStrategy,
    middlewares,
    handler,
    afterMiddlewares: [logDeleteMiddleware(model)],
    log: "Generating Delete Many endpoint for " + getModelName(model),
  });
};

/**
 * Creates an endpoint for DELETE /OWNER_RESOURCE/{ownerId}/CHILD_RESOURCE/{childId}
 * @param ownerModel: A model.
 * @param association: An object containing the association data/child model.
 */
exports.associationRemoveOneEndpoint = function (DB, ownerModel, association) {
  const routeOptions = ownerModel.routeOptions;
  const { target, associationType } = association;
  if (
    routeOptions[getModelName(target)] &&
    routeOptions[getModelName(target)].allowRemove === false
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
    routeOptions[getModelName(target)].removeAuth !== false &&
    authStrategy
  ) {
    scope = getScopes(ownerModel, "associate");
    const removeScope =
      "remove" +
      getModelName(ownerModel)[0].toUpperCase() +
      getModelName(ownerModel).slice(1).toLowerCase() +
      getModelName(target)[0].toUpperCase() +
      getModelName(target).slice(1).toLowerCase() +
      "Scope";
    scope = scope.concat(getScopes(ownerModel, removeScope));
    if (!_.isEmpty(scope)) {
      if (configStore.get("/logScopes")) {
        Logger.debug(
          `Scope for DELETE/${ownerAlias}/:ownerId/${childAlias}/:childId => ` +
            scope
        );
      }
    }
  }

  let policies = [];

  if (ownerModel.policies && configStore.get("/enablePolicies")) {
    policies = ownerModel.policies;
    policies = (policies.root || []).concat(policies.associate || []);
  }
  policies.forEach((val) => middlewares.push(val));

  const handler = associationRemoveOneMiddleware(DB, ownerModel, association);

  generateEndpoint({
    method: "delete",
    path: `/${ownerAlias}/:ownerId/${childAlias}/:childId`,
    summary: `Remove a single ${childAlias} from a ${ownerAlias}'s list of ${childAlias}`,
    tags: [ownerAlias],
    validate: {
      param: Joi.object({
        ownerId: Joi.number().required(),
        childId: Joi.number().required(),
      }),
    },
    scope,
    auth:
      routeOptions[getModelName(target)] &&
      routeOptions[getModelName(target)].removeAuth !== false &&
      authStrategy,
    middlewares,
    handler,
    afterMiddlewares: [
      logRemoveMiddleware(ownerModel, target, associationType),
    ],
    log:
      "Generating removeOne association endpoint for " +
      getModelName(ownerModel) +
      " -> " +
      getModelName(target),
  });
};

/**
 * Creates an endpoint for DELETE /OWNER_RESOURCE/{ownerId}/CHILD_RESOURCE
 * @param ownerModel: A model.
 * @param association: An object containing the association data/child model.
 */
exports.associationRemoveManyEndpoint = function (DB, ownerModel, association) {
  const routeOptions = ownerModel.routeOptions;
  const { target, associationType } = association;
  if (
    routeOptions[getModelName(target)] &&
    routeOptions[getModelName(target)].allowRemoveMany === false
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
    routeOptions[getModelName(target)].removeAuth !== false &&
    authStrategy
  ) {
    scope = getScopes(ownerModel, "associate");
    const removeScope =
      "remove" +
      getModelName(ownerModel)[0].toUpperCase() +
      getModelName(ownerModel).slice(1).toLowerCase() +
      getModelName(target)[0].toUpperCase() +
      getModelName(target).slice(1).toLowerCase() +
      "Scope";
    scope = scope.concat(getScopes(ownerModel, removeScope));
    if (!_.isEmpty(scope)) {
      if (configStore.get("/logScopes")) {
        Logger.debug(
          `Scope for DELETE/${ownerAlias}/:ownerId/${childAlias} => ` + scope
        );
      }
    }
  }
  let payloadValidation = Joi.array().items(Joi.number().required()).required();

  payloadValidation = configStore.get("/enablePayloadValidation")
    ? payloadValidation
    : Joi.any();
  payloadValidation = payloadValidation.description(
    "An array of ids to remove."
  );

  let policies = [];

  if (ownerModel.policies && configStore.get("/enablePolicies")) {
    policies = ownerModel.policies;
    policies = (policies.root || []).concat(policies.associate || []);
  }
  policies.forEach((val) => middlewares.push(val));

  const handler = associationRemoveManyMiddleware(DB, ownerModel, association);

  generateEndpoint({
    method: "delete",
    path: `/${ownerAlias}/:ownerId/${childAlias}`,
    summary: `Remove multiple ${childAlias} from a ${ownerAlias}'s list of ${childAlias}`,
    tags: [ownerAlias],
    validate: {
      body: payloadValidation,
      param: Joi.object({
        ownerId: Joi.number().required(),
      }),
    },
    scope,
    auth:
      routeOptions[getModelName(target)] &&
      routeOptions[getModelName(target)].removeAuth !== false &&
      authStrategy,
    middlewares,
    handler,
    afterMiddlewares: [
      logRemoveMiddleware(ownerModel, target, associationType),
    ],
    log:
      "Generating removeMany association endpoint for " +
      getModelName(ownerModel) +
      " -> " +
      getModelName(target),
  });
};
