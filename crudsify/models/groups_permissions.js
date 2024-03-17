"use strict";
const { Model } = require("sequelize");
const _ = require("lodash");
const { getTimestamps, getMetadata } = require("crudsify/helpers/model");
const { PERMISSION_STATES } = require("crudsify/config/constants");
module.exports = (sequelize, DataTypes) => {
  class groups_permissions extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  groups_permissions.init(
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
      modelName: "groups_permissions",
    }
  );
  return groups_permissions;
};
