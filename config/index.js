"use strict";

require("dotenv").config();

const Confidence = require("confidence");
const dbConfig = require("./config");

const constants = {
  WEB_TITLE: "Crudsify API",
  AUTH_STRATEGIES: {
    TOKEN: "standard-jwt",
    SESSION: "jwt-with-session",
    REFRESH: "jwt-with-session-and-refresh-token",
  },
};

/* The criteria to filter Config values by (NODE_ENV). Typically includes:
 * - development
 * - uat
 * - production
 * - $default
 */
const Config = {
  service: "APIs",
  port: process.env.SERVER_PORT,
  logDir: "./logs/",
  cors: {
    $filter: "env",
    production: {
      origin: "*",
      exposedHeaders: ["X-Access-Token", "X-Refresh-Token"],
    },
    $default: {
      origin: "*",
      exposedHeaders: ["X-Access-Token", "X-Refresh-Token"],
    },
  },
  basicAuth: {
    username: process.env.BASIC_AUTH_USERNAME,
    password: process.env.BASIC_AUTH_PASSWORD,
  },
  database: {
    $meta: "Database configuration",
    $filter: "env",
    uat: dbConfig.uat,
    production: dbConfig.production,
    $default: dbConfig.development,
  },
  dbPrimaryKey: {
    $filter: "env",
    production: {
      name: "id",
      type: "BIGINT",
      autoIncrement: true,
    },
    $default: {
      name: "idKey",
      type: "BIGINT",
      autoIncrement: true,
    },
  },

  /**
   * Timestamps options:
   * - timestamps: (default: true) specifying to create timestamps for the document
   * - createdAt: Give a custom name to the createdAt column or false
   * - updatedAt: Give a custom name to the updatedAt column or false
   * - paranoid: (default: true) specifying a soft-deletion of documents, instead of a hard-deletion
   * - deletedAt: Give a custom name to the deletedAt column
   */
  modelOptions: {
    timestamps: true,
    paranoid: true,
  },

  /**
   * MetaData options
   * - createdBy: dbPrimaryKey of user that created the document.
   * - updatedBy: dbPrimaryKey of user that last updated the document.
   * - deletedBy: dbPrimaryKey of user that soft deleted the document.
   */
  enableCreatedBy: {
    $filter: "env",
    production: true,
    $default: true,
  },
  enableUpdatedBy: {
    $filter: "env",
    production: true,
    $default: true,
  },
  enableDeletedBy: {
    $filter: "env",
    production: true,
    $default: true,
  },

  /**
   * Authentication strategy to be used for all generated endpoints.
   * Set to false for no authentication.
   * @type {boolean/string}
   */
  authStrategy: {
    $filter: "env",
    production: constants.AUTH_STRATEGIES.REFRESH,
    $default: constants.AUTH_STRATEGIES.REFRESH,
  },

  /**
   * If set to true, (and authStrategy is not false) then endpoints will be generated with pre-defined
   * scopes based on the model definition.
   * default: false
   * @type {boolean}
   */
  generateRouteScopes: false,

  /**
   * Salt rounds for generating hash
   */
  saltRounds: {
    $filter: "env",
    production: 15,
    uat: 12,
    $default: 10,
  },

  /**
   * Secret for JWT token creation and algo
   */
  jwt: {
    secret: process.env.JWT_SECRET,
    algo: "RS512",
  },

  /**
   * Logging configuration
   */
  logLevel: {
    $filter: "env",
    uat: "verbose",
    production: "error",
    $default: "silly",
  },

  enableSwagger: {
    $filter: "env",
    production: false,
    $default: true,
  },
  /**
   * Set swagger options as per https://github.com/swagger-api/swagger-ui/blob/master/docs/usage/configuration.md
   * Options set here will override swagger config options below
   * @type {Object}
   */
  swaggerOptions: {
    $filter: "env",
    production: {
      explorer: true,
      swaggerOptions: {
        docExpansion: "none",
      },
      customSiteTitle: constants.WEB_TITLE,
    },
    $default: {
      explorer: true,
      swaggerOptions: {
        docExpansion: "none",
      },
      customSiteTitle: constants.WEB_TITLE,
    },
  },
};

const configStore = new Confidence.Store(Config);

const criteria = {
  env: process.env.NODE_ENV,
};
exports.get = function (key) {
  return configStore.get(key, criteria);
};

exports.meta = function (key) {
  return configStore.meta(key, criteria);
};
