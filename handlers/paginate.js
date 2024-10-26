"use strict";

const _ = require("lodash");
const queryHelper = require("../helpers/query");

exports.paginateList = async (DB, model, req, conditions = {}) => {
  const paginate = queryHelper.paginate(req.query);
  const sort = queryHelper.setSort(req.query);
  let embeds = [];
  if (req.query.$embed) {
    embeds = queryHelper.getEmbeds(DB, req.query.$embed);
  }

  let select = {};
  if (req.query.$select) {
    if (_.isArray(req.query.$select)) select = req.query.$select;
    else select = [req.query.$select];
  }

  const docs = await model.findAll({
    attributes: select,
    ...conditions,
    include: embeds,
    order: [...sort],
    ...paginate,
  });
  const count = await model.count(conditions);

  const pages = {
    current: parseInt(req.query.$page) || 1,
    prev: 0,
    hasPrev: false,
    next: 0,
    hasNext: false,
    total: 0,
  };
  const items = {
    limit: parseInt(paginate.limit),
    begin:
      (req.query.$page || 1) * parseInt(paginate.limit) -
      parseInt(paginate.limit) +
      1,
    end: (req.query.$page || 1) * parseInt(paginate.limit),
    total: count,
  };

  pages.total = Math.ceil(count / parseInt(paginate.limit));
  pages.next = pages.current + 1;
  pages.hasNext = pages.next <= pages.total;
  pages.prev = pages.current - 1;
  pages.hasPrev = pages.prev !== 0;
  if (items.begin > items.total) {
    items.begin = items.total;
  }
  if (items.end > items.total) {
    items.end = items.total;
  }

  return { docs, items, pages };
};

exports.paginateAssocList = async (
  DB,
  ownerModel,
  accessors,
  req,
  conditions = {}
) => {
  const paginate = queryHelper.paginate(req.query);
  const sort = queryHelper.setSort(req.query);

  let embeds = [];
  if (req.query.$embed) {
    embeds = queryHelper.getEmbeds(DB, req.query.$embed);
  }

  let select = {};
  if (req.query.$select) {
    if (_.isArray(req.query.$select)) select = req.query.$select;
    else select = [req.query.$select];
  }

  const owner = await ownerModel.findByPk(req.params.ownerId);
  let docs = [];
  let count = 0;
  if (owner) {
    docs = await owner[accessors.get]({
      attributes: select,
      ...conditions,
      include: embeds,
      order: [...sort],
      ...paginate,
    });
    count = await owner[accessors.count](conditions);
  }

  const pages = {
    current: parseInt(req.query.$page) || 1,
    prev: 0,
    hasPrev: false,
    next: 0,
    hasNext: false,
    total: 0,
  };
  const items = {
    limit: paginate.limit,
    begin:
      (req.query.$page || 1) * parseInt(paginate.limit) -
      parseInt(paginate.limit) +
      1,
    end: (req.query.$page || 1) * parseInt(paginate.limit),
    total: count,
  };

  pages.total = Math.ceil(count / parseInt(paginate.limit));
  pages.next = pages.current + 1;
  pages.hasNext = pages.next <= pages.total;
  pages.prev = pages.current - 1;
  pages.hasPrev = pages.prev !== 0;
  if (items.begin > items.total) {
    items.begin = items.total;
  }
  if (items.end > items.total) {
    items.end = items.total;
  }
  return { docs, items, pages };
};
