"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const configStore = require("../config");
    const { ucfirst } = require("../utils");
    const { user, group } = require("../models");
    const groups = await group.findAll();
    const users = await user.findAll();
    await queryInterface.bulkInsert("users_groups", [
      {
        [`user${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
          users[1][configStore.get("/dbPrimaryKey").name],
        [`group${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
          groups[0][configStore.get("/dbPrimaryKey").name],
      },
      {
        [`user${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
          users[3][configStore.get("/dbPrimaryKey").name],
        [`group${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
          groups[0][configStore.get("/dbPrimaryKey").name],
      },
      {
        [`user${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
          users[4][configStore.get("/dbPrimaryKey").name],
        [`group${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
          groups[1][configStore.get("/dbPrimaryKey").name],
      },
      {
        [`user${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
          users[5][configStore.get("/dbPrimaryKey").name],
        [`group${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
          groups[2][configStore.get("/dbPrimaryKey").name],
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("users_groups", null, {});
  },
};
