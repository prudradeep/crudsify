"use strict";

const Boom = require("@hapi/boom");
const { handleError } = require("./error");
const configStore = require("../config");

exports.recoverHandler = async function (model, req = { query: {} }) {
  try {
    try {
      if (
        model.hooks &&
        model.hooks.recover &&
        model.hooks.recover.pre &&
        req.preHook === undefined
      ) {
        await model.hooks.recover.pre(req);
      }
    } catch (err) {
      handleError(
        err,
        "There was a preprocessing error recovering the resource.",
        Boom.badRequest
      );
    }
    let recovered;
    if (req.params && req.params.id) {
      recovered = await model.findByPk(req.params.id);
      await model.restore(
        {
          where: { [configStore.get("/dbPrimaryKey").name]: req.params.id },
        }
      );
      await model.update(
        { deletedBy: null },
        {
          where: { [configStore.get("/dbPrimaryKey").name]: req.params.id },
        }
      );
    } else if (req.body && req.body.data) {
      recovered = await model.findAll({
        where: { [configStore.get("/dbPrimaryKey").name]: req.body.data },
      });
      await model.restore(
        {
          where: { [configStore.get("/dbPrimaryKey").name]: req.body.data },
        }
      );
      await model.update(
        { deletedBy: null },
        {
          where: { [configStore.get("/dbPrimaryKey").name]: req.body.data },
        }
      );
    } else {
      throw Boom.badRequest("Invalid recover request");
    }
    try {
      if (
        model.hooks &&
        model.hooks.recover &&
        model.hooks.recover.post &&
        req.postHook === undefined
      ) {
        await model.hooks.recover.post(req, recovered);
      }
    } catch (err) {
      handleError(
        err,
        "There was a postprocessing error recovering the resource.",
        Boom.badRequest
      );
    }
    return true;
  } catch (err) {
    throw err;
  }
};
