"use strict";

const _ = require("lodash");
const configStore = require("../config");
const { Op, fn, col } = require("sequelize");

const getFieldsType = function (model) {
  const _fields = model.rawAttributes;
  const fields = {};

  for (const fieldName in _fields) {
    const field = _fields[fieldName];
    fields[fieldName] = field.type.key;
  }
  return fields;
};

module.exports = {
  /**
   * Handle pagination for the query if needed.
   * @param query: The incoming request query.
   * @returns {*}: The updated query.
   */
  paginate: function (query) {
    let paginate = {};
    if (query.$page) {
      paginate = {
        ...paginate,
        ...this.setPage(query),
      };
    } else {
      paginate = {
        ...paginate,
        ...this.setSkip(query),
      };
    }

    paginate = {
      ...paginate,
      ...this.setLimit(query),
    };

    return paginate;
  },

  /**
   * Set the skip amount for the query. Typically used for paging.
   * @param query: The incoming request query.
   * @returns {*}: The updated query.
   */
  setSkip: function (query) {
    if (query.$skip) {
      return { offset: parseInt(query.$skip) };
    }
    return {};
  },

  /**
   * Set the page for the query. Typically used for paging.
   * @param query: The incoming request query.
   * @returns {*}: The updated query.
   */
  setPage: function (query) {
    return {
      offset:
        (parseInt(query.$page) - 1) *
        (query.$limit ? parseInt(query.$limit) : configStore.get("/limit")),
    };
  },

  /**
   * Set the limit amount for the query. Typically used for paging.
   * @param query: The incoming request query.
   * @returns {*}: The updated query.
   */
  setLimit: function (query) {
    if (query.$limit) {
      return { limit: parseInt(query.$limit) };
    }
    return { limit: configStore.get("/limit") };
  },

  /**
   * Set the sort priority for the mongoose query.
   * @param query: The incoming request query.
   * @returns {*}: The updated mongoose query.
   */
  setSort: function (query) {
    if (query.$sort) {
      if (Array.isArray(query.$sort)) {
        return query.$sort.map((val) => {
          if (val.indexOf("-") == 0) {
            return [val.substr(1), "DESC"];
          }
          return [val, "ASC"];
        });
      } else {
        if (query.$sort.indexOf("-") == 0) {
          return [[query.$sort.substr(1), "DESC"]];
        }
        return [[query.$sort, "ASC"]];
      }
    }
    return [];
  },

  /**
   * Get a list of fields that can be returned as part of a query result.
   * @param model: A model object.
   * @returns {Array}: A list of fields.
   */
  getReadableFields: function (model) {
    const readableFields = [];

    const fields = model.rawAttributes;
    for (const fieldName in fields) {
      const field = fields[fieldName];
      if (!field.exclude) {
        readableFields.push(fieldName);
      }
    }

    return readableFields;
  },

  /**
   * Get a list of valid query sort inputs.
   * @param model: A model object.
   * @returns {Array}: A list of fields.
   */
  getSortableFields: function (model) {
    const sortableFields = this.getReadableFields(model);

    for (let i = sortableFields.length - 1; i >= 0; i--) {
      const descendingField = "-" + sortableFields[i];
      sortableFields.splice(i, 0, descendingField);
    }

    return sortableFields;
  },

  /**
   * Get a list of fields that can be queried against.
   * @param model: A model object.
   * @returns {Array}: A list of fields.
   */
  getQueryableFields: function (model) {
    const queryableFields = [];

    const fields = model.rawAttributes;

    const fieldNames = Object.keys(fields);
    for (let i = 0; i < fieldNames.length; i++) {
      const fieldName = fieldNames[i];
      if (fields[fieldName]) {
        const field = fields[fieldName];
        if (field.queryable !== false && !field.exclude) {
          queryableFields.push(fieldName);
        }
      }
    }

    return queryableFields;
  },

  getFieldsType: getFieldsType,

  createWhereCondition: function (query, model) {
    let where = [];
    const fields = getFieldsType(model);
    const regex = /Oper$/gm;
    let Oper = false;
    let or = false;

    Object.keys(query).forEach((val) => {
      if (regex.test(val)) {
        Oper = { oper: query[val], key: val.replace("Oper", "") };
        return true;
      }
      if (val.indexOf("$") === -1) {
        if (_.isArray(query[val]))
          query[val] = query[val].map((v) => {
            if (typeof v === "string")
              return v.toLowerCase().replace("%20", " ");
            return v;
          });
        else if (typeof query[val] === "string")
          query[val].toLowerCase().replace("%20", " ");
        if (fields[val] === "JSON") {
          where.push(
            fn("JSON_SEARCH", fn("LOWER", col(val)), "one", query[val])
          );
        } else if (_.isArray(query[val])) {
          query[val] = query[val].map((v) => {
            if (v === "true") return true;
            if (v === "false") return false;
            return v;
          });
          if (Oper && Oper.key === val) {
            switch (Oper.oper) {
              case "between":
                where.push({ [val]: { [Op.between]: query[val] } });
                break;
              case "notBetween":
                where.push({ [val]: { [Op.notBetween]: query[val] } });
                break;
              case "in":
                where.push({ [val]: { [Op.in]: query[val] } });
                break;
              case "notIn":
                where.push({ [val]: { [Op.notIn]: query[val] } });
                break;
            }
            Oper = false;
          } else {
            where.push({ [val]: { [Op.in]: query[val] } });
          }
        } else {
          if (query[val] === "true") query[val] = true;
          if (query[val] === "false") query[val] = false;

          if (Oper && Oper.key === val) {
            switch (Oper.oper) {
              case "=":
                where.push({ [val]: { [Op.eq]: query[val] } });
                break;
              case "!=":
                where.push({ [val]: { [Op.ne]: query[val] } });
                break;
              case "<":
                where.push({ [val]: { [Op.lt]: query[val] } });
                break;
              case "<=":
                where.push({ [val]: { [Op.lte]: query[val] } });
                break;
              case ">":
                where.push({ [val]: { [Op.gt]: query[val] } });
                break;
              case ">=":
                where.push({ [val]: { [Op.gte]: query[val] } });
                break;
              case "regexp":
                where.push({ [val]: { [Op.regexp]: query[val] } });
                break;
              case "notregexp":
                where.push({ [val]: { [Op.notRegexp]: query[val] } });
                break;
              case "like":
                where.push({ [val]: { [Op.like]: query[val] } });
                break;
              case "notLike":
                where.push({ [val]: { [Op.notLike]: query[val] } });
                break;
            }
            Oper = false;
          } else {
            where.push({ [val]: query[val] });
          }
        }
      } else if (val === "$exclude") {
        if (_.isArray(query[val])) {
          where.push({
            [configStore.get("/dbPrimaryKey").name]: { [Op.notIn]: query[val] },
          });
        } else {
          where.push({
            [configStore.get("/dbPrimaryKey").name]: { [Op.ne]: query[val] },
          });
        }
      }
      if (val === "$or") or = true;
    });
    return { where: { [or ? Op.or : Op.and]: where } };
  },

  getEmbeds: function (DB, embed, associations = false) {
    let embeds = [];
    if (_.isArray(embed)) {
      embeds = embed.map((val) => {
        if (val.indexOf(".") !== -1) {
          const em = val.split(".").reduceRight((init, c) => {
            const init_ = DB[c]
              ? {
                  model: DB[c],
                }
              : {
                  model: associations[c].target,
                  as: c,
                };
            if (!_.isArray(init)) {
              init_.include = [init];
            }
            return init_;
          }, []);
          return em;
        }
        return DB[val]
          ? { model: DB[val] }
          : {
              model: associations[val].target,
              as: val,
            };
      });
    } else {
      if (embed.indexOf(".") !== -1) {
        embeds = embed.split(".").reduceRight((init, val) => {
          const init_ = DB[val]
            ? {
                model: DB[val],
              }
            : {
                model: associations[val].target,
                as: val,
              };
          if (!_.isArray(init)) {
            init_.include = [init];
          }
          return init_;
        }, []);
        embeds = [embeds];
      } else
        embeds = [
          DB[embed]
            ? { model: DB[embed] }
            : {
                model: associations[embed].target,
                as: embed,
              },
        ];
    }
    return embeds;
  },
};
