"use strict";

/** @type {import('sequelize-cli').Migration} */
const tableNames = async (queryInterface) =>
  (await queryInterface.showAllTables()).map((table) =>
    typeof table === "string" ? table : table.tableName
  );

module.exports = {
  async up(queryInterface, Sequelize) {
    const { addTimestampIndexes } = require("crudsify/helpers/model");
    for (const table of await tableNames(queryInterface)) {
      await addTimestampIndexes(queryInterface, table, Sequelize);
    }
  },

  async down(queryInterface, Sequelize) {
    const { removeTimestampIndexes } = require("crudsify/helpers/model");
    for (const table of (await tableNames(queryInterface)).reverse()) {
      await removeTimestampIndexes(queryInterface, table, Sequelize);
    }
  },
};
