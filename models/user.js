"use strict";
const { Model, Op } = require("sequelize");
const _ = require("lodash");
const Bcrypt = require("bcryptjs");
const GeneratePassword = require("password-generator");
const Joi = require("joi");
const zxcvbn = require("zxcvbn");
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
const { updateHandler } = require("../handlers/create");
const { sendResponse } = require("../helpers/sendResponse");
const { generateEndpoint } = require("../endpoints/generate");
const { findHandler } = require("../handlers/list");
const { deleteHandler } = require("../handlers/remove");
const USER_ROLES = require("../config/constants").USER_ROLES;
const { REQUIRED_PASSWORD_STRENGTH } = require("../config/constants");
const authStrategy = configStore.get("/authStrategy");
const param = Joi.object({
  id: Joi.number().required(),
});

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
          include: [{ model: sequelize.models.role }],
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
        rankAuth(sequelize, configStore.get("/dbPrimaryKey").name),
        promoteAuth(sequelize),
      ],
      delete: [rankAuth(sequelize, configStore.get("/dbPrimaryKey").name)],
      associate: [
        rankAuth(sequelize, "ownerId"),
        permissionAuth(sequelize, false),
        groupAuth(sequelize, false),
      ],
    },
  };

  user.extraEndpoints = [];
  if (authStrategy) {
    user.extraEndpoints = [
      () => {
        const updateCurrentUserProfileHandler = async function (
          req,
          res,
          next
        ) {
          try {
            await updateHandler(user, {
              params: {
                id: req.auth.credentials.user[
                  configStore.get("/dbPrimaryKey").name
                ],
              },
              body: req.body.profile,
            });
            sendResponse({ status: 204, res, next });
          } catch (err) {
            next(err);
          }
        };

        generateEndpoint({
          method: "put",
          path: `/user/my/profile`,
          summary: "Update current user profile.",
          tags: ["user"],
          validate: {
            body: Joi.object({
              profile: {
                name: Joi.string().messages({
                  "string.empty": "Name can't be empty",
                }),
              },
            }),
          },
          scope: _.values(USER_ROLES),
          auth: authStrategy,
          handler: updateCurrentUserProfileHandler,
          log: `Generating Update Current User Profile endpoint for user.`,
        });
      },
      () => {
        const getCurrentUserHandler = async function (req, res, next) {
          try {
            const user = await findHandler(sequelize, user, {
              params: {
                id: req.auth.credentials.user[
                  configStore.get("/dbPrimaryKey").name
                ],
              },
              query: {
                $embed: ["role"],
              },
            });
            sendResponse({ data: user, status: 200, res, next });
          } catch (err) {
            next(err);
          }
        };

        generateEndpoint({
          method: "get",
          path: `/user/my/profile`,
          summary: "Get current user account.",
          tags: ["user"],
          scope: _.values(USER_ROLES),
          auth: authStrategy,
          handler: getCurrentUserHandler,
          log: `Generating Get Current User endpoint for user.`,
        });
      },
      () => {
        const deleteCurrentUserHandler = async function (req, res, next) {
          try {
            await deleteHandler(user, {
              params: {
                id: req.auth.credentials.user[
                  configStore.get("/dbPrimaryKey").name
                ],
              },
            });
            sendResponse({ status: 204, res, next });
          } catch (err) {
            next(err);
          }
        };

        generateEndpoint({
          method: "delete",
          path: `/user/my`,
          summary: "Delete current user account.",
          tags: ["user"],
          scope: _.values(USER_ROLES),
          auth: authStrategy,
          handler: deleteCurrentUserHandler,
          log: `Generating Delete Current User endpoint for user.`,
        });
      },
      () => {
        const updateCurrentUserPasswordMiddleware = {
          checkOldPassword: async function (req, res, next) {
            const query = {
              where: {
                id: req.auth.credentials.user[
                  configStore.get("/dbPrimaryKey").name
                ],
              },
            };
            const User = await user.unscoped().findOne(query);
            if (!User) {
              throw Boom.badRequest("Invalid request.");
            }
            const passwordMatch = await Bcrypt.compare(
              req.body.password,
              user.password
            );
            if (!passwordMatch) throw Boom.unauthorized("User not authorised.");
            next();
          },
          passwordCheck: async function (req, res, next) {
            try {
              const results = zxcvbn(req.body.password);

              let requiredPasswordStrength = 4;

              switch (req.auth.credentials.user.roleName) {
                case USER_ROLES.USER:
                  requiredPasswordStrength = REQUIRED_PASSWORD_STRENGTH.USER;
                  break;
                case USER_ROLES.ADMIN:
                  requiredPasswordStrength = REQUIRED_PASSWORD_STRENGTH.ADMIN;
                  break;
                case USER_ROLES.SUPER_ADMIN:
                  requiredPasswordStrength =
                    REQUIRED_PASSWORD_STRENGTH.SUPER_ADMIN;
                  break;
              }

              if (results.score < requiredPasswordStrength) {
                const err = Boom.badRequest("Stronger password required.");
                err.output.payload.data = results.feedback.suggestions;
                res
                  .status(err.output.payload.statusCode)
                  .send(err.output.payload);
              } else next();
            } catch (err) {
              next(err);
            }
          },
          password: async function (req, res, next) {
            try {
              let hashedPassword = generateHash(req.body.password);
              req.password = hashedPassword;
              next();
            } catch (err) {
              next(err);
            }
          },
        };

        const updateCurrentUserPasswordHandler = async function (
          req,
          res,
          next
        ) {
          try {
            await updateHandler(User, {
              params: {
                id: req.auth.credentials.user[
                  configStore.get("/dbPrimaryKey").name
                ],
              },
              body: {
                password: req.password.hash,
                passwordUpdateRequired: false,
              },
            });
            sendResponse({ status: 204, res, next });
          } catch (err) {
            next(err);
          }
        };

        generateEndpoint({
          method: "put",
          path: `/user/my/password`,
          summary: "Update current user password.",
          tags: ["user"],
          validate: {
            body: Joi.object({
              oldPassword: Joi.string().required().messages({
                "any.required": "Current password is required",
                "string.empty": "Current password can't be empty",
              }),
              password: Joi.string().required().messages({
                "any.required": "Password is required",
                "string.empty": "Password can't be empty",
              }),
              confirmPassword: Joi.any()
                .equal(Joi.ref("password"))
                .required()
                .messages({
                  "any.required": "Confirm password is required",
                  "string.empty": "Confirm password can't be empty",
                  "any.only": "Password does not match",
                }),
            }),
          },
          scope: _.values(USER_ROLES),
          auth: authStrategy,
          middlewares: Object.values(updateCurrentUserPasswordMiddleware),
          handler: updateCurrentUserPasswordHandler,
          log: `Generating Update Current User Password endpoint for user.`,
        });
      },
    ];
  }
  user.extraEndpoints = [
    ...user.extraEndpoints,
    () => {
      const activateAccountHandler = async function (req, res, next) {
        try {
          await updateHandler(User, {
            params: { id: req.params.id },
            body: { status: true },
          });
          sendResponse({ status: 204, res, next });
        } catch (err) {
          next(err);
        }
      };

      generateEndpoint({
        method: "put",
        path: `/user/:id/activate`,
        summary: "Activate user account.",
        tags: ["user"],
        validate: {
          param,
        },
        scope: ["root", "activateUser", "!-activateUser"],
        auth: authStrategy,
        middlewares: [rankAuth(sequelize, "id")],
        handler: activateAccountHandler,
        log: `Generating Activate Account endpoint for user.`,
      });
    },
    () => {
      const deactivateAccountHandler = async function (req, res, next) {
        try {
          await updateHandler(User, {
            params: { id: req.params.id },
            body: { status: false },
          });
          sendResponse({ status: 204, res, next });
        } catch (err) {
          next(err);
        }
      };

      generateEndpoint({
        method: "put",
        path: `/user/:id/deactivate`,
        summary: "Deactivate user account.",
        tags: ["user"],
        validate: {
          param,
        },
        scope: ["root", "deactivateUser", "!-deactivateUser"],
        auth: authStrategy,
        middlewares: [rankAuth(sequelize, "id")],
        handler: deactivateAccountHandler,
        log: `Generating deactivate Account endpoint for user.`,
      });
    },
    () => {
      const getUserScopeHandler = async function (req, res, next) {
        try {
          const query = {
            where: {
              [configStore.get("/dbPrimaryKey").name]: req.params.id,
            },
            include: [{ model: sequelize.role }],
          };

          let User = await this.findOne(query);
          const scopes = await sequelize.permission.getScope(User);
          res.data = scopes;
          sendResponse({ data: scopes, status: 200, res, next });
        } catch (err) {
          next(err);
        }
      };

      generateEndpoint({
        method: "get",
        path: `/user/:id/scope`,
        summary: "Get user effective permissions.",
        tags: ["user"],
        validate: {
          param,
        },
        scope: ["root", "readUserScope", "!-readUserScope"],
        auth: authStrategy,
        handler: getUserScopeHandler,
        log: `Generating Get User effective permissions endpoint.`,
      });
    },
  ];

  return user;
};
