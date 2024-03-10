"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const {
      getPrimaryKey,
      getTimestamps,
      getMetadata,
      getRecordScopes,
    } = require("../helpers/model");
    await queryInterface.createTable("roles", {
      ...getPrimaryKey(Sequelize),
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      rank: {
        type: Sequelize.BIGINT,
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      ...getRecordScopes(Sequelize),
      ...getTimestamps(Sequelize),
      ...getMetadata(Sequelize),
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("roles");
  },
};
