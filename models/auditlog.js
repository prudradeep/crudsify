"use strict";
const { Model } = require("sequelize");
const _ = require("lodash");
const configStore = require("../config");
const {
  getPrimaryKey,
  getTimestamps,
  getMetadata,
} = require("../helpers/model");
module.exports = (sequelize, DataTypes) => {
  class auditLog extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  auditLog.init(
    {
      ..._.cloneDeep(getPrimaryKey(DataTypes)),
      expires: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: configStore.get("/auditLogTTL"),
      },
      method: DataTypes.STRING,
      action: DataTypes.STRING,
      endpoint: DataTypes.STRING,
      user: DataTypes.BIGINT,
      collectionName: DataTypes.STRING,
      childCollectionName: DataTypes.STRING,
      associationType: DataTypes.STRING,
      documents: DataTypes.JSON,
      payload: DataTypes.JSON,
      params: DataTypes.JSON,
      result: DataTypes.JSON,
      statusCode: DataTypes.INTEGER,
      responseMessage: DataTypes.STRING,
      isError: DataTypes.BOOLEAN,
      ipAddress: DataTypes.STRING,
      notes: DataTypes.STRING,
      ..._.cloneDeep(getTimestamps(DataTypes)),
      ..._.cloneDeep(getMetadata(DataTypes)),
    },
    {
      sequelize,
      modelName: "auditLog",
    }
  );

  auditLog.routeOptions = {
    allowCreate: false,
    allowDelete: false,
    allowDeleteMany: false,
    allowUpdate: false,
  };

  return auditLog;
};
