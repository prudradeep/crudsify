"use strict";

const Boom = require("@hapi/boom");
const { handleError } = require("./error");
const configStore = require("../config");
const { addMeta } = require("../policies/add-meta-data");
const authStrategy = configStore.get("/authStrategy");

exports.deleteHandler = async function (model, req = { query: {} }) {
  try {
    const hardDelete = req.body
      ? req.body.hardDelete === true
        ? req.body.hardDelete
        : false
      : false;
    try {
      if (
        model.middlewares &&
        model.middlewares.delete &&
        model.middlewares.delete.pre
      ) {
        await model.middlewares.delete.pre(req, hardDelete);
      }
    } catch (err) {
      handleError(
        err,
        "There was a preprocessing error deleting the resource.",
        Boom.badRequest
      );
    }
    if (authStrategy) addMeta("delete", req);
    let deleted;
    if (req.params && req.params.id) {
      deleted = await model.findByPk(req.params.id);
      if (hardDelete === false) {
        await model.update(
          { deletedBy: req.body.deletedBy },
          { where: { [configStore.get("/dbPrimaryKey").name]: req.params.id } }
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
          { where: { [configStore.get("/dbPrimaryKey").name]: req.body.data } }
        );
      }
      await model.destroy({
        where: { [configStore.get("/dbPrimaryKey").name]: req.body.data },
        force: hardDelete,
      });
    } else {
      throw Boom.badRequest("Invalid delete request");
    }
    if (deleted) {
      try {
        if (
          model.middlewares &&
          model.middlewares.delete &&
          model.middlewares.delete.post
        ) {
          await model.middlewares.delete.post(req, hardDelete, deleted);
        }
      } catch (err) {
        handleError(
          err,
          "There was a postprocessing error deleting the resource.",
          Boom.badRequest
        );
      }
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
    if (!req.params) {
      throw Boom.badRequest("Invalid request");
    }
    const { target: childModel, accessors } = association;
    try {
      if (
        ownerModel.middlewares &&
        ownerModel.middlewares.remove &&
        ownerModel.middlewares.remove[childModel.name] &&
        ownerModel.middlewares.remove[childModel.name].pre
      ) {
        req = await ownerModel.middlewares.remove[childModel.name].pre(req);
      }
    } catch (err) {
      handleError(
        err,
        "There was a preprocessing error while removing the association.",
        Boom.badRequest
      );
    }
    if (authStrategy) addMeta("delete", req);
    const owner = await ownerModel.findByPk(req.params.ownerId);
    await owner[accessors.remove](parseInt(req.params.childId));
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
    if (!req.params) {
      throw Boom.badRequest("Invalid request");
    }
    const { target: childModel, accessors } = association;
    try {
      if (
        ownerModel.middlewares &&
        ownerModel.middlewares.remove &&
        ownerModel.middlewares.remove[childModel.name] &&
        ownerModel.middlewares.remove[childModel.name].pre
      ) {
        req = await ownerModel.middlewares.remove[childModel.name].pre(req);
      }
    } catch (err) {
      handleError(
        err,
        "There was a preprocessing error while removing the association.",
        Boom.badRequest
      );
    }
    if (authStrategy) addMeta("delete", req);
    const owner = await ownerModel.findByPk(req.params.ownerId);
    await owner[accessors.removeMultiple](req.body);
    return true;
  } catch (err) {
    throw err;
  }
};
