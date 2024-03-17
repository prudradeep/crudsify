"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const configStore = require('crudsify/config')
    const USER_ROLES = configStore.get('/constants/USER_ROLES')
    const {
      getPrimaryKey,
      getTimestamps,
      getMetadata,
      getRecordScopes,
    } = require("crudsify/helpers/model");
    await queryInterface.createTable("permissions", {
      ...getPrimaryKey(Sequelize),
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      assignScope: {
        type: Sequelize.JSON,
        defaultValue: JSON.stringify([
          USER_ROLES.SUPER_ADMIN,
          USER_ROLES.ADMIN,
        ]),
        comment:
          "Specifies the scope required to be able to assign this permission to users.",
      },
      ...getRecordScopes(Sequelize),
      ...getTimestamps(Sequelize),
      ...getMetadata(Sequelize),
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("permissions");
  },
};
