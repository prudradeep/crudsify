'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const {
      getPrimaryKey,
      getTimestamps,
      addTimestampIndexes,
      getMetadata,
      addMetadataIndexes,
      getRecordScopes,
    } = require("crudsify/helpers/model");
    await queryInterface.createTable('<%= tableName %>', {
      ...getPrimaryKey(Sequelize),
      <% attributes.forEach(function(attribute) { %>
        <%= attribute.fieldName %>: {
          type: Sequelize.<%= attribute.dataFunction ? `${attribute.dataFunction.toUpperCase()}(Sequelize.${attribute.dataType.toUpperCase()})` : attribute.dataValues ? `${attribute.dataType.toUpperCase()}(${attribute.dataValues})` : attribute.dataType.toUpperCase() %>
        },
      <% }) %>

      ...getRecordScopes(Sequelize),
      ...getTimestamps(Sequelize),
      ...getMetadata(Sequelize),
    });
    await addTimestampIndexes(queryInterface, '<%= tableName %>', Sequelize);
    await addMetadataIndexes(queryInterface, '<%= tableName %>', Sequelize);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('<%= tableName %>');
  }
};
