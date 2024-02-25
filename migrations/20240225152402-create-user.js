"use strict";

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
    await queryInterface.createTable("users", {
      ...getPrimaryKey(Sequelize),
      name: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      mobile: {
        allowNull: false,
        unique: true,
        type: Sequelize.BIGINT,
      },
      email: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
      },
      [`role${ucfirst(configStore.get("/dbPrimaryKey").name)}`]: {
        type: Sequelize[configStore.get("/dbPrimaryKey").type],
        allowNull: false,
        references: {
          model: "roles",
          key: configStore.get("/dbPrimaryKey").name,
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      passwordUpdateRequired: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      resetPasswordHash: {
        type: Sequelize.STRING,
      },
      ...getTimestamps(Sequelize),
      ...getMetadata(Sequelize),
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("users");
  },
};
