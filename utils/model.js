"use strict";

const Sequelize = require("sequelize");
const configStore = require("../config");

exports.getPrimaryKey = (DataTypes) => {
  return {
    [configStore.get("/dbPrimaryKey").name]: {
      allowNull: false,
      autoIncrement: configStore.get("/dbPrimaryKey").autoIncrement,
      primaryKey: true,
      type: DataTypes[configStore.get("/dbPrimaryKey").type],
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

    if (configStore.get('/enableCreatedBy') && configStore.get('/authStrategy')) {
        metadata.createdBy = {
            type: DataTypes[configStore.get("/dbPrimaryKey").type],
        }
    }
    if (configStore.get('/enableUpdatedBy') && configStore.get('/authStrategy')) {
        metadata.updatedBy = {
            type: DataTypes[configStore.get("/dbPrimaryKey").type]
        }
    }
    if (configStore.get('/enableDeletedBy') && configStore.get('/modelOptions').paranoid && configStore.get('/authStrategy')) {
        metadata.deletedBy = {
            type: DataTypes[configStore.get("/dbPrimaryKey").type]
        }
    }
    return metadata;
};
