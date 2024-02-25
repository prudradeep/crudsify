"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const configStore = require("../config");
    const { ucfirst } = require("../utils");
    const { getTimestamps, getMetadata } = require("../helpers/model");
    await queryInterface.createTable("users_groups", {
      [`user${ucfirst(configStore.get("/dbPrimaryKey").name)}`]: {
        type: Sequelize[configStore.get("/dbPrimaryKey").type],
        primaryKey: true,
      },
      [`group${ucfirst(configStore.get("/dbPrimaryKey").name)}`]: {
        type: Sequelize[configStore.get("/dbPrimaryKey").type],
        primaryKey: true,
      },
      ...getTimestamps(Sequelize),
      ...getMetadata(Sequelize),
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("users_groups");
  },
};
