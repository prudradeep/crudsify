"use strict";

const {
  createHandler,
  updateHandler,
  associationAddOneHandler,
  associationAddManyHandler,
} = require("../handlers/create");
const {
  listHandler,
  findHandler,
  associationGetAllHandler,
} = require("../handlers/list");
const {
  deleteHandler,
  associationRemoveOneHandler,
  associationRemoveManyHandler,
} = require("../handlers/remove");
const { sendResponse } = require("../helpers/sendResponse");

exports.listMiddleware = function (DB, model) {
  return async function (req, res, next) {
    try {
      const data = await listHandler(DB, model, req);
      sendResponse({
        data,
        status: 200,
        res,
        next,
      });
    } catch (err) {
      req.model = model;
      next(err);
    }
  };
};

exports.findMiddleware = function (DB, model) {
  return async function (req, res, next) {
    try {
      const data = await findHandler(DB, model, req);
      sendResponse({
        data,
        status: 200,
        res,
        next,
      });
    } catch (err) {
      req.model = model;
      next(err);
    }
  };
};

exports.createMiddleware = function (model) {
  return async function (req, res, next) {
    try {
      const data = await createHandler(model, req);
      res.data = data;
      sendResponse({
        data,
        status: 201,
        res,
        next,
      });
    } catch (err) {
      req.model = model;
      next(err);
    }
  };
};

exports.deleteMiddleware = function (model) {
  return async function (req, res, next) {
    try {
      await deleteHandler(model, req);
      sendResponse({
        status: 204,
        res,
        next,
      });
    } catch (err) {
      req.model = model;
      next(err);
    }
  };
};

exports.updateMiddleware = function (model) {
  return async function (req, res, next) {
    try {
      const data = await updateHandler(model, req);
      res.data = data;
      sendResponse({
        data,
        status: 204,
        res,
        next,
      });
    } catch (err) {
      req.model = model;
      next(err);
    }
  };
};

exports.associationGetAllMiddleware = function (DB, ownerModel, association) {
  return async function (req, res, next) {
    try {
      const data = await associationGetAllHandler(
        DB,
        ownerModel,
        association,
        req
      );
      sendResponse({
        data,
        status: 200,
        res,
        next,
      });
    } catch (err) {
      req.model = ownerModel;
      next(err);
    }
  };
};

exports.associationAddOneMiddleware = function (ownerModel, association) {
  return async function (req, res, next) {
    try {
      const data = await associationAddOneHandler(ownerModel, association, req);
      res.data = data;
      sendResponse({
        data,
        status: 201,
        res,
        next,
      });
    } catch (err) {
      req.model = ownerModel;
      next(err);
    }
  };
};

exports.associationAddManyMiddleware = function (ownerModel, association) {
  return async function (req, res, next) {
    try {
      const data = await associationAddManyHandler(
        ownerModel,
        association,
        req
      );
      res.data = data;
      sendResponse({
        data,
        status: 201,
        res,
        next,
      });
    } catch (err) {
      req.model = ownerModel;
      next(err);
    }
  };
};

exports.associationRemoveOneMiddleware = function (ownerModel, association) {
  return async function (req, res, next) {
    try {
      await associationRemoveOneHandler(ownerModel, association, req);
      sendResponse({
        status: 204,
        res,
        next,
      });
    } catch (err) {
      req.model = ownerModel;
      next(err);
    }
  };
};

exports.associationRemoveManyMiddleware = function (ownerModel, association) {
  return async function (req, res, next) {
    try {
      await associationRemoveManyHandler(ownerModel, association, req);
      sendResponse({
        status: 204,
        res,
        next,
      });
    } catch (err) {
      req.model = ownerModel;
      next(err);
    }
  };
};
