"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { USER_ROLES } = require("crudsify/config/constants");
    const { role } = require("crudsify/models");
    const roles = [
      {
        name: USER_ROLES.SUPER_ADMIN,
        rank: 0,
        description: "A user with full permissions.",
      },
      {
        name: USER_ROLES.ADMIN,
        rank: 1,
        description: "A user with advanced permissions.",
      },
      {
        name: USER_ROLES.USER,
        rank: 2,
        description: "A standard user account.",
      },
    ];
    await role.bulkCreate(roles);
    console.table(roles);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("roles", null, {});
  },
};
