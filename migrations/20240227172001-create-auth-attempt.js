"use strict";

const { ucfirst } = require("../utils");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const configStore = require("../config");
    const { ucfirst } = require("../utils");
    const {
      getPrimaryKey,
      getTimestamps,
      getMetadata,
    } = require("../helpers/model");
    await queryInterface.createTable("authAttempts", {
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
      ...getMetadata(Sequelize),
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("authAttempts");
  },
};
