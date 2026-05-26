"use strict";

const _ = require("lodash");
const queryHelper = require("../helpers/query");

const createPaginationResult = (docs, query, paginate, count) => {
  const currentPage = Math.max(parseInt(query.$page) || 1, 1);
  const limit = parseInt(paginate.limit);
  const pages = {
    current: currentPage,
    prev: currentPage - 1,
    hasPrev: currentPage - 1 !== 0,
    next: currentPage + 1,
    hasNext: currentPage + 1 <= (limit > 0 ? Math.ceil(count / limit) : 0),
    total: limit > 0 ? Math.ceil(count / limit) : 0,
  };
  const items = {
    limit,
    begin: Math.min(currentPage * limit - limit + 1, count),
    end: Math.min(currentPage * limit, count),
    total: count,
  };

  return { docs, items, pages };
};

exports.paginateList = async (
  model,
  req,
  conditions = {},
  subQuery = false,
  embeds = false
) => {
  const paginate = queryHelper.paginate(req.query);
  const sort = queryHelper.setSort(req.query);

  const docs = await model.findAll({
    attributes: queryHelper.getSelectedFields(model, req.query.$select),
    paranoid: queryHelper.getParanoidOption(req.query),
    ...conditions,
    include: embeds,
    order: [...sort],
    subQuery,
    ...paginate,
  });
  let count = await model.count({
    ...conditions,
    distinct: true,
    paranoid: queryHelper.getParanoidOption(req.query),
    include: embeds,
  });

  count = _.isArray(count) ? count.length : count;
  return createPaginationResult(docs, req.query, paginate, count);
};

exports.paginateAssocList = async (
  ownerModel,
  accessors,
  req,
  conditions = {},
  embeds = false,
  childModel = false
) => {
  const paginate = queryHelper.paginate(req.query);
  const sort = queryHelper.setSort(req.query);
  const select = childModel
    ? queryHelper.getSelectedFields(childModel, req.query.$select)
    : {};

  const owner = await ownerModel.findByPk(req.params.ownerId);
  let docs = [];
  let count = 0;
  if (owner) {
    docs = await owner[accessors.get]({
      attributes: select,
      ...conditions,
      paranoid: queryHelper.getParanoidOption(req.query),
      include: embeds,
      order: [...sort],
      ...paginate,
    });
    count = await owner[accessors.count](conditions);
  }
  return createPaginationResult(docs, req.query, paginate, count);
};
