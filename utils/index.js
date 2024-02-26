"use strict";

const Bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const Jwt = require("jsonwebtoken");
const configStore = require("../config");

module.exports = {
  ucfirst: function (string) {
    return string.charAt(0).toUpperCase() + string.substring(1).toLowerCase();
  },
  sortObjectByKeys: (o) => {
    return Object.keys(o)
      .sort()
      .reduce((r, k) => ((r[k] = o[k]), r), {});
  },
  generateHash: (key = false) => {
    if (!key) key = uuidv4();

    try {
      let salt = Bcrypt.genSaltSync(configStore.get("/saltRounds"));
      let hash = Bcrypt.hashSync(key, salt);
      return { key, hash };
    } catch (err) {
      throw err;
    }
  },
  getIP: (req) => {
    return (
      req.headers["x-real-ip"] ||
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.ip
    );
  },
  getUserSession: async (sessionId, sessionKey) => {
    try {
      const { user: User, session: Session, role } = require("../models");
      const session = await Session.findByCredentials(sessionId, sessionKey);
      if(!session){
        return {user: null, session};
      }
      const user = await User.unscoped().findByPk(
        session[`user${this.ucfirst(configStore.get("/dbPrimaryKey"))}`],
        { include: { model: role } }
      );
      return { user, session };
    } catch (err) {
      throw err;
    }
  },
  generateToken: (data, expirationPeriod) => {
    try {
      const jwtConfig = configStore.get("/jwt");
      return Jwt.sign(data, jwtConfig.secret, {
        algorithm: jwtConfig.algo,
        expiresIn: expirationPeriod,
      });
    } catch (err) {
      throw err;
    }
  },
  getScopes: (model, type) => {
    const routeScope = model.routeScopes || {};
    const rootScope = routeScope.rootScope;
    let scope = [];

    let additionalScope = null;

    switch (type) {
      case "create":
        additionalScope = routeScope.createScope;
        break;
      case "read":
        additionalScope = routeScope.readScope;
        break;
      case "update":
        additionalScope = routeScope.updateScope;
        break;
      case "delete":
        additionalScope = routeScope.deleteScope;
        break;
      case "associate":
        additionalScope = routeScope.associateScope;
        break;
      default:
        if (routeScope[type]) {
          scope = routeScope[type];
          if (!_.isArray(scope)) {
            scope = [scope];
          }
        }
        return scope;
    }

    if (rootScope && _.isArray(rootScope)) {
      scope = scope.concat(rootScope);
    } else if (rootScope) {
      scope.push(rootScope);
    }

    if (additionalScope && _.isArray(additionalScope)) {
      scope = scope.concat(additionalScope);
    } else if (additionalScope) {
      scope.push(additionalScope);
    }

    return scope;
  },
  getPathName: (model) => {
    let routePath = model.name;
    if (model.routeOptions.alias) routePath = model.routeOptions.alias;
    return routePath;
  },
  getModelName: (model) => {
    return model.name;
  },
};
