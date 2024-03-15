"use strict";

require("dotenv").config();

const Confidence = require("confidence");
const fs = require("fs");
const path = require("path");
const dbConfig = require("./config");
const constants = require("./constants");

let userConfig = {};
const userConfigPath = path.join(__dirname, "/../../../", "config", "index.js");
if (fs.existsSync(userConfigPath)) userConfig = require(userConfigPath);

/* The criteria to filter Config values by (NODE_ENV). Typically includes:
 * - development
 * - uat
 * - production
 * - $default
 */
const Config = {
  service: "APIs",
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
   * Flag signifying whether the absolute path to the models directory is provided
   * default: false
   * @type {boolean}
   */
  absoluteModelPath: false,

  /**
   * Path to the models directory
   * default: 'models'
   * @type {string}
   */
  modelPath: "models",

  /**
   * Use existing models & apis of crudsify
   * default: true
   * @type {boolean}
   */
  enableCrudsifyModelsApis: true,

  /**
   * Timestamps options:
   * - timestamps: (default: true) specifying to create timestamps for the record
   * - createdAt: Give a custom name to the createdAt column or false
   * - updatedAt: Give a custom name to the updatedAt column or false
   * - paranoid: (default: true) specifying a soft-deletion of records, instead of a hard-deletion
   * - deletedAt: Give a custom name to the deletedAt column
   */
  modelOptions: {
    timestamps: true,
    paranoid: true,
  },

  /**
   * MetaData options
   * - createdBy: dbPrimaryKey of user that created the record.
   * - updatedBy: dbPrimaryKey of user that last updated the record.
   * - deletedBy: dbPrimaryKey of user that soft deleted the record.
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
   * Default limit to fetch records
   */
  limit: {
    $filter: "env",
    production: 20,
    $default: 20,
  },

  /**
   * Authentication to be used for all generated endpoints.
   * Set to false for no authentication.
   * @type {boolean}
   */
  authentication: true,

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
   * Enables record level authorization.
   * default: false
   * @type {boolean}
   */
  enableRecordScopes: true,

  /**
   * If set, (and enableRecordScopes is not false) then recordScopeKey will be added in the model definition.
   * default: recordScope
   * @type {string}
   */
  recordScopeKey: "recordScope",

  /**
   * If properties are true, modifies the scope of any record to allow access to the record's creator.
   * The scope value added is in the form: "user-{dbPrimaryKey}" where "{dbPrimaryKey}" is the primary key of the user.
   * NOTE:
   * - This assumes that your authentication credentials (req.auth.credentials) will contain either
   * a "user" object with a "dbPrimaryKey" property.
   * - This also assumes that the user creating the record will have "user-{dbPrimaryKey}" within their scope.
   * - Requires "enableRecordScopes" to be "true".
   * - This setting can be individually overwritten by setting the "authorizeRecordCreator" property of the model.
   * default: false
   * @type {boolean}
   */
  authorizeRecordCreator: {
    root: false,
    read: false,
    update: false,
    delete: false,
    associate: false,
  },

  /**
   * If set to true, (and authentication is not false) then endpoints will be generated with pre-defined
   * scopes based on the model definition.
   * default: false
   * @type {boolean}
   */
  generateRouteScopes: true,

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
    algo: "HS256",
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

  logRoutes: {
    $filter: "env",
    production: false,
    $default: true,
  },
  logScopes: {
    $filter: "env",
    production: false,
    $default: false,
  },
  logQuery: {
    $filter: "env",
    production: false,
    $default: true,
  },

  enableAuditLog: {
    $filter: "env",
    production: true,
    $default: true,
  },
  /**
   * Specifies audit log storage
   * default: database
   * available: database | file
   */
  auditLogStorage: {
    $filter: "env",
    production: constants.AUDIT_LOG_STORAGE.DB,
    $default: constants.AUDIT_LOG_STORAGE.DB,
  },
  /**
   * Specifies the TTL (time to live/lifetime/expiration) of auditLog records. Accepts values in seconds unless specified
   * (Ex: 60 = 60 seconds, '1m' = 1 minute, or '1d' = 1 day)
   * See: http://nicoll.io/mongottl/
   * default: null (does not expire)
   * @type {string}
   */
  auditLogTTL: {
    $filter: "env",
    production: "60d",
    $default: "20d",
  },

  enablePolicies: {
    $filter: "env",
    production: true,
    $default: true,
  },
  enablePayloadValidation: {
    $filter: "env",
    production: true,
    $default: true,
  },
  enableQueryValidation: {
    $filter: "env",
    production: true,
    $default: true,
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
      customSiteTitle: process.env.TITLE,
    },
    $default: {
      explorer: true,
      swaggerOptions: {
        docExpansion: "none",
      },
      customSiteTitle: process.env.TITLE,
    },
  },

  /**
   * Flag signifying whether the absolute path to the apis directory is provided
   * default: false
   * @type {boolean}
   */
  absoluteApiPath: false,

  /**
   * Path to the apis directory
   * default: 'apis'
   * @type {string}
   */
  apiPath: "apis",

  /**
   * Flag signifying whether the absolute path to the plugins directory is provided
   * default: false
   * @type {boolean}
   */
  absolutePluginPath: false,

  /**
   * Path to the plugins directory
   * default: 'plugins'
   * @type {string}
   */
  pluginPath: "plugins",

  ...userConfig,
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
