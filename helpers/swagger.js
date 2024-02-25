"use strict";

const express = require("express");
const swaggerRouter = express.Router();
const configStore = require("../config");
const swaggerUi = require("swagger-ui-express");
const j2s = require("joi-to-swagger");
const swaggerData = require("../config/swagger");
const { basicAuthMiddleware } = require("../middlewares/auth");
const { sortObjectByKeys } = require("../utils");

const queryParam = (name, type, description, items = false) => {
  let param = {
    name,
    schema: {
      type,
    },
    in: "query",
    description,
  };
  if (items) {
    param.schema.items = items;
  }
  return param;
};

const swaggerHelper = async ({
  method,
  path,
  summary,
  tags,
  validate,
  auth,
}) => {
  if (!swaggerData.paths[`${path}`]) swaggerData.paths[`${path}`] = {};

  let requestBody = {};
  let parameters = [];

  if (validate.body) {
    const { swagger, component } = j2s(validate.body);
    requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: swagger,
        },
      },
    };
  }
  if (validate.form) {
    const { swagger, component } = j2s(validate.form);
    requestBody = {
      required: true,
      content: {
        "multipart/form-data": {
          schema: swagger,
        },
      },
    };
  }
  if (validate.param) {
    const { swagger, component } = j2s(validate.param);
    Object.keys(swagger.properties).forEach((val) => {
      parameters.push({
        name: val,
        schema: {
          type: swagger.properties[val].type,
        },
        in: "path",
        required: true,
        description: swagger.properties[val].description,
      });
    });
  }
  if (validate.query) {
    const { swagger, component } = j2s(validate.query);
    Object.keys(swagger.properties).forEach((val) => {
      if (swagger.properties[val].anyOf) {
        if (val === "$embed") {
          parameters.push(
            queryParam(
              val,
              swagger.properties[val].anyOf[0].type,
              swagger.properties[val].anyOf[0].description
            )
          );
        } else {
          parameters.push(
            queryParam(
              val,
              swagger.properties[val].anyOf[0].type,
              swagger.properties[val].anyOf[0].description,
              swagger.properties[val].anyOf[1]
            )
          );
        }
      } else {
        parameters.push(
          queryParam(
            val,
            swagger.properties[val].type,
            swagger.properties[val].description
          )
        );
      }
    });
  }

  swaggerData.paths[path][method] = {
    summary: summary,
    tags: tags,
    requestBody: requestBody,
    parameters: parameters,
    responses: {
      200: {
        description: "Successful",
      },
      201: {
        description: "Created",
      },
      204: {
        description: "The resource(s) was/were found successfully.",
      },
      400: {
        description: "Bad Request",
      },
      401: {
        description:
          "The authentication header was missing/malformed, or the token has expired.",
      },
      403: {
        description: "Forbidden",
      },
      404: {
        description: "Not Found",
      },
      408: {
        description: "Request Time-out",
      },
      409: {
        description: "Conflict",
      },
      413: {
        description: "Request Entity Too Large",
      },
      419: {
        description: "Query Error",
      },
      422: {
        description: "Unprocessable Entity",
      },
      429: {
        description: "Too Many Requests",
      },
      500: {
        description: "Internal Server Error",
      },
      501: {
        description: "Not Implemented",
      },
      502: {
        description: "Bad Gateway",
      },
      503: {
        description: "There was a problem with the database.",
      },
      504: {
        description: "Request Timeout Error",
      },
    },
  };

  if (auth) {
    swaggerData.paths[path][method].security = [
      {
        bearerAuth: [],
      },
    ];
  }

  swaggerData.paths = sortObjectByKeys(swaggerData.paths);
  swaggerRouter.use(basicAuthMiddleware);
  swaggerRouter.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerData, configStore.get("/swaggerOptions"))
  );
};
module.exports = { swaggerHelper, swaggerRouter };
