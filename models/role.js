"use strict";
const { Model } = require("sequelize");
const _ = require("lodash");
const {
  getPrimaryKey,
  getTimestamps,
  getMetadata,
  getRecordScopes,
} = require("../helpers/model");
const { rankAuth } = require("../policies/role-auth");
const { permissionAuth } = require("../policies/permission-auth");
module.exports = (sequelize, DataTypes) => {
  class role extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.hasMany(models.user);
      this.belongsToMany(models.permission, { through: "roles_permissions" });
    }
  }
  role.init(
    {
      ..._.cloneDeep(getPrimaryKey(DataTypes)),
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      rank: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      ..._.cloneDeep(getRecordScopes(DataTypes)),
      ..._.cloneDeep(getTimestamps(DataTypes)),
      ..._.cloneDeep(getMetadata(DataTypes)),
    },
    {
      sequelize,
      modelName: "role",
    }
  );

  role.policies = {
    pre: {
      associate: [
        rankAuth(sequelize, "child"),
        permissionAuth(sequelize, false),
      ],
    },
  };

  return role;
};
