"use strict";

const { createEndpoint, updateEndpoint, associationAddOneEndpoint, associationAddManyEndpoint } = require('../endpoints/create');
const { listEndpoint, findEndpoint, associationGetAllEndpoint } = require('../endpoints/list');
const { deleteOneEndpoint, deleteManyEndpoint, associationRemoveOneEndpoint, associationRemoveManyEndpoint } = require('../endpoints/remove');
const DB = require('../models')

//Generate model routes
for (const model in DB.sequelize.models) {
  if (model.indexOf("_") === -1) {
    listEndpoint(DB, DB[model]);
    findEndpoint(DB, DB[model]);
    createEndpoint(DB, DB[model]);
    updateEndpoint(DB, DB[model]);
    deleteOneEndpoint(DB, DB[model]);
    deleteManyEndpoint(DB, DB[model]);

    //Association
    for (const assoc of Object.values(DB[model].associations)) {
      const { associationType } = assoc;
      if (
        associationType === "HasMany" ||
        associationType === "BelongsToMany"
      ) {
        associationGetAllEndpoint(DB, DB[model], assoc);
        associationAddOneEndpoint(DB, DB[model], assoc);
        associationAddManyEndpoint(DB, DB[model], assoc);
        associationRemoveOneEndpoint(DB, DB[model], assoc);
        associationRemoveManyEndpoint(DB, DB[model], assoc);
      }
    }
  }
}
