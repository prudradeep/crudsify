"use strict";

const _ = require("lodash");
const Joi = require("joi");
const { getPathName, getScopes, getModelName, ucfirst } = require("../utils");
const configStore = require("../config");
const { Logger } = require("../helpers/logger");
const {
  generateJoiCreateModel,
  generateJoiUpdateModel,
} = require("../helpers/joi");
const {
  createMiddleware,
  updateMiddleware,
  associationAddManyMiddleware,
  associationAddOneMiddleware,
} = require("../middlewares/handler");
const { generateEndpoint } = require("./generate");
const {
  logCreateMiddleware,
  logUpdateMiddleware,
  logAddMiddleware,
} = require("../middlewares/audit-log");
const {
  addRecordScope,
  addAuthRecordCreatorSope,
} = require("../middlewares/add-record-scope");
const { addMeta } = require("../middlewares/add-meta-data");
const { getRecordScopeMiddleware } = require("../middlewares/scope");
const authentication = configStore.get("/authentication");

/**
 * Creates an endpoint for POST /RESOURCE
 * @param model: A model.
 */
exports.createEndpoint = function (model) {
  const routeOptions = model.routeOptions;
  if (routeOptions.allowCreate === false) return;

  const routePath = getPathName(model);

  let middlewares = [];
  let scope = [];
  if (routeOptions.createAuth !== false && authentication) {
    scope = getScopes(model, "create");
    if (!_.isEmpty(scope)) {
      if (configStore.get("/logScopes")) {
        Logger.debug(`Scope for POST/${routePath} => ` + scope);
      }
    }
  }

  let createModel = generateJoiCreateModel(model);
  if (!configStore.get("/enablePayloadValidation")) {
    const label = createModel._flags.label;
    createModel = Joi.alternatives().try(createModel, Joi.any()).label(label);
  }

  // EXPL: support bulk creates
  createModel = Joi.alternatives().try(
    Joi.array().items(createModel),
    createModel
  );

  let prePolicies = [];
  if (
    model.policies &&
    model.policies.pre &&
    configStore.get("/enablePolicies")
  ) {
    prePolicies = model.policies.pre;
    prePolicies = (prePolicies.root || []).concat(prePolicies.create || []);
  }
  prePolicies.forEach((val) => middlewares.push(val));

  if (routeOptions.createAuth !== false && authentication) {
    if (configStore.get("/enableCreatedBy"))
      middlewares.push(addMeta("create"));

    if (configStore.get("/enableRecordScopes")) {
      middlewares.push(addRecordScope(model));
      middlewares.push(addAuthRecordCreatorSope(model));
    }
  }

  const handler = createMiddleware(model);

  let postPolicies = [];
  if (
    model.policies &&
    model.policies.post &&
    configStore.get("/enablePolicies")
  ) {
    postPolicies = model.policies.post;
    postPolicies = (postPolicies.root || []).concat(postPolicies.create || []);
  }
  postPolicies.forEach((val) => middlewares.push(val));

  generateEndpoint({
    method: "post",
    path: `/${routePath}`,
    summary: `Create one or more new ${routePath}`,
    tags: [routePath],
    validate: {
      body: createModel,
    },
    scope,
    auth: routeOptions.createAuth !== false && authentication,
    middlewares,
    handler,
    afterMiddlewares: [logCreateMiddleware(model)],
    log: "Generating Create endpoint for " + getModelName(model),
  });
};

/**
 * Creates an endpoint for PUT /RESOURCE/{_id}
 * @param model: A model.
 */
