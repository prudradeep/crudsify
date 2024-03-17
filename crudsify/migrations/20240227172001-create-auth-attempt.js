"use strict";

const { ucfirst } = require("crudsify/utils");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const configStore = require("crudsify/config");
    const { ucfirst } = require("crudsify/utils");
    const {
      getPrimaryKey,
      getTimestamps,
      getMetadata,
    } = require("crudsify/helpers/model");
    await queryInterface.createTable("authAttempts", {
      ...getPrimaryKey(Sequelize),
      mobileEmail: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      ip: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      time: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      ...getTimestamps(Sequelize),
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("authAttempts");
  },
};
