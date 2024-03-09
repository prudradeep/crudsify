"use strict";

const Boom = require("@hapi/boom");
const _ = require("lodash");
const configStore = require("../config");
const { Logger } = require("../helpers/logger");

exports.addRecordScope = (model, req) => {
  try {
    /* const userId = req.auth.credentials.user[configStore.get("/dbPrimaryKey")];
    if (!userId) {
      const message =
        'User id not found in auth credentials. Please specify the user id path in "config.dbPrimaryKey"';
      throw Boom.badRequest(message);
    } */
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
  } catch (err) {
    Logger.error(err);
    throw Boom.badImplementation(err);
  }
};
