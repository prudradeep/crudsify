"use strict";

const Boom = require("@hapi/boom");
const { Op } = require("sequelize");
const { paginateList, paginateAssocList } = require("./paginate");
const { createWhereCondition, getEmbeds } = require("../helpers/query");
const { handleError } = require("./error");

exports.listHandler = async function (DB, model, req = { query: {} }) {
  try {
    try {
      if (!req.query) req.query = {};
      if (model.hooks && model.hooks.list && model.hooks.list.pre) {
        req = await model.hooks.list.pre(req);
      }
    } catch (err) {
      handleError(err, "There was a preprocessing error.", Boom.badRequest);
    }
    const conditions = createWhereCondition(req.query, model);
    //Fetch only authorized records
    if (req.recordReadAuth) {
      conditions.where[Op.and].push(req.recordReadAuth);
    }

    if (req.query && req.query.$count) {
      const count = await model.count(conditions);
      return { count };
    }
    let data = await paginateList(DB, model, req, conditions);
    try {
      if (model.hooks && model.hooks.list && model.hooks.list.post) {
        data.docs = await model.hooks.list.post(req, data.docs);
      }
    } catch (err) {
      handleError(err, "There was a postprocessing error.", Boom.badRequest);
    }
    return data;
  } catch (err) {
    throw err;
  }
};

exports.findHandler = async function (DB, model, req = { query: {} }) {
  try {
    if (!req.params) {
      throw Boom.badRequest("Invalid request");
    }
    try {
      if (model.hooks && model.hooks.find && model.hooks.find.pre) {
        req = await model.hooks.find.pre(req);
      }
    } catch (err) {
      handleError(err, "There was a preprocessing error.", Boom.badRequest);
    }
    let embeds = [];
    if (req.query && req.query.$embed) {
      embeds = getEmbeds(DB, req.query.$embed);
    }

    let select = {};
    if (req.query && req.query.$select) {
      if (_.isArray(req.query.$select)) select = req.query.$select;
      else select = [req.query.$select];
    }
    let data = await model.findByPk(req.params.id, {
      attributes: select,
      include: embeds,
    });
    try {
      if (model.hooks && model.hooks.find && model.hooks.find.post) {
        data = await model.hooks.find.post(req, data);
      }
    } catch (err) {
      handleError(err, "There was a postprocessing error.", Boom.badRequest);
    }
    return data;
  } catch (err) {
    throw err;
  }
};

exports.associationGetAllHandler = async function (
  DB,
  ownerModel,
  association,
  req = { query: {} }
) {
  try {
    const { target: childModel, accessors } = association;
    try {
      if (!req.query) req.query = {};
      if (
        ownerModel.hooks &&
        ownerModel.hooks.getAll &&
        ownerModel.hooks.getAll[childModel.name] &&
        ownerModel.hooks.getAll[childModel.name].pre
      ) {
        req = await ownerModel.hooks.getAll[childModel.name].pre(req);
      }
    } catch (err) {
      handleError(
        err,
        "There was a preprocessing error while setting the association.",
        Boom.badRequest
      );
    }
    const conditions = createWhereCondition(req.query, childModel);
    if (req.query.$count) {
      if (!req.params) {
        throw Boom.badRequest("Invalid request");
      }
      const owner = await ownerModel.findByPk(req.params.ownerId);
      const count = await owner[accessors.count](conditions);
      return { count };
    }

    let data = await paginateAssocList(
      DB,
      ownerModel,
      accessors,
      req,
      conditions
    );
    try {
      if (
        ownerModel.hooks &&
        ownerModel.hooks.getAll &&
        ownerModel.hooks.getAll[childModel.name] &&
        ownerModel.hooks.getAll[childModel.name].post
      ) {
        data.docs = await ownerModel.hooks.getAll[childModel.name].post(
          req,
          data.docs
        );
      }
    } catch (err) {
      handleError(err, "There was a postprocessing error.", Boom.badRequest);
    }
    return data;
  } catch (err) {
    throw err;
  }
};
