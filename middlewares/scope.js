"use strict";

const Hoek = require("@hapi/hoek");
const Boom = require("@hapi/boom");
const { fn, json, Op } = require("sequelize");
const configStore = require("../config");

const setupScope = function (scopes) {
  if (!scopes) return false;

  const scope = {};
  for (const value of scopes) {
    const prefix = value[0];
    const type =
      prefix === "+" ? "required" : prefix === "!" ? "forbidden" : "selection";
    const clean = type === "selection" ? value : value.slice(1);
    scope[type] = scope[type] || [];
    scope[type].push(clean);

    if (
      (!scope._hasParameters || !scope._hasParameters[type]) &&
      /{([^}]+)}/.test(clean)
    ) {
      scope._hasParameters = scope._hasParameters || {};
      scope._hasParameters[type] = true;
    }
  }

  return scope;
};

const expandScopeType = function (req, scope, type) {
  if (!scope._hasParameters[type]) {
    return scope[type];
  }

  const expanded = [];
  const context = {
    params: req.params,
    query: req.query,
    payload: req.body,
    credentials: req.auth.credentials,
  };

  for (const template of scope[type]) {
    expanded.push(Hoek.reachTemplate(context, template));
  }

  return expanded;
};

const expandScope = function (request, scope) {
  if (!scope._hasParameters) {
    return scope;
  }

  const expanded = {
    required: expandScopeType(request, scope, "required"),
    selection: expandScopeType(request, scope, "selection"),
    forbidden: expandScopeType(request, scope, "forbidden"),
  };

  return expanded;
};

const validateScope = function (credentials, scope, type) {
  if (!scope[type]) {
    return true;
  }

  const count =
    typeof credentials.scope === "string"
      ? scope[type].indexOf(credentials.scope) !== -1
        ? 1
        : 0
      : Hoek.intersect(scope[type], credentials.scope).length;

  if (type === "forbidden") {
    return count === 0;
  }

  if (type === "required") {
    return count === scope.required.length;
  }

  return !!count;
};

exports.getScopeMiddleware = (SCOPE) => {
  return (req, res, next) => {
    try {
      const scopeErrors = [];
      let scope = setupScope(SCOPE);
      if (scope) {
        if (!req.auth.credentials.scope) {
          scopeErrors.push(scope);
        }

        scope = expandScope(req, scope);
        if (
          !validateScope(req.auth.credentials, scope, "required") ||
          !validateScope(req.auth.credentials, scope, "selection") ||
          !validateScope(req.auth.credentials, scope, "forbidden")
        ) {
          scopeErrors.push(scope);
        }
      }

      if (scopeErrors.length) {
        next(Boom.forbidden("Insufficient scope"));
        /* const err = Boom.forbidden("Insufficient scope");
        err.output.payload.details = {
          got: req.auth.credentials.scope,
          need: scopeErrors,
        };
        res.status(err.output.payload.statusCode).send(err.output.payload); */
      } else {
        next();
      }
    } catch (err) {
      next(err);
    }
  };
};

const validateRecordScope = (record, action, req) => {
  const scopeErrors = [];
  const recordScope = record[configStore.get("/recordScopeKey")];
  if (!recordScope) return true;

  const actionScope = recordScope[action].concat(recordScope.root);
  let scope = setupScope(actionScope);
  if (scope) {
    if (!req.auth.credentials.scope) {
      scopeErrors.push(scope);
    }

    scope = expandScope(req, scope);
    if (
      !validateScope(req.auth.credentials, scope, "required") ||
      !validateScope(req.auth.credentials, scope, "selection") ||
      !validateScope(req.auth.credentials, scope, "forbidden")
    ) {
      scopeErrors.push(scope);
    }
  }
  if (scopeErrors.length) return false;
  return true;
};

exports.getRecordScopeMiddleware = (action, model) => {
  return async (req, res, next) => {
    try {
      const id = action !== "associate" ? req.params.id : req.params.ownerId;
      if (id === undefined && action === "delete") {
        const data = await model.findAll({
          attributes: [
            configStore.get("/dbPrimaryKey").name,
            configStore.get("/recordScopeKey"),
          ],
          where: { [configStore.get("/dbPrimaryKey").name]: req.body.data },
        });
        data.forEach((record) => {
          const valid = validateRecordScope(record, action, req);
          if (!valid) {
            //Remove unauthorized ids from delete request
            const index = req.body.data.indexOf(
              record[configStore.get("/dbPrimaryKey").name]
            );
            req.body.data.splice(index, 1);
          }
        });
        if (req.body.data.length <= 0) {
          return next(Boom.forbidden("Insufficient record scope"));
        }
        return next();
      }
      if (id === undefined && action === "read") {
        req.recordReadAuth = {
          [Op.or]: [
            fn(
              "JSON_OVERLAPS",
              json(`${configStore.get("/recordScopeKey")}.read`),
              JSON.stringify(req.auth.credentials.scope)
            ),
            fn(
              "JSON_OVERLAPS",
              json(`${configStore.get("/recordScopeKey")}.root`),
              JSON.stringify(req.auth.credentials.scope)
            ),
          ],
        };
        return next();
      }
      const data = await model.findByPk(id, {
        attributes: [configStore.get("/recordScopeKey")],
      });
      const valid = validateRecordScope(data, action, req);
      if (!valid) {
        next(Boom.forbidden("Insufficient record scope"));
      } else {
        next();
      }
    } catch (err) {
      next(err);
    }
  };
};
