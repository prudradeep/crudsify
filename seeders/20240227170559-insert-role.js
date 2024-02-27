"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const configStore = require("../config");
    const USER_ROLES = configStore.get("/constants/USER_ROLES");
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
    await queryInterface.bulkInsert("roles", roles);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("roles", null, {});
  },
};
