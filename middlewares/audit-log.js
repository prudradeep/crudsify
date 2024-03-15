"use strict";

const _ = require("lodash");
const configStore = require("../config");
const { getIP } = require("../utils");
const { AuditLogger } = require("../helpers/logger");
const { AUDIT_LOG_STORAGE } = require("../config/constants");

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
      if (configStore.get("/authentication"))
        userId =
          req.auth.credentials.user[configStore.get("/dbPrimaryKey").name];
      let records = res.data;
      if (records) {
        if (_.isArray(records)) {
          records = records.map(function (doc) {
            return doc[configStore.get("/dbPrimaryKey").name];
          });
        } else {
          records = [records[configStore.get("/dbPrimaryKey").name]];
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
        records: records || [],
        payload: _.isEmpty(req.body) ? [] : req.body,
        params: _.isEmpty(req.params) ? [] : req.params,
        result: res.data || [],
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
      if (configStore.get("/authentication"))
        userId =
          req.auth.credentials.user[configStore.get("/dbPrimaryKey").name];
      const records = [req.params.id];
      const log = {
        method: "PUT",
        action: "Update",
        endpoint: req.path,
        user: userId || null,
        collectionName: model.name,
        childCollectionName: null,
        associationType: null,
        records: records || null,
        payload: _.isEmpty(req.body) ? null : req.body,
        params: _.isEmpty(req.params) ? null : req.params,
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
      if (configStore.get("/authentication"))
        userId =
          req.auth.credentials.user[configStore.get("/dbPrimaryKey").name];
      let records = req.params.id || req.body.data;

      const log = {
        method: "DELETE",
        action: "Delete",
        endpoint: req.path,
        user: userId || null,
        collectionName: model.name,
        childCollectionName: null,
        associationType: null,
        records: records || null,
        payload: _.isEmpty(req.body) ? null : req.body,
        params: _.isEmpty(req.params) ? null : req.params,
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
      if (configStore.get("/authentication"))
        userId =
          req.auth.credentials.user[configStore.get("/dbPrimaryKey").name];
      let records = [req.params.ownerId];

      if (req.params.childId) {
        records.push(req.params.childId);
      } else {
        records = records.concat(req.body.data);
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
        records: records || null,
        payload: _.isEmpty(req.body) ? null : req.body,
        params: _.isEmpty(req.params) ? null : req.params,
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
      if (configStore.get("/authentication"))
        userId =
          req.auth.credentials.user[configStore.get("/dbPrimaryKey").name];
      let records = [req.params.ownerId];

      if (req.params.childId) {
        records.push(req.params.childId);
      } else {
        records = records.concat(req.body);
      }

      const log = {
        method: "DELETE",
        action: "Remove",
        endpoint: req.path,
        user: userId || null,
        collectionName: ownerModel.name,
        childCollectionName: childModel.name,
        associationType: associationType,
        records: records || null,
        payload: _.isEmpty(req.body) ? null : req.body,
        params: _.isEmpty(req.params) ? null : req.params,
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
  if (configStore.get("/enableAuditLog")) {
    return async (req, res, next) => {
      try {
        const ipAddress = getIP(req);
        let userId = null;
        if (configStore.get("/authentication"))
          userId = req.auth
            ? req.auth.credentials.user[configStore.get("/dbPrimaryKey").name]
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
          records: options.records || null,
          payload: _.isEmpty(payload) ? null : payload,
          params: _.isEmpty(req.params) ? null : req.params,
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
  }
};

exports.saveLogMiddleware = (req, res, next) => {
  try {
    if (configStore.get("/enableAuditLog")) {
      if (req.auditLog) {
        if (configStore.get("/auditLogStorage") === AUDIT_LOG_STORAGE.FILE) {
          AuditLogger.log("audit", JSON.stringify(req.auditLog));
        } else if (
          configStore.get("/auditLogStorage") === AUDIT_LOG_STORAGE.DB
        ) {
          const { auditLog } = require("../models");
          const emptyJSON = [];
          if (!req.auditLog.records) req.auditLog.records = emptyJSON;

          if (!req.auditLog.payload) req.auditLog.payload = emptyJSON;

          if (!req.auditLog.params) req.auditLog.params = emptyJSON;

          if (!req.auditLog.result) req.auditLog.result = emptyJSON;

          auditLog.create(req.auditLog);
        }
      }
    }
  } catch (err) {
    next(err);
  }
};
