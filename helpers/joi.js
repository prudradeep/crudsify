"use strict";

const _ = require("lodash");
const Joi = require("joi");
const Sequelize = require("sequelize");
const configStore = require("../config");
const queryHelper = require("./query");
const { getTimestamps, getMetadata, getRecordScopes } = require("./model");

let headersValidation;
if (configStore.get("/authentication")) {
  headersValidation = Joi.object({
    authorization: Joi.string().required().messages({
      "any.required": "Authorization is required",
    }),
  }).options({ allowUnknown: true });
} else {
  headersValidation = Joi.object().options({ allowUnknown: true });
}

/**
 * Checks to see if a field is a valid model property
 * @param fieldName: The name of the field
 * @param field: The field being checked
 * @param model: A model object
 * @returns {boolean}
 */
const isValidField = function (fieldName, field, keys = []) {
  const timestamps = Object.keys(getTimestamps(Sequelize.DataTypes));
  const metadata = Object.keys(getMetadata(Sequelize.DataTypes));
  const recordScope = Object.keys(getRecordScopes(Sequelize.DataTypes));
  const invalidFieldNames = [
    configStore.get("/dbPrimaryKey").name,
    ...timestamps,
    ...metadata,
    ...recordScope,
  ];

  if (keys.indexOf(fieldName) !== -1) return false;

  if (!_.isObject(field)) {
    return false;
  }

  if (invalidFieldNames.indexOf(fieldName) > -1) {
    return false;
  }

  return true;
};

/**
 * Returns a Joi object based on the field type.
 * @param field: A field from a model.
 * @returns {*}: A Joi object.
 */
const generateJoiModelFromFieldType = function (field) {
  let model;

  const fieldCopy = _.extend({}, field);
  let key = null;
  if (fieldCopy.type) key = fieldCopy.type.key;
  else key = fieldCopy.key;
  switch (key) {
    case "TEXT":
    case "CITEXT":
    case "CHAR":
    case "CIDR":
    case "BLOB":
    case "STRING":
    case "INET":
    case "UUID":
    case "MACADDR":
      if (fieldCopy.regex) {
        if (!(fieldCopy.regex instanceof RegExp)) {
          if (fieldCopy.regex.options) {
            model = Joi.string().regex(
              fieldCopy.regex.pattern,
              fieldCopy.regex.options
            );
          } else {
            model = Joi.string().regex(fieldCopy.regex.pattern);
          }
        } else {
          model = Joi.string().regex(fieldCopy.regex);
        }
      } else if (fieldCopy.stringType) {
        switch (fieldCopy.stringType) {
          case "uri":
            model = Joi.string().uri();
            break;
          case "email":
            model = Joi.string().email();
            break;
          case "token":
            model = Joi.string().token();
            break;
          case "hex":
            model = Joi.string().hex();
            break;
          case "base64":
            model = Joi.string().base64();
            break;
          case "hostname":
            model = Joi.string().hostname();
            break;
          case "lowercase":
            model = Joi.string().lowercase();
            break;
          case "uppercase":
            model = Joi.string().uppercase();
            break;
          case "trim":
            model = Joi.string().trim();
            break;
          case "creditCard":
            model = Joi.string().creditCard();
            break;
          default:
            model = Joi.string();
        }
      } else {
        model = Joi.string();
      }
      break;
    case "ARRAY":
      model = Joi.array().items(generateJoiModelFromFieldType(fieldCopy.type));
      break;
    case "JSON":
      model = Joi.array().items(
        generateJoiModelFromFieldType(fieldCopy.jsonType)
      );
      break;

    case "BIGINT":
    case "DECIMAL":
    case "DOUBLE PRECISION":
    case "FLOAT":
    case "INTEGER":
    case "MEDIUMINT":
    case "NUMBER":
    case "REAL":
    case "SMALLINT":
    case "TINYINT":
      model = Joi.number();
      break;
    case "DATE":
    case "TIME":
    case "DATEONLY":
      model = Joi.date();
      break;
    case "BOOLEAN":
      model = Joi.bool();
      break;
    case "ENUM":
      model = Joi.string().valid(...fieldCopy.values);
      break;
    default:
      model = Joi.any();
      break;
  }

  if (fieldCopy.allowNull) {
    model = model.allow(null);
  }

  if (fieldCopy.description) {
    model = model.description(fieldCopy.description);
  } else if (fieldCopy.stringType) {
    model = model.description(fieldCopy.stringType);
  }

  return model;
};

/**
 * Generates a Joi object that validates a request query for the list function
 * @param model: A model object.
 * @returns {*}: A Joi object
 */
