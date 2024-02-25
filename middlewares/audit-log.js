"use strict";

const _ = require("lodash");
const configStore = require("../config");
const { getIP } = require("../utils");

/**
 * Middleware to log create actions.
 * @param model
 * @returns {anonymous function}
 */
exports.logCreateMiddleware = (model) => {
  return async (req, res, next) => {
    try {
      const ipAddress = getIP(req);
      let userId = null;
      if (configStore.get("/authStrategy"))
        userId = req.auth.credentials.user[configStore.get("/dbPrimaryKey")];
      let documents = res.data;
      if (documents) {
        if (_.isArray(documents)) {
          documents = documents.map(function (doc) {
            return doc[configStore.get("/dbPrimaryKey")];
          });
        } else {
          documents = [documents[configStore.get("/dbPrimaryKey")]];
        }
      }

      const log = {
        method: "POST",
        action: "Create",
        endpoint: req.path,
        user: userId || null,
        collectionName: model.name,
        childCollectionName: null,
        associationType: null,
        documents: documents || null,
        payload: _.isEmpty(req.body) ? null : JSON.stringify(req.body),
        params: _.isEmpty(req.params) ? null : JSON.stringify(req.params),
        result: res.data || null,
        isError: _.isError(req.res),
        statusCode: res.statusCode || null,
        responseMessage: res.statusMessage || null,
        ipAddress,
      };
      req.auditLog = log;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Middleware to log update actions.
 * @param model
 * @returns {anonymous function}
 */
exports.logUpdateMiddleware = (model) => {
  return async (req, res, next) => {
    try {
      const ipAddress = getIP(req);
      let userId = null;
      if (configStore.get("/authStrategy"))
        userId = req.auth.credentials.user[configStore.get("/dbPrimaryKey")];
      const documents = [req.params.id];
      const log = {
        method: "PUT",
        action: "Update",
        endpoint: req.path,
        user: userId || null,
        collectionName: model.name,
        childCollectionName: null,
        associationType: null,
        documents: documents || null,
        payload: _.isEmpty(req.body) ? null : JSON.stringify(req.body),
        params: _.isEmpty(req.params) ? null : JSON.stringify(req.params),
        result: res.data || null,
        isError: _.isError(req.res),
        statusCode: res.statusCode || null,
        responseMessage: res.statusMessage || null,
        ipAddress,
      };
      req.auditLog = log;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Middleware to log delete actions.
 * @param model
 * @returns {anonymous function}
 */
exports.logDeleteMiddleware = (model) => {
  return async (req, res, next) => {
    try {
      const ipAddress = getIP(req);
      let userId = null;
      if (configStore.get("/authStrategy"))
        userId = req.auth.credentials.user[configStore.get("/dbPrimaryKey")];
      let documents = req.params.id || req.body.data;

      const log = {
        method: "DELETE",
        action: "Delete",
        endpoint: req.path,
        user: userId || null,
        collectionName: model.name,
        childCollectionName: null,
        associationType: null,
        documents: documents || null,
        payload: _.isEmpty(req.body) ? null : JSON.stringify(req.body),
        params: _.isEmpty(req.params) ? null : JSON.stringify(req.params),
        result: res.data || null,
        isError: _.isError(req.res),
        statusCode: res.statusCode || null,
        responseMessage: res.statusMessage || null,
        ipAddress,
      };
      req.auditLog = log;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Middleware to log add actions.
 * @param model
 * @returns {anonymous function}
 */
exports.logAddMiddleware = (ownerModel, childModel, associationType) => {
  return async (req, res, next) => {
    try {
      const ipAddress = getIP(req);
      let userId = null;
      if (configStore.get("/authStrategy"))
        userId = req.auth.credentials.user[configStore.get("/dbPrimaryKey")];
      let documents = [req.params.ownerId];

      if (req.params.childId) {
        documents.push(req.params.childId);
      } else {
        documents = documents.concat(req.body.data);
      }

      let method = "POST";

      if (req.method === "PUT") {
        method = "PUT";
      }

      const log = {
        method: method,
        action: "Add",
        endpoint: req.path,
        user: userId || null,
        collectionName: ownerModel.name,
        childCollectionName: childModel.name,
        associationType: associationType,
        documents: documents || null,
        payload: _.isEmpty(req.body) ? null : JSON.stringify(req.body),
        params: _.isEmpty(req.params) ? null : JSON.stringify(req.params),
        result: res.data || null,
        isError: _.isError(req.res),
        statusCode: res.statusCode || null,
        responseMessage: res.statusMessage || null,
        ipAddress,
      };
      req.auditLog = log;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Middleware to log remove actions.
 * @param model
 * @returns {anonymous function}
 */
exports.logRemoveMiddleware = (ownerModel, childModel, associationType) => {
  return async (req, res, next) => {
    try {
      const ipAddress = getIP(req);
      let userId = null;
      if (configStore.get("/authStrategy"))
        userId = req.auth.credentials.user[configStore.get("/dbPrimaryKey")];
      let documents = [req.params.ownerId];

      if (req.params.childId) {
        documents.push(req.params.childId);
      } else {
        documents = documents.concat(req.body);
      }

      const log = {
        method: "DELETE",
        action: "Remove",
        endpoint: req.path,
        user: userId || null,
        collectionName: ownerModel.name,
        childCollectionName: childModel.name,
        associationType: associationType,
        documents: documents || null,
        payload: _.isEmpty(req.body) ? null : JSON.stringify(req.body),
        params: _.isEmpty(req.params) ? null : JSON.stringify(req.params),
        result: res.data || null,
        isError: _.isError(req.res),
        statusCode: res.statusCode || null,
        responseMessage: res.statusMessage || null,
        ipAddress,
      };
      req.auditLog = log;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Middleware to log api actions.
 * @param model
 * @returns {anonymous function}
 */
exports.logApiMiddleware = (options = {}) => {
  return async (req, res, next) => {
    try {
      const ipAddress = getIP(req);
      let userId = null;
      if (configStore.get("/authStrategy"))
        userId = req.auth
          ? req.auth.credentials.user[configStore.get("/dbPrimaryKey")]
          : null;

      let payload = {};
      if (options.payloadFilter) {
        payload = _.pick(req.body, options.payloadFilter);
      } else {
        payload = req.body;
      }

      const log = {
        method: req.method.toUpperCase(),
        action: options.action || null,
        endpoint: req.path,
        user: userId || null,
        collectionName: options.name || null,
        childCollectionName: options.child ? options.child.name : null,
        associationType: options.associationType || null,
        documents: options.documents || null,
        payload: _.isEmpty(payload) ? null : JSON.stringify(payload),
        params: _.isEmpty(req.params) ? null : JSON.stringify(req.params),
        result: res.data || null,
        isError: _.isError(req.res),
        statusCode: res.statusCode || null,
        responseMessage: res.statusMessage || null,
        ipAddress,
      };
      req.auditLog = log;
      next();
    } catch (err) {
      next(err);
    }
  };
};

exports.saveLogMiddleware = (req, res, next) => {
  try {
    if (req.auditLog) {
      console.log(req.auditLog);
      next();
    }
  } catch (err) {
    next(err);
  }
};