exports.updateEndpoint = function (model) {
  const routeOptions = model.routeOptions;
  if (routeOptions.allowUpdate === false) return;

  const routePath = getPathName(model);

  let middlewares = [];
  let scope = [];
  if (routeOptions.updateAuth !== false && authentication) {
    scope = getScopes(model, "update");
    if (!_.isEmpty(scope)) {
      if (configStore.get("/logScopes")) {
        Logger.debug(`Scope for PUT/${routePath}/:id => ` + scope);
      }
    }
  }
  let updateModel = generateJoiUpdateModel(model);
  if (!configStore.get("/enablePayloadValidation")) {
    const label = updateModel._flags.label;
    updateModel = Joi.alternatives().try(updateModel, Joi.any()).label(label);
  }

  let prePolicies = [];
  if (
    model.policies &&
    model.policies.pre &&
    configStore.get("/enablePolicies")
  ) {
    prePolicies = model.policies.pre;
    prePolicies = (prePolicies.root || []).concat(prePolicies.update || []);
  }
  prePolicies.forEach((val) => middlewares.push(val));

  if (
    routeOptions.updateAuth !== false &&
    authentication &&
    configStore.get("/enableRecordScopes")
  ) {
    middlewares.push(getRecordScopeMiddleware("update", model));
  }

  if (
    routeOptions.updateAuth !== false &&
    authentication &&
    configStore.get("/enableUpdatedBy")
  )
    middlewares.push(addMeta("update"));

  const handler = updateMiddleware(model);

  let postPolicies = [];
  if (
    model.policies &&
    model.policies.post &&
    configStore.get("/enablePolicies")
  ) {
    postPolicies = model.policies.post;
    postPolicies = (postPolicies.root || []).concat(postPolicies.update || []);
  }
  postPolicies.forEach((val) => middlewares.push(val));

  generateEndpoint({
    method: "put",
    path: `/${routePath}/:id`,
    summary: `Update a ${routePath}`,
    tags: [routePath],
    validate: {
      body: updateModel,
      params: Joi.object({
        id: Joi.string().required(),
      }),
    },
    scope,
    auth: routeOptions.updateAuth !== false && authentication,
    middlewares,
    handler,
    afterMiddlewares: [logUpdateMiddleware(model)],
    log: "Generating Update endpoint for " + getModelName(model),
  });
};

/**
 * Creates an endpoint for PUT /OWNER_RESOURCE/{ownerId}/CHILD_RESOURCE/{childId}
 * @param ownerModel: A model.
 * @param association: An object containing the association data/child model.
 */
exports.associationAddManyEndpoint = function (ownerModel, association) {
  const routeOptions = ownerModel.routeOptions;
  const { target, associationType } = association;
  if (
    routeOptions[getModelName(target)] &&
    routeOptions[getModelName(target)].allowAdd === false
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
    routeOptions[getModelName(target)].addAuth !== false &&
    authentication
  ) {
    scope = getScopes(ownerModel, "associate");
    const addScope =
      "add" +
      ucfirst(getModelName(ownerModel)) +
      ucfirst(getModelName(target)) +
      "Scope";
    scope = scope.concat(getScopes(ownerModel, addScope));
    if (!_.isEmpty(scope)) {
      if (configStore.get("/logScopes")) {
        Logger.debug(
          `Scope for POST/${ownerAlias}/:ownerId/${childAlias} => ` + scope
        );
      }
    }
  }
  let payloadValidation;
  let label = "";
  if (association) {
    payloadValidation = generateJoiCreateModel(
      association.through ? association.through.model : association.target,
      association.through ? false : true,
      association.through
        ? association.through.model.primaryKeyAttributes
        : [association.foreignKeyField]
    );

    label = payloadValidation._flags.label + "_many";
    if (payloadValidation.keys) {
      payloadValidation = payloadValidation
        .keys({
          data: Joi.alternatives()
            .try(
              Joi.array().items(
                generateJoiCreateModel(
                  association.through
                    ? association.through.model
                    : association.target,
                  association.through ? false : true,
                  association.through
                    ? [
                        `${ownerModel.name}${ucfirst(
                          configStore.get("/dbPrimaryKey").name
                        )}`,
                      ]
                    : [association.foreignKeyField]
                )
              ),
              Joi.array().items(Joi.alternatives().try(Joi.string(), Joi.number()).required())
            )
            .description("the " + getModelName(target) + "'s id"),
        })
        .label(label || "blank");
    }
  } else {
    payloadValidation = Joi.object({
      data: Joi.array().items(Joi.alternatives().try(Joi.string(), Joi.number()).required()).required(),
    });
  }

  if (!configStore.get("/enablePayloadValidation")) {
    label = payloadValidation._flags.label;
    payloadValidation = Joi.alternatives()
      .try(payloadValidation, Joi.any())
      .label(label || "blank");
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
    routeOptions[getModelName(target)].addAuth !== false &&
    authentication &&
    configStore.get("/enableRecordScopes")
  ) {
    middlewares.push(getRecordScopeMiddleware("associate", ownerModel));
  }

  if (
    routeOptions[getModelName(target)] &&
    routeOptions[getModelName(target)].addAuth !== false &&
    authentication &&
    configStore.get("/enableCreatedBy")
  )
    middlewares.push(addMeta("create"));

  const handler = associationAddManyMiddleware(ownerModel, association);

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
    method: "post",
    path: `/${ownerAlias}/:ownerId/${childAlias}`,
    summary: `Add multiple ${childAlias} to a ${ownerAlias}'s list of ${childAlias}`,
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
      routeOptions[getModelName(target)].addAuth !== false &&
      authentication,
    middlewares,
    handler,
    afterMiddlewares: [logAddMiddleware(ownerModel, target, associationType)],
    log:
      "Generating addMany association endpoint for " +
      getModelName(ownerModel) +
      " -> " +
      getModelName(target),
  });
};

