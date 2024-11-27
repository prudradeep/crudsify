"use strict";

const _ = require("lodash");
const Joi = require("joi");
const { getPathName, getScopes, getModelName, ucfirst } = require("../utils");
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
const { addMeta } = require("../middlewares/add-meta-data");
const { getRecordScopeMiddleware } = require("../middlewares/scope");
const authentication = configStore.get("/authentication");

/**
 * Creates an endpoint for DELETE /RESOURCE/{_id}
 * @param model: A model.
 */
exports.deleteOneEndpoint = function (model) {
  const routeOptions = model.routeOptions;
  if (routeOptions.allowDelete === false) return;

  const routePath = getPathName(model);

  let middlewares = [];
  let scope = [];
  if (routeOptions.deleteAuth !== false && authentication) {
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

  let prePolicies = [];
  if (
    model.policies &&
    model.policies.pre &&
    configStore.get("/enablePolicies")
  ) {
    prePolicies = model.policies.pre;
    prePolicies = (prePolicies.root || []).concat(prePolicies.delete || []);
  }
  prePolicies.forEach((val) => middlewares.push(val));

  if (
    routeOptions.deleteAuth !== false &&
    authentication &&
    configStore.get("/enableRecordScopes")
  ) {
    middlewares.push(getRecordScopeMiddleware("delete", model));
  }

  if (
    routeOptions.deleteAuth !== false &&
    authentication &&
    configStore.get("/enableDeletedBy")
  )
    middlewares.push(addMeta("delete"));

  const handler = deleteMiddleware(model);

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
    method: "delete",
    path: `/${routePath}/:id`,
    summary: `Delete a ${routePath}`,
    tags: [routePath],
    validate: {
      body: payloadModel,
      params: Joi.object({
        id: Joi.string().required(),
      }),
    },
    scope,
    auth: routeOptions.deleteAuth !== false && authentication,
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
exports.deleteManyEndpoint = function (model) {
  const routeOptions = model.routeOptions;
  if (routeOptions.allowDelete === false) return;
  if (routeOptions.allowDeleteMany === false) return;

  const routePath = getPathName(model);

  let middlewares = [];
  let scope = [];
  if ((!routeOptions || routeOptions.deleteAuth !== false) && authentication) {
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

  let prePolicies = [];
  if (
    model.policies &&
    model.policies.pre &&
    configStore.get("/enablePolicies")
  ) {
    prePolicies = model.policies.pre;
    prePolicies = (prePolicies.root || []).concat(prePolicies.delete || []);
  }
  prePolicies.forEach((val) => middlewares.push(val));

  if (
    routeOptions.deleteAuth !== false &&
    authentication &&
    configStore.get("/enableRecordScopes")
  ) {
    middlewares.push(getRecordScopeMiddleware("delete", model));
  }

  if (
    routeOptions.deleteAuth !== false &&
    authentication &&
    configStore.get("/enableDeletedBy")
  )
    middlewares.push(addMeta("delete"));

  const handler = deleteMiddleware(model);

  let postPolicies = [];
  if (
    model.policies &&
    model.policies.post &&
    configStore.get("/enablePolicies")
  ) {
    postPolicies = model.policies.post;
    postPolicies = (postPolicies.root || []).concat(postPolicies.delete || []);
  }
  postPolicies.forEach((val) => middlewares.push(val));

  generateEndpoint({
    method: "delete",
    path: `/${routePath}`,
    summary: `Delete multiple ${routePath}`,
    tags: [routePath],
    validate: {
      body: payloadModel,
    },
    scope,
    auth: routeOptions.deleteAuth !== false && authentication,
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
exports.associationRemoveOneEndpoint = function (ownerModel, association) {
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
    authentication
  ) {
    scope = getScopes(ownerModel, "associate");
    const removeScope =
      "remove" +
      ucfirst(getModelName(ownerModel)) +
      ucfirst(getModelName(target)) +
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
    routeOptions[getModelName(target)].removeAuth !== false &&
    authentication &&
    configStore.get("/enableRecordScopes")
  ) {
    middlewares.push(getRecordScopeMiddleware("associate", ownerModel));
  }

  if (
    routeOptions[getModelName(target)] &&
    routeOptions[getModelName(target)].removeAuth !== false &&
    authentication &&
    configStore.get("/enableDeletedBy")
  )
    middlewares.push(addMeta("delete"));

  const handler = associationRemoveOneMiddleware(ownerModel, association);

  let postPolicies = [];
  if (
    ownerModel.policies &&
    ownerModel.policies.post &&
    configStore.get("/enablePolicies")
  ) {
    postPolicies = ownerModel.policies.post;
    postPolicies = (postPolicies.root || []).concat(
      postPolicies.associate || []
    );
  }
  postPolicies.forEach((val) => middlewares.push(val));

  generateEndpoint({
    method: "delete",
    path: `/${ownerAlias}/:ownerId/${childAlias}/:childId`,
    summary: `Remove a single ${childAlias} from a ${ownerAlias}'s list of ${childAlias}`,
    tags: [ownerAlias],
    validate: {
      params: Joi.object({
        ownerId: Joi.string().required(),
        childId: Joi.string().required(),
      }),
    },
    scope,
    auth:
      routeOptions[getModelName(target)] &&
      routeOptions[getModelName(target)].removeAuth !== false &&
      authentication,
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
exports.associationRemoveManyEndpoint = function (ownerModel, association) {
  const routeOptions = ownerModel.routeOptions;
  const { target, associationType } = association;
  if (
    routeOptions[getModelName(target)] &&
    routeOptions[getModelName(target)].allowRemove === false
  )
    return;
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
    authentication
  ) {
    scope = getScopes(ownerModel, "associate");
    const removeScope =
      "remove" +
      ucfirst(getModelName(ownerModel)) +
      ucfirst(getModelName(target)) +
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
    routeOptions[getModelName(target)].removeAuth !== false &&
    authentication &&
    configStore.get("/enableRecordScopes")
  ) {
    middlewares.push(getRecordScopeMiddleware("associate", ownerModel));
  }

  if (
    routeOptions[getModelName(target)] &&
    routeOptions[getModelName(target)].removeAuth !== false &&
    authentication &&
    configStore.get("/enableDeletedBy")
  )
    middlewares.push(addMeta("delete"));

  const handler = associationRemoveManyMiddleware(ownerModel, association);

  let postPolicies = [];
  if (
    ownerModel.policies &&
    ownerModel.policies.post &&
    configStore.get("/enablePolicies")
  ) {
    postPolicies = ownerModel.policies.post;
    postPolicies = (postPolicies.root || []).concat(
      postPolicies.associate || []
    );
  }
  postPolicies.forEach((val) => middlewares.push(val));

  generateEndpoint({
    method: "delete",
    path: `/${ownerAlias}/:ownerId/${childAlias}`,
    summary: `Remove multiple ${childAlias} from a ${ownerAlias}'s list of ${childAlias}`,
    tags: [ownerAlias],
    validate: {
      body: payloadValidation,
      params: Joi.object({
        ownerId: Joi.string().required(),
      }),
    },
    scope,
    auth:
      routeOptions[getModelName(target)] &&
      routeOptions[getModelName(target)].removeAuth !== false &&
      authentication,
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
