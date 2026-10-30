"use strict";

/** @type {import('sequelize-cli').Migration} */
const tableNames = async (queryInterface) =>
  (await queryInterface.showAllTables()).map((table) =>
    typeof table === "string" ? table : table.tableName
  );

module.exports = {
  async up(queryInterface, Sequelize) {
    const { addMetadataIndexes } = require("crudsify/helpers/model");
    for (const table of await tableNames(queryInterface)) {
      await addMetadataIndexes(queryInterface, table, Sequelize);
    }
  },

  async down(queryInterface, Sequelize) {
    const { removeMetadataIndexes } = require("crudsify/helpers/model");
    for (const table of (await tableNames(queryInterface)).reverse()) {
      await removeMetadataIndexes(queryInterface, table, Sequelize);
    }
  },
};
