"use strict";
const { Model } = require("sequelize");
const _ = require("lodash");
const md5 = require("md5");
const {
  getPrimaryKey,
  getTimestamps,
  getMetadata,
  getRecordScopes,
} = require("../helpers/model");
const configStore = require("../config");
const { rankAuth } = require("../policies/role-auth");
const { permissionAuth } = require("../policies/permission-auth");
const { listHandler } = require("../handlers/list");
const { sendResponse } = require("../helpers/sendResponse");
const { generateEndpoint } = require("../endpoints/generate");
const { generateJoiListQueryModel } = require("../helpers/joi");
const { USER_ROLES, PERMISSION_STATES } = require("../config/constants");

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

    /**
     * Gets the effective permissions for a user which are determined by the permissions hierarchy.
     * @param user
     * @returns {*|Promise|Promise.<TResult>}
     */
    static async getEffectivePermissions(user) {
      try {
        const User = sequelize.models.user;

        user = await User.findByPk(
          user[configStore.get("/dbPrimaryKey").name],
          {
            include: [
              {
                model: this,
              },
              {
                model: sequelize.models.role,
                include: [
                  {
                    model: sequelize.models.permission,
                    through: {
                      attributes: ["state"],
                    },
                  },
                ],
              },
              {
                model: sequelize.models.group,
                include: [
                  {
                    model: sequelize.models.permission,
                    through: {
                      attributes: ["state"],
                    },
                  },
                ],
              },
            ],
          }
        );

        // base permissions are set by the user's role
        const permissions = user.role.permissions;

        // group permissions override role permissions
        user.groups.forEach(function (group) {
          group.permissions.forEach(function (groupPermission) {
            let matchIndex = -1;
            permissions.find(function (permission, index) {
              if (
                permission[configStore.get("/dbPrimaryKey").name] ===
                groupPermission[configStore.get("/dbPrimaryKey").name]
              ) {
                matchIndex = index;
                return true;
              }
            });

            if (matchIndex > -1) {
              permissions[matchIndex] = groupPermission;
            } else {
              permissions.push(groupPermission);
            }
          });
        });

        // user permissions override group permissions
        user.permissions.forEach(function (userPermission) {
          let matchIndex = -1;
          permissions.find(function (permission, index) {
            if (
              permission[configStore.get("/dbPrimaryKey").name] ===
              userPermission[configStore.get("/dbPrimaryKey").name]
            ) {
              matchIndex = index;
              return true;
            }
          });

          if (matchIndex > -1) {
            permissions[matchIndex] = userPermission;
          } else {
            permissions.push(userPermission);
          }
        });
        return permissions;
      } catch (err) {
        throw err;
      }
    }

    /**
     * Gets scope specific to the user. By default this is just 'user-{userId}'.
     * @param user
     * @returns {*|Promise|Promise.<TResult>}
     */
    static async getSpecificScope(user) {
      try {
        const scope = [];
        scope.push("user-" + md5(user[configStore.get("/dbPrimaryKey").name]));
        return scope;
      } catch (err) {
        throw err;
      }
    }

    /**
     * Gets the scope for a user, which consists of their role name, group names, effective permissions, and
     * any permissions specific to the user.
     * @param user
     * @returns {*|Promise|Promise.<TResult>}
     */
    static async getScope(user) {
      try {
        const User = sequelize.models.user;
        const promises = [];

        promises.push(this.getEffectivePermissions(user));
        promises.push(
          User.findByPk(user[configStore.get("/dbPrimaryKey").name], {
            include: [
              {
                model: sequelize.models.role,
              },
              {
                model: sequelize.models.group,
              },
            ],
          })
        );
        promises.push(this.getSpecificScope(user));
        let result = await Promise.all(promises);
        const permissions = result[0];
        const role = result[1].role.name;
        const groups = [];
        result[1].groups.forEach(function (group) {
          groups.push(group.name);
        });

        let scope = [];
        scope.push(role);
        scope = scope.concat(groups);

        /**
         * The scope additions from permissions depends on the permission state as follows:
         * Included: the permission is included in the scope
         * Excluded: the permission is excluded from the scope
         * Forbidden: the permission is included with a '-' prefix
         */
        scope = scope.concat(
          permissions
            .map(function (permission) {
              const state = permission.roles_permissions
                ? permission.roles_permissions.dataValues.state
                : permission.groups_permissions.dataValues.state;
              switch (state) {
                case PERMISSION_STATES.INCLUDED:
                  return permission.name;
                case PERMISSION_STATES.EXCLUDED:
                  return;
                case PERMISSION_STATES.FORBIDDEN:
                  return "-" + permission.name;
              }
            })
            .filter(Boolean)
        );

        const specificPermissions = result[2];

        scope = scope.concat(specificPermissions);

        return scope;
      } catch (err) {
        throw err;
      }
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
      ..._.cloneDeep(getRecordScopes(DataTypes)),
      ..._.cloneDeep(getTimestamps(DataTypes)),
      ..._.cloneDeep(getMetadata(DataTypes)),
    },
    {
      sequelize,
      modelName: "permission",
    }
  );

  permission.policies = {
    pre: {
      associate: [
        rankAuth(sequelize, "child"),
        permissionAuth(sequelize, true),
      ],
    },
  };

  permission.extraEndpoints = [
    () => {
      const authStrategy = configStore.get("/authStrategy");
      const queryModel = generateJoiListQueryModel(permission);
      const getAvailablePermissionsHandler = async function (req, res, next) {
        try {
          if (req.auth) {
            const roleName = req.auth.credentials.user.role.name;
            if (req.query.assignScope) req.query.assignScope.push(roleName);
            else req.query.assignScope = [roleName];

            const data = await listHandler(DB, DB.permission, req);
            res.data = data;
            sendResponse({
              data,
              status: 200,
              res,
              next,
            });
          } else {
            sendResponse({
              data: { message: "Authentication disabled!" },
              status: 200,
              res,
              next,
            });
          }
        } catch (err) {
          next(err);
        }
      };

      generateEndpoint({
        method: "get",
        path: `/permission/available`,
        summary:
          "Get the permissions available for the current user to assign.",
        tags: ["permission"],
        validate: {
          query: queryModel,
        },
        scope: [
          "root",
          "readAvailablePermissions",
          "!-readAvailablePermissions",
        ],
        isJsonFields: true,
        model: permission,
        auth: authStrategy,
        handler: getAvailablePermissionsHandler,
        log: `Generating endpoint to get the permissions available for the current user to assign.`,
      });
    },
  ];

  return permission;
};
