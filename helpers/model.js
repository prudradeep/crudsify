"use strict";

const Sequelize = require("sequelize");
const _ = require("lodash");
const configStore = require("../config");
const { ucfirst } = require("../utils");

exports.getPrimaryKey = (DataTypes) => {
  return {
    [configStore.get("/dbPrimaryKey").name]: {
      allowNull: false,
      autoIncrement: configStore.get("/dbPrimaryKey").autoIncrement,
      primaryKey: true,
      type: DataTypes[configStore.get("/dbPrimaryKey").type],
      defaultValue: (['UUID','STRING'].indexOf(configStore.get("/dbPrimaryKey").type) !== -1) ? DataTypes.UUIDV4: false,
    },
  };
};

exports.getTimestamps = (DataTypes) => {
  let timestamps = {};
  const modelOptions = configStore.get("/modelOptions");
  if (modelOptions.timestamps) {
    if (modelOptions.createdAt && typeof modelOptions.createdAt !== "boolean") {
      timestamps[modelOptions.createdAt] = {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      };
    } else if (
      modelOptions.createdAt === true ||
      modelOptions.createdAt === undefined
    ) {
      timestamps.createdAt = {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      };
    }

    if (modelOptions.updatedAt && typeof modelOptions.updatedAt !== "boolean") {
      timestamps[modelOptions.updatedAt] = {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        onUpdate: Sequelize.literal("CURRENT_TIMESTAMP"),
      };
    } else if (
      modelOptions.updatedAt === true ||
      modelOptions.updatedAt === undefined
    ) {
      timestamps.updatedAt = {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        onUpdate: Sequelize.literal("CURRENT_TIMESTAMP"),
      };
    }
  }
  if (modelOptions.paranoid) {
    if (modelOptions.deletedAt) {
      timestamps[modelOptions.deletedAt] = {
        type: DataTypes.DATE,
      };
    } else {
      timestamps.deletedAt = {
        type: DataTypes.DATE,
      };
    }
  }
  return timestamps;
};

exports.getMetadata = (DataTypes) => {
  let metadata = {};

  if (configStore.get("/enableCreatedBy") && configStore.get("/authentication")) {
    metadata.createdBy = {
      type: DataTypes[configStore.get("/dbPrimaryKey").type],
    };
  }
  if (configStore.get("/enableUpdatedBy") && configStore.get("/authentication")) {
    metadata.updatedBy = {
      type: DataTypes[configStore.get("/dbPrimaryKey").type],
    };
  }
  if (
    configStore.get("/enableDeletedBy") &&
    configStore.get("/modelOptions").paranoid &&
    configStore.get("/authentication")
  ) {
    metadata.deletedBy = {
      type: DataTypes[configStore.get("/dbPrimaryKey").type],
    };
  }
  return metadata;
};

exports.getRecordScopes = (DataTypes) => {
  if (configStore.get("/enableRecordScopes")) {
    return {
      [configStore.get("/recordScopeKey")]: {
        type: DataTypes.JSON
      }
    };
  }
  return {};
};

exports.routeScopes = (model) => {
  const modelName = ucfirst(model.name);

  const routeScopes = model.routeScopes || {};
  if (!routeScopes.rootScope) {
    delete routeScopes.rootScope;
  }

  const scope = {};
  scope.rootScope = ["root", model.name, "!-root", "!-" + model.name];
  scope.createScope = [
    "create",
    "create" + modelName,
    "!-create",
    "!-create" + modelName,
  ];
  scope.readScope = [
    "read",
    "read" + modelName,
    "!-read",
    "!-read" + modelName,
  ];
  scope.updateScope = [
    "update",
    "update" + modelName,
    "!-update",
    "!-update" + modelName,
  ];
  scope.deleteScope = [
    "delete",
    "delete" + modelName,
    "!-delete",
    "!-delete" + modelName,
  ];
  scope.recoverScope = [
    "recover",
    "recover" + modelName,
    "!-recover",
    "!-recover" + modelName,
  ];
  scope.associateScope = [
    "associate",
    "associate" + modelName,
    "!-associate",
    "!-associate" + modelName,
  ];

  for (const assoc of Object.values(model.associations)) {
    const { associationType, target } = assoc;
    if (associationType === "HasMany" || associationType === "BelongsToMany") {
      const associationName = ucfirst(target.name);
      scope["add" + modelName + associationName + "Scope"] = [
        "add" + modelName + associationName,
        "!-add" + modelName + associationName,
      ];
      scope["remove" + modelName + associationName + "Scope"] = [
        "remove" + modelName + associationName,
        "!-remove" + modelName + associationName,
      ];
      scope["get" + modelName + associationName + "Scope"] = [
        "get" + modelName + associationName,
        "!-get" + modelName + associationName,
      ];
    }
  }

  // Merge any existing scope fields with the generated scope
  for (const key in routeScopes) {
    if (scope[key]) {
      if (!_.isArray(scope[key])) {
        scope[key] = [scope[key]];
      }
      if (routeScopes[key] && _.isArray(routeScopes[key])) {
        scope[key] = scope[key].concat(routeScopes[key]);
      } else {
        scope[key].push(routeScopes[key]);
      }
    }
  }

  model.routeScopes = scope;
  return scope;
};

exports.routeOptions = (model) => {
  const routeOptions = model.routeOptions || {};

  const options = {
    readAuth: true, //GET /path and GET /path/{_id} endpoints
    createAuth: true, //POST /path endpoint
    updateAuth: true, //PUT /path/{_id} endpoint
    deleteAuth: true, //DELETE /path and DELETE /path/{_id} endpoints
    recoverAuth: true, //PATCH /path and PATCH /path/{_id} endpoints

    allowList: true, //Omits GET /path endpoint
    allowRead: true, //Omits GET /path and GET /path/{_id} endpoints
    allowCreate: true, //Omits POST /path endpoint
    allowUpdate: true, //Omits PUT /path/{_id} endpoint
    allowDelete: true, //Omits DELETE /path/{_id} endpoints
    allowDeleteMany: true, //Omits DELETE /path endpoints
    allowRecover: true, //Omits PATCH /path/{_id} endpoints
    allowRecoverMany: true, //Omits PATCH /path endpoints
  };

  for (const assoc of Object.values(model.associations)) {
    const { associationType, target } = assoc;
    if (associationType === "HasMany" || associationType === "BelongsToMany") {
      options[target.name] = {
        addAuth: true, //POST /owner/{ownerId}/child and PUT /owner/{ownerId}/child/{childId} endpoints
        removeAuth: true, //DELETE /owner/{ownerId}/child and DELETE /owner/{ownerId}/child/{childId} endpoints
        readAuth: true, //GET /owner/{ownerId}/child endpoint

        allowAdd: true, //omits POST /owner/{ownerId}/child and PUT /owner/{ownerId}/child/{childId} endpoints
        allowRemove: true, //omits DELETE /owner/{ownerId}/child/{childId} endpoints
        allowRemoveMany: true, //omits DELETE /owner/{ownerId}/child endpoints
        allowRead: true, //omits GET /owner/{ownerId}/child endpoint
      };
    }
  }
  // Merge any existing options fields with the generated options
  for (const key in routeOptions) {
    if (options[key]) {
      if (!_.isObject(options[key])) {
        options[key] = options[key];
      }
      if (_.isObject(options[key])) {
        options[key] = {
          ...options[key],
          ...routeOptions[key],
        };
      } else {
        options[key] = routeOptions[key];
      }
    } else {
      options[key] = routeOptions[key];
    }
  }

  model.routeOptions = options;

  return options;
};
