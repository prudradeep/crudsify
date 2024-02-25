"use strict";
const { Model } = require("sequelize");
const _ = require("lodash");
const { getTimestamps, getMetadata } = require("../helpers/model");
module.exports = (sequelize, DataTypes) => {
  class users_groups extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  users_groups.init(
    {
      ..._.cloneDeep(getTimestamps(DataTypes)),
      ..._.cloneDeep(getMetadata(DataTypes)),
    },
    {
      sequelize,
      modelName: "users_groups",
    }
  );
  return users_groups;
};
