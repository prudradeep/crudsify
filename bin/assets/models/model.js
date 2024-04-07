'use strict';

const { Model } = require('sequelize');
const _ = require("lodash");
const {
  getPrimaryKey,
  getTimestamps,
  getMetadata,
  getRecordScopes,
} = require("crudsify/helpers/model");

module.exports = (sequelize, DataTypes) => {
  class <%= name %> extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate (models) {
      // define association here
    }
  }
  <%= name %>.init({
    ..._.cloneDeep(getPrimaryKey(DataTypes)),
    <% attributes.forEach(function(attribute, index) { %>
      <%= attribute.fieldName %>: DataTypes.<%= attribute.dataFunction ? `${attribute.dataFunction.toUpperCase()}(DataTypes.${attribute.dataType.toUpperCase()})` : attribute.dataValues ? `${attribute.dataType.toUpperCase()}(${attribute.dataValues})` : attribute.dataType.toUpperCase() %>,
    <% }) %>
    ..._.cloneDeep(getRecordScopes(DataTypes)),
    ..._.cloneDeep(getTimestamps(DataTypes)),
    ..._.cloneDeep(getMetadata(DataTypes)),
  }, {
    sequelize,
    modelName: '<%= name %>',
    <%= underscored ? 'underscored: true,' : '' %>
  });

  return <%= name %>;
};