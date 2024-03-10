"use strict";

const _ = require("lodash");
const Boom = require("@hapi/boom");
const { handleError } = require("./error");
const { ucfirst } = require("../utils");
const configStore = require("../config");

exports.createHandler = async function (model, req = {}) {
  try {
    if (!req.body) {
      throw Boom.badRequest("Invalid request");
    }
    try {
      if (
        model.middlewares &&
        model.middlewares.create &&
        model.middlewares.create.pre
      ) {
        req = await model.middlewares.create.pre(req);
      }
    } catch (err) {
      handleError(
        err,
        "There was a preprocessing error creating the resource.",
        Boom.badRequest
      );
    }
    let data = [];
    if (_.isArray(req.body)) {
      data = await model.bulkCreate(req.body, { validate: true });
    } else {
      data = await model.create(req.body);
    }
    try {
      if (
        model.middlewares &&
        model.middlewares.create &&
        model.middlewares.create.post
      ) {
        data = await model.middlewares.create.post(req, data);
      }
    } catch (err) {
      handleError(
        err,
        "There was a postprocessing error creating the resource.",
        Boom.badRequest
      );
    }
    return data;
  } catch (err) {
    throw err;
  }
};

exports.updateHandler = async function (model, req = { query: {} }) {
  try {
    if (!req.params) {
      throw Boom.badRequest("Invalid request");
    }
    try {
      if (
        model.middlewares &&
        model.middlewares.update &&
        model.middlewares.update.pre
      ) {
        req = await model.middlewares.update.pre(req);
      }
    } catch (err) {
      handleError(
        err,
        "There was a preprocessing error updating the resource.",
        Boom.badRequest
      );
    }
    await model.update(req.body, {
      where: { [configStore.get("/dbPrimaryKey").name]: req.params.id },
    });
    let data = await model.findByPk(req.params.id);
    try {
      if (
        model.middlewares &&
        model.middlewares.update &&
        model.middlewares.update.post
      ) {
        data = await model.middlewares.update.post(req, data);
      }
    } catch (err) {
      handleError(
        err,
        "There was a postprocessing error updating the resource.",
        Boom.badRequest
      );
    }
    return data;
  } catch (err) {
    throw err;
  }
};

exports.associationAddOneHandler = async function (
  ownerModel,
  association,
  req = { query: {}, body: {} }
) {
  try {
    if (!req.params) {
      throw Boom.badRequest("Invalid request");
    }
    const { target: childModel, accessors } = association;
    try {
      if (
        ownerModel.middlewares &&
        ownerModel.middlewares.add &&
        ownerModel.middlewares.add[childModel.name] &&
        ownerModel.middlewares.add[childModel.name].pre
      ) {
        req = await ownerModel.middlewares.add[childModel.name].pre(req);
      }
    } catch (err) {
      handleError(
        err,
        "There was a preprocessing error while setting the association.",
        Boom.badRequest
      );
    }
    const owner = await ownerModel.findByPk(req.params.ownerId);
    return await owner[accessors.add](parseInt(req.params.childId), {
      through: { ...req.body },
    });
  } catch (err) {
    throw err;
  }
};

exports.associationAddManyHandler = async function (
  ownerModel,
  association,
  req = { query: {} }
) {
  try {
    if (!req.params || !req.body) {
      throw Boom.badRequest("Invalid request");
    }
    const { target: childModel, accessors, throughModel } = association;
    try {
      if (
        ownerModel.middlewares &&
        ownerModel.middlewares.add &&
        ownerModel.middlewares.add[childModel.name] &&
        ownerModel.middlewares.add[childModel.name].pre
      ) {
        req = await ownerModel.middlewares.add[childModel.name].pre(req);
      }
    } catch (err) {
      handleError(
        err,
        "There was a preprocessing error while setting the association.",
        Boom.badRequest
      );
    }
    const owner = await ownerModel.findByPk(req.params.ownerId);
    if (!owner) {
      throw Boom.badRequest("Invalid request");
    }
    let data = {};
    if (association.through) {
      const { data: body, ...through } = req.body;
      if (body[0] && body[0].constructor === Object) {
        let updateOnDuplicate = [];
        for (const obj of body) {
          updateOnDuplicate = Object.keys(obj);
          obj[
            `${ownerModel.name}${ucfirst(configStore.get("/dbPrimaryKey"))}`
          ] = owner[configStore.get("/dbPrimaryKey").name];
        }
        data = await association.through.model.bulkCreate(body, {
          validate: true,
          updateOnDuplicate,
        });
      } else {
        data = await owner[accessors.addMultiple](body, { through: through });
      }
    } else {
      const { data: body, ...through } = req.body;
      if (body[0].constructor === Object) {
        let updateOnDuplicate = [];
        for (const obj of body) {
          updateOnDuplicate = Object.keys(obj);
          obj[
            `${ownerModel.name}${ucfirst(
              configStore.get("/dbPrimaryKey").name
            )}`
          ] = owner[configStore.get("/dbPrimaryKey").name];
        }
        data = await childModel.bulkCreate(body, {
          validate: true,
          updateOnDuplicate,
        });
      } else {
        const body = req.body.map((obj) => ({
          ...obj,
          [association.foreignKeyField]:
            owner[configStore.get("/dbPrimaryKey").name],
        }));
        data = await childModel.bulkCreate(body, { validate: true });
      }
    }
    return data;
  } catch (err) {
    throw err;
  }
};
