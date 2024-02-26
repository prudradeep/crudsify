"use strict";
const { Model } = require("sequelize");
const _ = require("lodash");
const {
  getPrimaryKey,
  getTimestamps,
  getMetadata,
} = require("../helpers/model");
const { rankAuth } = require("../policies/role-auth");
const { permissionAuth } = require("../policies/permission-auth");
const { groupAuth } = require("../policies/group-auth");
module.exports = (sequelize, DataTypes) => {
  class group extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsToMany(models.permission, { through: "groups_permissions" });
      this.belongsToMany(models.user, { through: "users_groups" });
    }
  }
  group.init(
    {
      ..._.cloneDeep(getPrimaryKey(DataTypes)),
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      ..._.cloneDeep(getTimestamps(DataTypes)),
      ..._.cloneDeep(getMetadata(DataTypes)),
    },
    {
      sequelize,
      modelName: "group",
    }
  );

  group.policies = {
    associate: [
      rankAuth(sequelize, "child"),
      permissionAuth(sequelize, false),
      groupAuth(sequelize, true),
    ],
  };

  return group;
};
