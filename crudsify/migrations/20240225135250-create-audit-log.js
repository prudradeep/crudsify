"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const _ = require("lodash");
    const configStore = require("crudsify/config");
    const {
      getPrimaryKey,
      getTimestamps,
    } = require("crudsify/helpers/model");
    await queryInterface.createTable("auditLogs", {
      ...getPrimaryKey(Sequelize),
      expires: {
        type: Sequelize.STRING,
        defaultValue: configStore.get("/auditLogTTL"),
      },
      method: {
        type: Sequelize.ENUM(_.values(["POST", "PUT", "DELETE", "GET"])),
      },
      action: {
        type: Sequelize.STRING,
      },
      endpoint: {
        type: Sequelize.STRING,
      },
      user: {
        type: Sequelize.BIGINT,
      },
      tableName: {
        type: Sequelize.STRING,
      },
      childTableName: {
        type: Sequelize.STRING,
      },
      associationType: {
        type: Sequelize.ENUM(
          _.values(["HasMany", "BelongsToMany", "HasOne", "BelongsTo"])
        ),
      },
      records: {
        type: Sequelize.JSON,
      },
      payload: {
        type: Sequelize.JSON,
      },
      params: {
        type: Sequelize.JSON,
      },
      result: {
        type: Sequelize.JSON,
      },
      statusCode: {
        type: Sequelize.INTEGER,
      },
      responseMessage: {
        type: Sequelize.STRING,
      },
      isError: {
        type: Sequelize.BOOLEAN,
      },
      ipAddress: {
        type: Sequelize.STRING,
      },
      notes: {
        type: Sequelize.STRING,
      },
      ...getTimestamps(Sequelize),
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("auditLogs");
  },
};
