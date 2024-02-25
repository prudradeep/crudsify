"use strict";
const { Model } = require("sequelize");
const _ = require("lodash");
const { getTimestamps, getMetadata } = require("../helpers/model");
const configStore = require("../config");
const PERMISSION_STATES = configStore.get("/constants/PERMISSION_STATES");
module.exports = (sequelize, DataTypes) => {
  class users_permissions extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  users_permissions.init(
    {
      state: {
        type: DataTypes.ENUM(_.values(PERMISSION_STATES)),
        allowNull: false,
        defaultValue: PERMISSION_STATES.INCLUDED,
      },
      ..._.cloneDeep(getTimestamps(DataTypes)),
      ..._.cloneDeep(getMetadata(DataTypes)),
    },
    {
      sequelize,
      modelName: "users_permissions",
    }
  );
  return users_permissions;
};
