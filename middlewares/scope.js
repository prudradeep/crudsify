"use strict";

const Hoek = require("@hapi/hoek");
const Boom = require("@hapi/boom");

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
      next(
        Boom.forbidden("Insufficient scope", {
          got: req.auth.credentials.scope,
          need: scopeErrors,
        })
      );
    } else {
      next();
    }
  };
};
