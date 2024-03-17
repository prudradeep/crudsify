"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const _ = require("lodash");
    const configStore = require("crudsify/config");
    const { PERMISSION_STATES } = require("crudsify/config/constants");
    const { ucfirst } = require("crudsify/utils");
    const { getTimestamps, getMetadata } = require("crudsify/helpers/model");
    await queryInterface.createTable("groups_permissions", {
      [`group${ucfirst(configStore.get("/dbPrimaryKey").name)}`]: {
        type: Sequelize[configStore.get("/dbPrimaryKey").type],
        primaryKey: true,
      },
      [`permission${ucfirst(configStore.get("/dbPrimaryKey").name)}`]: {
        type: Sequelize[configStore.get("/dbPrimaryKey").type],
        primaryKey: true,
      },
      state: {
        type: Sequelize.ENUM(_.values(PERMISSION_STATES)),
        allowNull: false,
        defaultValue: PERMISSION_STATES.INCLUDED,
      },
      ...getTimestamps(Sequelize),
      ...getMetadata(Sequelize),
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("groups_permissions");
  },
};
