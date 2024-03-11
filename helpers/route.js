"use strict";

const {
  createEndpoint,
  updateEndpoint,
  associationAddOneEndpoint,
  associationAddManyEndpoint,
} = require("../endpoints/create");
const {
  listEndpoint,
  findEndpoint,
  associationGetAllEndpoint,
} = require("../endpoints/list");
const {
  deleteOneEndpoint,
  deleteManyEndpoint,
  associationRemoveOneEndpoint,
  associationRemoveManyEndpoint,
} = require("../endpoints/remove");
const DB = require("../models");

//Generate model routes
for (const model in DB.sequelize.models) {
  if (model.indexOf("_") === -1) {
    //Generate model extra endpoints
    if (DB[model].extraEndpoints) {
      DB[model].extraEndpoints.forEach((endpoint) => {
        endpoint();
      });
    }
    
    listEndpoint(DB, DB[model]);
    findEndpoint(DB, DB[model]);
    createEndpoint(DB[model]);
    updateEndpoint(DB[model]);
    deleteOneEndpoint(DB[model]);
    deleteManyEndpoint(DB[model]);


    //Association
    for (const assoc of Object.values(DB[model].associations)) {
      const { associationType } = assoc;
      if (
        associationType === "HasMany" ||
        associationType === "BelongsToMany"
      ) {
        associationGetAllEndpoint(DB, DB[model], assoc);
        associationAddOneEndpoint(DB[model], assoc);
        associationAddManyEndpoint(DB[model], assoc);
        associationRemoveOneEndpoint(DB[model], assoc);
        associationRemoveManyEndpoint(DB[model], assoc);
      }
    }
  }
}
