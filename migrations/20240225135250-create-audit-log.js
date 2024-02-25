"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const _ = require("lodash");
    const configStore = require("../config");
    const {
      getPrimaryKey,
      getTimestamps,
      getMetadata,
    } = require("../helpers/model");
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
      collectionName: {
        type: Sequelize.STRING,
      },
      childCollectionName: {
        type: Sequelize.STRING,
      },
      associationType: {
        type: Sequelize.ENUM(
          _.values(["HasMany", "BelongsToMany", "HasOne", "BelongsTo"])
        ),
      },
      documents: {
        type: Sequelize.TEXT("long"),
      },
      payload: {
        type: Sequelize.TEXT("long"),
      },
      params: {
        type: Sequelize.TEXT("long"),
      },
      result: {
        type: Sequelize.TEXT("long"),
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
      ...getMetadata(Sequelize)
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("auditLogs");
  },
};
