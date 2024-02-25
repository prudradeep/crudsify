"use strict";
const { Model } = require("sequelize");
const _ = require("lodash");
const configStore = require("../config");
const {
  getPrimaryKey,
  getTimestamps,
  getMetadata,
} = require("../helpers/model");
const { ucfirst } = require("../utils");
module.exports = (sequelize, DataTypes) => {
  class session extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  session.init(
    {
      ..._.cloneDeep(getPrimaryKey(DataTypes)),
      [`user${ucfirst(configStore.get("/dbPrimaryKey").name)}`]: {
        type: DataTypes[configStore.get("/dbPrimaryKey").type],
        allowNull: false,
        references: {
          model: "users",
          key: configStore.get("/dbPrimaryKey").name,
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      key: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      ..._.cloneDeep(getTimestamps(DataTypes)),
      ..._.cloneDeep(getMetadata(DataTypes)),
    },
    {
      sequelize,
      modelName: "session",
    }
  );

  session.routeOptions = {
    allowList: false,
    allowRead: false,
    allowCreate: false,
    allowUpdate: false,
    allowDelete: false
  }

  return session;
};
