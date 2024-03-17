"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const superAdminAssignScope = require("crudsify/config/super-admin-assign-scopes");
    const { USER_ROLES } = require("crudsify/config/constants");
    const DB = require("crudsify/models");

    let permissions = [
      {
        name: "root",
        description: "Access to all endpoints",
        assignScope: JSON.stringify([USER_ROLES.SUPER_ADMIN]),
      },
      {
        name: "create",
        description: "Access to all create endpoints",
        assignScope: JSON.stringify([USER_ROLES.SUPER_ADMIN]),
      },
      {
        name: "read",
        description: "Access to all read endpoints",
        assignScope: JSON.stringify([USER_ROLES.SUPER_ADMIN]),
      },
      {
        name: "update",
        description: "Access to all update endpoints",
        assignScope: JSON.stringify([USER_ROLES.SUPER_ADMIN]),
      },
      {
        name: "delete",
        description: "Access to all delete endpoints",
        assignScope: JSON.stringify([USER_ROLES.SUPER_ADMIN]),
      },
      {
        name: "associate",
        description: "Access to all association endpoints",
        assignScope: JSON.stringify([USER_ROLES.SUPER_ADMIN]),
      },
      {
        name: "activateUser",
        description: "Can activate a user's account",
        assignScope: JSON.stringify([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]),
      },
      {
        name: "deactivateUser",
        description: "Can deactivateUser a user's account",
        assignScope: JSON.stringify([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]),
      },
      {
        name: "readUserScope",
        description: "Can read a user's scope",
        assignScope: JSON.stringify([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]),
      },
      {
        name: "readAvailablePermissions",
        description: "Can read a user's available permissions",
        assignScope: JSON.stringify([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]),
      },
    ];

    for (const modelKey in DB.sequelize.models) {
      if (modelKey.indexOf("_") === -1) {
        const modelName =
          modelKey[0].toUpperCase() + modelKey.slice(1).toLowerCase();
        let name = "";
        let assignScope;

        permissions.push({
          name: modelKey,
          description: "Full access to " + modelKey + " endpoints",
          assignScope: JSON.stringify([USER_ROLES.SUPER_ADMIN]),
        });
        permissions.push({
          name: "associate" + modelName,
          description: "Can access all association endpoints for a " + modelKey,
          assignScope: JSON.stringify([USER_ROLES.SUPER_ADMIN]),
        });
        permissions.push({
          name: "add" + modelName + "Associations",
          description: "Can add all associations for a " + modelKey,
          assignScope: JSON.stringify([USER_ROLES.SUPER_ADMIN]),
        });
        permissions.push({
          name: "remove" + modelName + "Associations",
          description: "Can remove all associations for a " + modelKey,
          assignScope: JSON.stringify([USER_ROLES.SUPER_ADMIN]),
        });
        permissions.push({
          name: "get" + modelName + "Associations",
          description: "Can get all associations for a " + modelKey,
          assignScope: JSON.stringify([USER_ROLES.SUPER_ADMIN]),
        });

        name = "create" + modelName;
        assignScope =
          superAdminAssignScope.indexOf(name) > -1
            ? JSON.stringify([USER_ROLES.SUPER_ADMIN])
            : JSON.stringify([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]);
        permissions.push({
          name: name,
          description: "Can create a " + modelKey,
          assignScope,
        });

        name = "read" + modelName;
        assignScope =
          superAdminAssignScope.indexOf(name) > -1
            ? JSON.stringify([USER_ROLES.SUPER_ADMIN])
            : JSON.stringify([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]);
        permissions.push({
          name: "read" + modelName,
          description: "Can read a " + modelKey,
          assignScope,
        });

        name = "update" + modelName;
        assignScope =
          superAdminAssignScope.indexOf(name) > -1
            ? JSON.stringify([USER_ROLES.SUPER_ADMIN])
            : JSON.stringify([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]);
        permissions.push({
          name: "update" + modelName,
          description: "Can update a " + modelKey,
          assignScope,
        });

        name = "delete" + modelName;
        assignScope =
          superAdminAssignScope.indexOf(name) > -1
            ? JSON.stringify([USER_ROLES.SUPER_ADMIN])
            : JSON.stringify([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]);
        permissions.push({
          name: "delete" + modelName,
          description: "Can delete a " + modelKey,
          assignScope,
        });

        //associations
        for (const [, assoc] of Object.entries(DB[modelKey].associations)) {
          const { associationType, target, associationAccessor } = assoc;

          if (
            associationType === "HasMany" ||
            associationType === "BelongsToMany"
          ) {
            const associationName =
              target.name[0].toUpperCase() + target.name.slice(1).toLowerCase();

            name = "add" + modelName + associationName;
            assignScope =
              superAdminAssignScope.indexOf(name) > -1
                ? JSON.stringify([USER_ROLES.SUPER_ADMIN])
                : JSON.stringify([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]);
            permissions.push({
              name: "add" + modelName + associationName,
              description: "Can add " + target.name + " to a " + modelKey,
              assignScope,
            });

            name = "remove" + modelName + associationName;
            assignScope =
              superAdminAssignScope.indexOf(name) > -1
                ? JSON.stringify([USER_ROLES.SUPER_ADMIN])
                : JSON.stringify([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]);
            permissions.push({
              name: "remove" + modelName + associationName,
              description: "Can remove " + target.name + " from a " + modelKey,
              assignScope,
            });

            name = "get" + modelName + associationName;
            assignScope =
              superAdminAssignScope.indexOf(name) > -1
                ? JSON.stringify([USER_ROLES.SUPER_ADMIN])
                : JSON.stringify([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]);
            permissions.push({
              name: "get" + modelName + associationName,
              description: "Can get a " + modelKey + "'s " + target.name,
              assignScope,
            });
          }
        }
      }
    }
    await queryInterface.bulkInsert("permissions", permissions, {
      ignoreDuplicates: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("permissions", null, {});
  },
};
