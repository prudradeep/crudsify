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

const jsonResponse = (description, schema, example) => ({
  description,
  content: {
    "application/json": {
      schema,
      example,
    },
  },
});

const successResponse = (description, example) =>
  jsonResponse(
    description,
    {
      type: "object",
      additionalProperties: true,
    },
    example
  );

const errorResponse = (statusCode, error, message, details) => {
  const example = {
    statusCode,
    error,
    message,
  };

  if (details) {
    example.details = details;
  }

  return jsonResponse(
    error,
    {
      type: "object",
      properties: {
        statusCode: {
          type: "integer",
          example: statusCode,
        },
        error: {
          type: "string",
          example: error,
        },
        message: {
          type: "string",
          example: message,
        },
        details: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: true,
          },
        },
      },
      required: ["statusCode", "error", "message"],
    },
    example
  );
};

const getSuccessExample = (method, path, summary = "") => {
  const normalizedSummary = summary.toLowerCase();
  const isListResponse =
    method === "get" &&
    !path.includes("{") &&
    (normalizedSummary.includes("list") ||
      normalizedSummary.includes("get all"));

  if (isListResponse) {
    return {
      docs: [
        {
          id: "record-id",
        },
      ],
      items: {
        limit: 10,
        begin: 1,
        end: 1,
        total: 1,
      },
      pages: {
        current: 1,
        prev: 0,
        hasPrev: false,
        next: 2,
        hasNext: false,
        total: 1,
      },
    };
  }

  return {
    id: "record-id",
  };
};

const getSwaggerResponses = (method, path, summary) => ({
  200: successResponse("Successful", getSuccessExample(method, path, summary)),
  201: successResponse("Created", {
    id: "record-id",
  }),
  204: {
    description: "The request was completed successfully with no response body.",
  },
  400: errorResponse(400, "Bad Request", "Invalid request", [
    {
      message: "\"field\" is required",
      path: ["field"],
      type: "any.required",
    },
  ]),
  401: errorResponse(
    401,
    "Unauthorized",
    "The authentication header was missing/malformed, or the token has expired."
  ),
  403: errorResponse(403, "Forbidden", "Insufficient scope"),
  404: errorResponse(404, "Not Found", "Resource not found"),
  409: errorResponse(
    409,
    "Conflict",
    "name: 'example' | Resource already exists!"
  ),
  422: errorResponse(
    422,
    "Unprocessable Entity",
    "You cannot delete/update this record because it is linked to related data."
  ),
  428: errorResponse(428, "Precondition Required", "field must not be null"),
  429: errorResponse(
    429,
    "Too Many Requests",
    "Too many requests. Try again later."
  ),
  500: errorResponse(
    500,
    "Internal Server Error",
    "An unexpected error occurred. Please try again later."
  ),
});

const swaggerHelper = async ({
  method,
  path,
  summary,
  tags,
  validate,
  auth,
}) => {
  path = path.replaceAll('?', '');
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
  if (validate.params) {
    const { swagger, component } = j2s(validate.params);
    Object.keys(swagger.properties).forEach((val) => {
      parameters.push({
        name: val,
        schema: {
          type: swagger.properties[val].type,
        },
        in: "path",
        required: swagger.properties[val].nullable?false:true,
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
    responses: getSwaggerResponses(method, path, summary),
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
