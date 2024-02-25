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
  class user extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.role);
      this.belongsToMany(models.permission, { through: "users_permissions" });
      this.belongsToMany(models.group, { through: "users_groups" });
    }
  }
  user.init(
    {
      ..._.cloneDeep(getPrimaryKey(DataTypes)),
      name: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      mobile: {
        allowNull: false,
        unique: true,
        type: DataTypes.BIGINT,
      },
      email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      [`role${ucfirst(configStore.get("/dbPrimaryKey").name)}`]: {
        type: DataTypes[configStore.get("/dbPrimaryKey").type],
        allowNull: false,
        references: {
          model: "roles",
          key: configStore.get("/dbPrimaryKey").name,
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      passwordUpdateRequired: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      resetPasswordHash: {
        type: DataTypes.STRING,
      },
      ..._.cloneDeep(getTimestamps(DataTypes)),
      ..._.cloneDeep(getMetadata(DataTypes)),
    },
    {
      sequelize,
      modelName: "user",
    }
  );
  return user;
};