/**
 * Creates an endpoint for POST /OWNER_RESOURCE/{ownerId}/CHILD_RESOURCE
 * @param ownerModel: A model.
 * @param association: An object containing the association data/child model.
 */
exports.associationAddOneEndpoint = function (ownerModel, association) {
  const routeOptions = ownerModel.routeOptions;
  const { target, associationType } = association;
  if (
    routeOptions[getModelName(target)] &&
    routeOptions[getModelName(target)].allowAdd === false
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
    routeOptions[getModelName(target)].addAuth !== false &&
    authentication
  ) {
    scope = getScopes(ownerModel, "associate");
    const addScope =
      "add" +
      ucfirst(getModelName(ownerModel)) +
      ucfirst(getModelName(target)) +
      "Scope";
    scope = scope.concat(getScopes(ownerModel, addScope));
    if (!_.isEmpty(scope)) {
      if (configStore.get("/logScopes")) {
        Logger.debug(
          `Scope for PUT/${ownerAlias}/:ownerId/${childAlias}/:childId => ` +
            scope
        );
      }
    }
  }
  let payloadValidation = null;

  if (association.through) {
    payloadValidation = generateJoiUpdateModel(
      association.through ? association.through.model : association.target,
      association.through
        ? association.through.model.primaryKeyAttributes
        : [association.foreignKeyField]
    );

    if (!configStore.get("/enablePayloadValidation")) {
      const label = payloadValidation._flags.label;
      payloadValidation = Joi.alternatives()
        .try(payloadValidation, Joi.any())
        .label(label);
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
    routeOptions[getModelName(target)].addAuth !== false &&
    authentication &&
    configStore.get("/enableRecordScopes")
  ) {
    middlewares.push(getRecordScopeMiddleware("associate", ownerModel));
  }

  if (
    routeOptions[getModelName(target)] &&
    routeOptions[getModelName(target)].addAuth !== false &&
    authentication &&
    configStore.get("/enableUpdatedBy")
  )
    middlewares.push(addMeta("update"));

  const handler = associationAddOneMiddleware(ownerModel, association);

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
    method: "put",
    path: `/${ownerAlias}/:ownerId/${childAlias}/:childId`,
    summary: `Add a single ${childAlias} to a ${ownerAlias}'s list of ${childAlias}`,
    tags: [ownerAlias],
    validate: {
      body: payloadValidation,
      params: Joi.object({
        ownerId: Joi.string().required(),
        childId: Joi.string().required(),
      }),
    },
    scope,
    auth:
      routeOptions[getModelName(target)] &&
      routeOptions[getModelName(target)].addAuth !== false &&
      authentication,
    middlewares,
    handler,
    afterMiddlewares: [logAddMiddleware(ownerModel, target, associationType)],
    log:
      "Generating addOne association endpoint for " +
      getModelName(ownerModel) +
      " -> " +
      getModelName(target),
  });
};
