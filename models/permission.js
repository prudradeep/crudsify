"use strict";
const { Model } = require("sequelize");
const _ = require("lodash");
const {
  getPrimaryKey,
  getTimestamps,
  getMetadata,
} = require("../helpers/model");
const configStore = require("../config");
const USER_ROLES = configStore.get("/constants/USER_ROLES");
module.exports = (sequelize, DataTypes) => {
  class permission extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsToMany(models.user, { through: "users_permissions" });
      this.belongsToMany(models.role, { through: "roles_permissions" });
      this.belongsToMany(models.group, { through: "groups_permissions" });
    }
  }
  permission.init(
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
      assignScope: {
        type: DataTypes.JSON,
        jsonType: DataTypes.STRING,
        defaultValue: JSON.stringify([
          USER_ROLES.SUPER_ADMIN,
          USER_ROLES.ADMIN,
        ]),
        comment:
          "Specifies the scope required to be able to assign this permission to users.",
      },
      ..._.cloneDeep(getTimestamps(DataTypes)),
      ..._.cloneDeep(getMetadata(DataTypes)),
    },
    {
      sequelize,
      modelName: "permission",
    }
  );
  return permission;
};
