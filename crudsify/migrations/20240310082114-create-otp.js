'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const {
      getPrimaryKey,
      getTimestamps,
    } = require("crudsify/helpers/model");
    await queryInterface.createTable('otps', {
      ...getPrimaryKey(Sequelize),
      mobileEmail: {
        type: Sequelize.STRING
      },
      otpHash: {
        type: Sequelize.STRING
      },
      ...getTimestamps(Sequelize),
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('otps');
  }
};