const generateJoiListQueryModel = (model) => {
  let queryModel = {
    $skip: Joi.number()
      .integer()
      .min(0)
      .optional()
      .description(
        "The number of records to skip in the database. This is typically used in pagination."
      ),
    $page: Joi.number()
      .integer()
      .min(0)
      .optional()
      .description(
        "The number of records to skip based on the $limit parameter. This is typically used in pagination."
      ),
    $limit: Joi.number()
      .integer()
      .min(0)
      .optional()
      .description(
        "The maximum number of records to return. This is typically used in pagination."
      ),
  };

  const queryableFields = queryHelper.getQueryableFields(model);

  const readableFields = queryHelper.getReadableFields(model);

  const sortableFields = queryHelper.getSortableFields(model);

  const operations = [
    "=",
    "<",
    "<=",
    ">",
    ">=",
    "between",
    "notBetween",
    "in",
    "notIn",
    "like",
    "notLike",
  ];

  if (queryableFields && readableFields) {
    queryModel.$select = Joi.alternatives().try(
      Joi.array()
        .items(Joi.string().valid(...readableFields))
        .description(
          "A list of basic fields to be included in each resource. Valid values include: " +
            readableFields.toString().replace(/,/g, ", ")
        ),
      Joi.string().valid(...readableFields)
    );
    queryModel.$sort = Joi.alternatives().try(
      Joi.array()
        .items(Joi.string().valid(...sortableFields))
        .description(
          "A set of fields to sort by. Including field name indicates it should be sorted ascending, while prepending " +
            "'-' indicates descending. The default sort direction is 'ascending' (lowest value to highest value). Listing multiple" +
            "fields prioritizes the sort starting with the first field listed. Valid values include: " +
            sortableFields.toString().replace(/,/g, ", ")
        ),
      Joi.string().valid(...sortableFields)
    );
    queryModel.$exclude = Joi.alternatives().try(
      Joi.array()
        .items(Joi.number())
        .description("A list of Ids to exclude in the result."),
      Joi.number()
    );
    queryModel.$count = Joi.boolean().description(
      "If set to true, only a count of the query results will be returned."
    );

    _.each(queryableFields, function (fieldName) {
      const joiModel = generateJoiModelFromFieldType(
        model.rawAttributes[fieldName]
      );
      queryModel[`${fieldName}Oper`] = Joi.string()
        .valid(...operations)
        .description(`Allowed values are ${operations.join(", ")}`);
      queryModel[fieldName] = Joi.alternatives().try(
        Joi.array()
          .items(joiModel)
          .description("Match values for the " + fieldName + " property."),
        joiModel
      );
    });
  }

  const associations = model.associations ? model.associations : null;
  if (associations) {
    let embeds = [];
    for (const assoc of Object.values(model.associations)) {
      const { target } = assoc;
      embeds.push(target.name);
    }
    queryModel.$embed = Joi.alternatives().try(
      Joi.array()
        .items(Joi.string())
        .description(
          "A set of complex object properties to populate. Valid first level values include " +
            Object.values(embeds).toString().replace(/,/g, ", ")
        ),
      Joi.string()
    );
  }

  queryModel = Joi.object(queryModel);

  if (!configStore.get("/enableQueryValidation")) {
    queryModel = queryModel.unknown();
  }

  return queryModel;
};

/**
 * Generates a Joi object that validates a request query for the find function
 * @param model: A model object.
 * @returns {*}: A Joi object
 */
const generateJoiFindQueryModel = (model) => {
  let queryModel = {};

  const readableFields = queryHelper.getReadableFields(model);

  if (readableFields) {
    queryModel.$select = Joi.alternatives().try(
      Joi.array()
        .items(Joi.string().valid(...readableFields))
        .description(
          "A list of basic fields to be included in each resource. Valid values include: " +
            readableFields.toString().replace(/,/g, ", ")
        ),
      Joi.string().valid(...readableFields)
    );
  }

  const associations = model.associations ? model.associations : null;
  if (associations) {
    let embeds = [];
    for (const assoc of Object.values(model.associations)) {
      const { target } = assoc;
      embeds.push(target.name);
    }
    queryModel.$embed = Joi.alternatives().try(
      Joi.array()
        .items(Joi.string())
        .description(
          "A set of complex object properties to populate. Valid first level values include " +
            Object.values(embeds).toString().replace(/,/g, ", ")
        ),
      Joi.string()
    );
  }

  queryModel = Joi.object(queryModel);

  if (!configStore.get("/enableQueryValidation")) {
    queryModel = queryModel.unknown();
  }

  return queryModel;
};

/**
 * Generates a Joi object that validates a request payload for creating a record
 * @param model: A model object.
 * @returns {*}: A Joi object
 */
const generateJoiCreateModel = (model, assoc = false, keys = []) => {
  const createModelBase = {};

  const fields = model.rawAttributes;

  for (const fieldName in fields) {
    const field = fields[fieldName];
    if (isValidField(fieldName, field, keys)) {
      // EXPL: use the field createModel if one is defined
      if (field.createModel) {
        createModelBase[fieldName] = field.createModel;
      } else if (field.allowOnCreate !== false) {
        let attributeCreateModel = generateJoiModelFromFieldType(field);

        if (field.allowNull === false) {
          attributeCreateModel = attributeCreateModel.required();
        }

        createModelBase[fieldName] = attributeCreateModel;
      }
    }
  }

  if (assoc) {
    const createModel = Joi.array()
      .items(createModelBase)
      .label(model.name + "CreateModel");
    return createModel;
  }

  const createModel = Joi.object(createModelBase).label(
    model.name + "CreateModel"
  );

  return createModel;
};

/**
 * Generates a Joi object that validates a query request payload for updating a record
 * @param model: A model object.
 * @returns {*}: A Joi object
 */
const generateJoiUpdateModel = (model, keys = []) => {
  const updateModelBase = {};

  const fields = model.rawAttributes;

  for (const fieldName in fields) {
    const field = fields[fieldName];

    if (isValidField(fieldName, field, keys)) {
      if (field.updateModel) {
        updateModelBase[fieldName] = field.updateModel;
      } else if (field.allowOnUpdate !== false) {
        let attributeUpdateModel = generateJoiModelFromFieldType(field);

        if (field.requireOnUpdate === true) {
          attributeUpdateModel = attributeUpdateModel.required();
        }

        updateModelBase[fieldName] = attributeUpdateModel;
      }
    }
  }

  const updateModel = Joi.object(updateModelBase).label(
    model.name + "UpdateModel"
  );

  return updateModel;
};

module.exports = {
  generateJoiListQueryModel,
  generateJoiFindQueryModel,
  generateJoiCreateModel,
  generateJoiUpdateModel,
  headersValidation,
};
