"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const configStore = require("../config");
    const { ucfirst } = require("../utils");
    const { permission, role, group } = require("../models");
    const PERMISSION_STATES = configStore.get("/constants/PERMISSION_STATES");
    const USER_ROLES = configStore.get("/constants/USER_ROLES");
    const permissions = await permission.findAll();
    const roles = await role.findAll();
    const groups = await group.findAll();
    const permissionNames = permissions.map(function (p) {
      return p.name;
    });

    // initial User role permissions
    const userBasePermissionNames = [];

    let userPermissions = userBasePermissionNames.map(function (
      permissionName
    ) {
      return {
        state: PERMISSION_STATES.INCLUDED,
        [`permission${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
          permissions.find(function (p) {
            return p.name === permissionName;
          })[configStore.get("/dbPrimaryKey").name],
        [`role${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
          roles[2][configStore.get("/dbPrimaryKey").name],
      };
    });
    if (userPermissions.length >= 1)
      await queryInterface.bulkInsert("roles_permissions", userPermissions, {
        ignoreDuplicates: true,
      });

    // Admins have access to any permission they can assign.
    const adminPermissions = permissions
      .filter(function (p) {
        //let aS = JSON.parse(p.assignScope)
        return p.assignScope.indexOf(USER_ROLES.ADMIN) > -1;
      })
      .map(function (p) {
        return {
          state: PERMISSION_STATES.INCLUDED,
          [`permission${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
            p[configStore.get("/dbPrimaryKey").name],
          [`role${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
            roles[1][configStore.get("/dbPrimaryKey").name],
        };
      });
    await queryInterface.bulkInsert("roles_permissions", adminPermissions, {
      ignoreDuplicates: true,
    });

    // Initial Super Admin role permissions
    await queryInterface.bulkInsert(
      "roles_permissions",
      [
        {
          state: PERMISSION_STATES.INCLUDED,
          [`permission${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
            permissions.find(function (p) {
              return p.name === "root";
            })[configStore.get("/dbPrimaryKey").name],
          [`role${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
            roles[0][configStore.get("/dbPrimaryKey").name],
        },
      ],
      {
        ignoreDuplicates: true,
      }
    );

    // Read Only group permissions
    const readOnlyExcludedPermissions = permissions
      .filter(function (p) {
        // We start with permissions Admins can assign so that they will also be able to assign the group
        return p.assignScope.indexOf(USER_ROLES.ADMIN) > -1;
      })
      .filter(function (p) {
        return !(p.name.includes("read") || p.name.includes("get"));
      })
      .map(function (p) {
        return {
          state: PERMISSION_STATES.EXCLUDED,
          [`permission${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
            p[configStore.get("/dbPrimaryKey").name],
          [`group${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
            groups[0][configStore.get("/dbPrimaryKey").name],
        };
      });
    await queryInterface.bulkInsert(
      "groups_permissions",
      readOnlyExcludedPermissions,
      {
        ignoreDuplicates: true,
      }
    );

    // Editor group permissions
    let createForbiddenPermission = permissions
      .filter(function (p) {
        // We start with permissions Admins can assign so that they will also be able to assign the group
        return p.assignScope.indexOf(USER_ROLES.ADMIN) > -1;
      })
      .filter(function (p) {
        return p.name.includes("create");
      })
      .map(function (p) {
        return {
          state: PERMISSION_STATES.FORBIDDEN,
          [`permission${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
            p[configStore.get("/dbPrimaryKey").name],
          [`group${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
            groups[1][configStore.get("/dbPrimaryKey").name],
        };
      });
    await queryInterface.bulkInsert(
      "groups_permissions",
      createForbiddenPermission,
      {
        ignoreDuplicates: true,
      }
    );

    // Super User group permissions
    let includedPermissions = permissionNames
      .filter(function (permissionName) {
        return permissionName !== "root";
      })
      .map(function (permissionName) {
        return {
          state: PERMISSION_STATES.INCLUDED,
          [`permission${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
            permissions.find(function (p) {
              return p.name === permissionName;
            })[configStore.get("/dbPrimaryKey").name],
          [`group${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
            groups[2][configStore.get("/dbPrimaryKey").name],
        };
      });
    await queryInterface.bulkInsert("groups_permissions", includedPermissions, {
      ignoreDuplicates: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("roles_permissions", null, {});
    await queryInterface.bulkDelete("groups_permissions", null, {});
  },
};
