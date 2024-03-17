'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const {
      getPrimaryKey,
      getTimestamps,
      getMetadata,
      getRecordScopes,
    } = require("crudsify/helpers/model");
    await queryInterface.createTable('groups', {
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
      ...getRecordScopes(Sequelize),
      ...getTimestamps(Sequelize),
      ...getMetadata(Sequelize),
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('groups');
  }
};