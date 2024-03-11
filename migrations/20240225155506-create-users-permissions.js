"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const _ = require("lodash");
    const configStore = require("../config");
    const { PERMISSION_STATES } = require("../config/constants");
    const { ucfirst } = require("../utils");
    const { getTimestamps, getMetadata } = require("../helpers/model");
    await queryInterface.createTable("users_permissions", {
      [`user${ucfirst(configStore.get("/dbPrimaryKey").name)}`]: {
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
    await queryInterface.dropTable("users_permissions");
  },
};
