"use strict";

const Boom = require("@hapi/boom");
const _ = require("lodash");
const configStore = require("../config");
const { Logger } = require("../helpers/logger");

exports.addMeta = (action, req) => {
  try {
    let metaType = "";
    switch (action) {
      case "create":
        metaType = "createdBy";
        break;
      case "update":
        metaType = "updatedBy";
        break;
      case "delete":
        metaType = "deletedBy";
        break;
      default:
        throw new Error("Invalid action.");
    }

    const userId = req.auth.credentials.user[configStore.get("/dbPrimaryKey")];
    if (!userId) {
      const message =
        'User id not found in auth credentials. Please specify the user id path in "config.dbPrimaryKey"';
      throw Boom.badRequest(message);
    }

    if (_.isArray(req.body)) {
      req.body.forEach(function (record) {
        record[metaType] = userId;
      });
    } else {
      req.body = req.body || {};
      req.body[metaType] = userId;
    }
  } catch (err) {
    Logger.error(err);
    throw Boom.badImplementation(err);
  }
};
