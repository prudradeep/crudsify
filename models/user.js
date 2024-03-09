"use strict";
const { Model, Op } = require("sequelize");
const _ = require("lodash");
const Bcrypt = require("bcryptjs");
const GeneratePassword = require("password-generator");
const configStore = require("../config");
const {
  getPrimaryKey,
  getTimestamps,
  getMetadata,
  getRecordScopes,
} = require("../helpers/model");
const { ucfirst, generateHash } = require("../utils");
const { rankAuth, promoteAuth } = require("../policies/role-auth");
const { permissionAuth } = require("../policies/permission-auth");
const { groupAuth } = require("../policies/group-auth");
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

    static async findByCredentials(mobile_email, password) {
      try {
        const query = {
          where: {
            [Op.or]: [
              {
                mobile: mobile_email,
              },
              {
                email: mobile_email,
              },
            ],
          },
          include: [
            { model: sequelize.models.role },
            { model: sequelize.models.city },
          ],
        };

        let user = await this.unscoped().findOne(query);

        if (!user) {
          return false;
        }

        const source = user.password;

        let passwordMatch = await Bcrypt.compare(password, source);
        if (passwordMatch) {
          return user;
        } else {
          return false;
        }
      } catch (err) {
        throw err;
      }
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
      ..._.cloneDeep(getRecordScopes(DataTypes)),
      ..._.cloneDeep(getTimestamps(DataTypes)),
      ..._.cloneDeep(getMetadata(DataTypes)),
    },
    {
      sequelize,
      modelName: "user",
      defaultScope: {
        attributes: {
          exclude: ["password", "resetPasswordHash"],
        },
      },
    }
  );

  user.beforeCreate((request, options) => {
    try {
      if (!request.password) request.password = GeneratePassword(10, false);
      request.password = generateHash(request.password).hash;
    } catch (err) {
      throw err;
    }
  });

  user.beforeBulkCreate((requests, options) => {
    requests.forEach((request) => {
      try {
        if (!request.password) request.password = GeneratePassword(10, false);
        request.password = generateHash(request.password).hash;
      } catch (err) {
        throw err;
      }
    });
  });

  user.policies = {
    pre: {
      update: [
        rankAuth(sequelize, configStore.get("/dbPrimaryKey")),
        promoteAuth(sequelize),
      ],
      delete: [rankAuth(sequelize, configStore.get("/dbPrimaryKey"))],
      associate: [
        rankAuth(sequelize, "ownerId"),
        permissionAuth(sequelize, false),
        groupAuth(sequelize, false),
      ],
    },
  };

  return user;
};
