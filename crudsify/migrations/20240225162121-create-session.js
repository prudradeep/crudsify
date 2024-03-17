"use strict";
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
    await queryInterface.createTable("sessions", {
      ...getPrimaryKey(Sequelize),
      [`user${ucfirst(configStore.get("/dbPrimaryKey").name)}`]: {
        type: Sequelize[configStore.get("/dbPrimaryKey").type],
        allowNull: false,
        references: {
          model: "users",
          key: configStore.get("/dbPrimaryKey").name,
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      key: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      passwordHash: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      ...getTimestamps(Sequelize),
      ...getMetadata(Sequelize),
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("sessions");
  },
};
