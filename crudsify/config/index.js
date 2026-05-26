"use strict";

module.exports = {
  logQuery: true,
  enablePolicies: true,
  dbPrimaryKey: {
    name: "id",
    type: "UUID",
    autoIncrement: false,
  },
  enableCreatedBy: true,
  enableUpdatedBy: true,
  enableDeletedBy: true,
  dialectOptions: {
    dateStrings: true,
    typeCast: true,
  },
};
