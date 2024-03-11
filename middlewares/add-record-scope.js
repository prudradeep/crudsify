"use strict";

const Boom = require("@hapi/boom");
const _ = require("lodash");
const md5 = require("md5");
const configStore = require("../config");

exports.addAuthRecordCreatorSope = (model) => {
  return (req, res, next) => {
    try {
      const userId =
        req.auth.credentials.user[configStore.get("/dbPrimaryKey").name];
      if (!userId) {
        const message =
          'User id not found in auth credentials. Please specify the user id path in "config.dbPrimaryKey"';
        throw Boom.badRequest(message);
      }
      const authRecordCreator = configStore.get("/authorizeRecordCreator");
      Object.keys(authRecordCreator).forEach((scopeType) => {
        if (
          authRecordCreator[scopeType] ||
          model.authorizeRecordCreator[scopeType]
        ) {
          if (_.isArray(req.body)) {
            req.body.forEach(function (record) {
              let _scope = record[configStore.get("/recordScopeKey")] || {};
              _scope[scopeType] = _scope[scopeType] || [];
              _scope[scopeType].push("user-" + md5(userId));
              record[configStore.get("/recordScopeKey")] = _scope;
            });
          } else {
            req.body = req.body || {};

            let _scope = req.body[configStore.get("/recordScopeKey")] || {};
            _scope[scopeType] = _scope[scopeType] || [];
            _scope[scopeType].push("user-" + md5(userId));
            req.body[configStore.get("/recordScopeKey")] = _scope;
          }
        }
      });
      next();
    } catch (err) {
      next(err)
    }
  };
};

exports.addRecordScope = (model) => {
  return (req, res, next) => {
    try {
      const scope = model.recordScope;
      if (scope) {
        for (const scopeType in scope) {
          if (_.isArray(req.body)) {
            req.body.forEach(function (record) {
              let _scope = record[configStore.get("/recordScopeKey")] || {};
              _scope[scopeType] = _scope[scopeType] || [];
              _scope[scopeType] = _scope[scopeType].concat(scope[scopeType]);
              record[configStore.get("/recordScopeKey")] = _scope;
            });
          } else {
            req.body = req.body || {};

            let _scope = req.body[configStore.get("/recordScopeKey")] || {};
            _scope[scopeType] = _scope[scopeType] || [];
            _scope[scopeType] = _scope[scopeType].concat(scope[scopeType]);
            req.body[configStore.get("/recordScopeKey")] = _scope;
          }
        }
      }
      next();
    } catch (err) {
      next(err)
    }
  };
};
