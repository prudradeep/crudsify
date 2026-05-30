"use strict";

const Boom = require("@hapi/boom");
const { Op } = require("sequelize");
const { paginateList, paginateAssocList } = require("./paginate");
const {
  createWhereCondition,
  getEmbeds,
  getEmbedCounts,
  getSelectedFields,
  getParanoidOption,
  populateEmbedCounts,
} = require("../helpers/query");
const { handleError } = require("./error");

exports.listHandler = async function (DB, model, req = { query: {} }) {
  try {
    try {
      if (!req.query) req.query = {};
      if (
        model.hooks &&
        model.hooks.list &&
        model.hooks.list.pre &&
        req.preHook === undefined
      ) {
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
    let embeds = false;
    let embedCounts = [];
    if (req.query.$embed) {
      embeds = getEmbeds(DB, req.query.$embed, model.associations);
      embedCounts = getEmbedCounts(req.query.$embed);
    }
    let data = await paginateList(model, req, conditions, true, embeds);
    await populateEmbedCounts(model, data.docs, embedCounts, req.query);
    try {
      if (
        model.hooks &&
        model.hooks.list &&
        model.hooks.list.post &&
        req.postHook === undefined
      ) {
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
    if (!req.params || !req.params.id) throw Boom.badRequest("Invalid request");

    try {
      if (
        model.hooks &&
        model.hooks.find &&
        model.hooks.find.pre &&
        req.preHook === undefined
      ) {
        req = await model.hooks.find.pre(req);
      }
    } catch (err) {
      handleError(err, "There was a preprocessing error.", Boom.badRequest);
    }
    let embeds = [];
    let embedCounts = [];
    if (req.query && req.query.$embed) {
      embeds = getEmbeds(DB, req.query.$embed, model.associations);
      embedCounts = getEmbedCounts(req.query.$embed);
    }

    let data = await model.findByPk(req.params.id, {
      attributes: getSelectedFields(model, req.query && req.query.$select),
      include: embeds,
      paranoid: getParanoidOption(req.query),
    });
    await populateEmbedCounts(model, data, embedCounts, req.query);
    try {
      if (
        model.hooks &&
        model.hooks.find &&
        model.hooks.find.post &&
        req.postHook === undefined
      ) {
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
      if (!req.params || !req.params.ownerId)
        throw Boom.badRequest("Invalid request");

      if (!req.query) req.query = {};
      if (
        ownerModel.hooks &&
        ownerModel.hooks.getAll &&
        ownerModel.hooks.getAll[childModel.name] &&
        ownerModel.hooks.getAll[childModel.name].pre &&
        req.preHook === undefined
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
      const owner = await ownerModel.findByPk(req.params.ownerId);
      const count = await owner[accessors.count]({
        ...conditions,
        paranoid: getParanoidOption(req.query),
      });
      return { count };
    }

    let embeds = false;
    let embedCounts = [];
    if (req.query.$embed) {
      embeds = getEmbeds(DB, req.query.$embed, childModel.associations);
      embedCounts = getEmbedCounts(req.query.$embed);
    }
    let data = await paginateAssocList(
      ownerModel,
      accessors,
      req,
      conditions,
      embeds,
      childModel
    );
    await populateEmbedCounts(childModel, data.docs, embedCounts, req.query);
    try {
      if (
        ownerModel.hooks &&
        ownerModel.hooks.getAll &&
        ownerModel.hooks.getAll[childModel.name] &&
        ownerModel.hooks.getAll[childModel.name].post &&
        req.postHook === undefined
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
