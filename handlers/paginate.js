"use strict";

const _ = require("lodash");
const queryHelper = require("../helpers/query");
const configStore = require("../config");

exports.paginateList = async (
  model,
  req,
  conditions = {},
  subQuery = false,
  embeds = false
) => {
  let paginate = queryHelper.paginate(req.query);
  const sort = queryHelper.setSort(req.query);

  let select = {};
  if (req.query.$select) {
    const requestedSelect = _.isArray(req.query.$select)
      ? req.query.$select
      : [req.query.$select];
    select = requestedSelect.filter((field) =>
      queryHelper.getReadableFields(model).includes(field)
    );
  }

  const docs = await model.findAll({
    attributes: select,
    paranoid:
      configStore.get("/allowParanoidQueries") &&
      req.query &&
      req.query.$paranoid === "true"
        ? false
        : true,
    ...conditions,
    include: embeds,
    order: [...sort],
    subQuery,
    ...paginate,
  });
  let count = await model.count({
    ...conditions,
    distinct: true,
    paranoid:
      configStore.get("/allowParanoidQueries") &&
      req.query &&
      req.query.$paranoid === "true"
        ? false
        : true,
    include: embeds,
  });

  count = _.isArray(count) ? count.length : count;

  const currentPage = Math.max(parseInt(req.query.$page) || 1, 1);
  const limit = parseInt(paginate.limit);
  const pages = {
    current: currentPage,
    prev: 0,
    hasPrev: false,
    next: 0,
    hasNext: false,
    total: 0,
  };
  const items = {
    limit,
    begin: currentPage * limit - limit + 1,
    end: currentPage * limit,
    total: count,
  };

  pages.total = limit > 0 ? Math.ceil(count / limit) : 0;
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

  return { docs: docs, items, pages };
};

exports.paginateAssocList = async (
  ownerModel,
  accessors,
  req,
  conditions = {},
  embeds = false,
  childModel = false
) => {
  let paginate = queryHelper.paginate(req.query);
  const sort = queryHelper.setSort(req.query);

  let select = {};
  if (req.query.$select) {
    const requestedSelect = _.isArray(req.query.$select)
      ? req.query.$select
      : [req.query.$select];
    select = childModel
      ? requestedSelect.filter((field) =>
          queryHelper.getReadableFields(childModel).includes(field)
        )
      : [];
  }

  const owner = await ownerModel.findByPk(req.params.ownerId);
  let docs = [];
  let count = 0;
  if (owner) {
    docs = await owner[accessors.get]({
      attributes: select,
      ...conditions,
      paranoid:
        configStore.get("/allowParanoidQueries") &&
        req.query &&
        req.query.$paranoid === "true"
          ? false
          : true,
      include: embeds,
      order: [...sort],
      ...paginate,
    });
    count = await owner[accessors.count](conditions);
  }

  const currentPage = Math.max(parseInt(req.query.$page) || 1, 1);
  const limit = parseInt(paginate.limit);
  const pages = {
    current: currentPage,
    prev: 0,
    hasPrev: false,
    next: 0,
    hasNext: false,
    total: 0,
  };
  const items = {
    limit,
    begin: currentPage * limit - limit + 1,
    end: currentPage * limit,
    total: count,
  };

  pages.total = limit > 0 ? Math.ceil(count / limit) : 0;
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
