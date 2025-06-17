"use strict";

const Boom = require("@hapi/boom");
const { handleError } = require("./error");
const configStore = require("../config");

exports.deleteHandler = async function (model, req = { query: {} }) {
  try {
    const hardDelete = req.body
      ? req.body.hardDelete === true
        ? req.body.hardDelete
        : false
      : false;
    try {
      if (
        model.hooks &&
        model.hooks.delete &&
        model.hooks.delete.pre &&
        req.preHook === undefined
      ) {
        await model.hooks.delete.pre(req, hardDelete);
      }
    } catch (err) {
      handleError(
        err,
        "There was a preprocessing error deleting the resource.",
        Boom.badRequest
      );
    }
    let deleted;
    if (req.params && req.params.id) {
      deleted = await model.findByPk(req.params.id);
      if (hardDelete === false) {
        await model.update(
          { deletedBy: req.body.deletedBy },
          {
            where: { [configStore.get("/dbPrimaryKey").name]: req.params.id },
            paranoid: false,
          }
        );
      }
      await model.destroy({
        where: { [configStore.get("/dbPrimaryKey").name]: req.params.id },
        force: hardDelete,
      });
    } else if (req.body && req.body.data) {
      deleted = await model.findAll({
        where: { [configStore.get("/dbPrimaryKey").name]: req.body.data },
      });
      if (hardDelete === false) {
        await model.update(
          { deletedBy: req.body.deletedBy },
          {
            where: { [configStore.get("/dbPrimaryKey").name]: req.body.data },
            paranoid: false,
          }
        );
      }
      await model.destroy({
        where: { [configStore.get("/dbPrimaryKey").name]: req.body.data },
        force: hardDelete,
      });
    } else {
      throw Boom.badRequest("Invalid delete request");
    }
    try {
      if (
        model.hooks &&
        model.hooks.delete &&
        model.hooks.delete.post &&
        req.postHook === undefined
      ) {
        await model.hooks.delete.post(req, hardDelete, deleted);
      }
    } catch (err) {
      handleError(
        err,
        "There was a postprocessing error deleting the resource.",
        Boom.badRequest
      );
    }
    return true;
  } catch (err) {
    throw err;
  }
};

exports.associationRemoveOneHandler = async function (
  ownerModel,
  association,
  req = { query: {} }
) {
  try {
    if (!req.params || !req.params.ownerId || !req.params.childId)
      throw Boom.badRequest("Invalid request");

    const { target: childModel, accessors } = association;
    const hardDelete = req.body
      ? req.body.hardDelete === true
        ? req.body.hardDelete
        : false
      : false;
    try {
      if (
        ownerModel.hooks &&
        ownerModel.hooks.remove &&
        ownerModel.hooks.remove[childModel.name] &&
        ownerModel.hooks.remove[childModel.name].pre &&
        req.preHook === undefined
      ) {
        await ownerModel.hooks.remove[childModel.name].pre(req);
      }
    } catch (err) {
      handleError(
        err,
        "There was a preprocessing error while removing the association.",
        Boom.badRequest
      );
    }
    const owner = await ownerModel.findByPk(req.params.ownerId);
    await owner[accessors.remove](req.params.childId, { force: hardDelete });
    try {
      if (
        ownerModel.hooks &&
        ownerModel.hooks.remove &&
        ownerModel.hooks.remove[childModel.name] &&
        ownerModel.hooks.remove[childModel.name].post &&
        req.postHook === undefined
      ) {
        await ownerModel.hooks.remove[childModel.name].post(req);
      }
    } catch (err) {
      handleError(err, "There was a postprocessing error.", Boom.badRequest);
    }
    return true;
  } catch (err) {
    throw err;
  }
};

exports.associationRemoveManyHandler = async function (
  ownerModel,
  association,
  req = { query: {} }
) {
  try {
    if (!req.params || !req.params.ownerId)
      throw Boom.badRequest("Invalid request");

    const { target: childModel, accessors } = association;
    const hardDelete = req.body
      ? req.body.hardDelete === true
        ? req.body.hardDelete
        : false
      : false;
    try {
      if (
        ownerModel.hooks &&
        ownerModel.hooks.remove &&
        ownerModel.hooks.remove[childModel.name] &&
        ownerModel.hooks.remove[childModel.name].pre &&
        req.preHook === undefined
      ) {
        req = await ownerModel.hooks.remove[childModel.name].pre(req);
      }
    } catch (err) {
      handleError(
        err,
        "There was a preprocessing error while removing the association.",
        Boom.badRequest
      );
    }
    const owner = await ownerModel.findByPk(req.params.ownerId);
    await owner[accessors.removeMultiple](req.body, { force: hardDelete });
    try {
      if (
        ownerModel.hooks &&
        ownerModel.hooks.remove &&
        ownerModel.hooks.remove[childModel.name] &&
        ownerModel.hooks.remove[childModel.name].post &&
        req.postHook === undefined
      ) {
        data = await ownerModel.hooks.remove[childModel.name].post(req);
      }
    } catch (err) {
      handleError(err, "There was a postprocessing error.", Boom.badRequest);
    }
    return true;
  } catch (err) {
    throw err;
  }
};
