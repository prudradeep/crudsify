"use strict";

require("dotenv").config();

const Confidence = require("confidence");
const fs = require("fs");
const path = require("path");
const dbConfig = require("./config");
const constants = require("./constants");

let userConfig = {};
const userConfigPath = path.join(__dirname, "/../../../", "config", "index.js");
// Checks if the user configuration file exists
if (fs.existsSync(userConfigPath)) userConfig = require(userConfigPath);

/* The criteria to filter Config values by (NODE_ENV). Typically includes:
 * - development
 * - uat
 * - production
 * - $default
 */
const Config = {
  /**
   * Your service name goes here
   * @type {string}
   */
  service: "APIs",

  /**
   * Path to the logs directory
   * default: './logs/'
   * @type {string}
   */
  logDir: "./logs/",

  /**
   * Log level options:
   * - error
   * - warn
   * - info
   * - http
   * - verbose
   * - debug
   * - silly
   * default: silly for development
   * default: verbose for uat
   * default: error for production
   */
  logLevel: {
    $filter: "env",
    uat: "verbose",
    production: "error",
    $default: "silly",
  },

  /**
   * If set to true, each route will be logged as it is generated.
   * default: false
   * @type {boolean}
   */
  logRoutes: false,

  /**
   * If set to true, the scope for each endpoint will be logged when then endpoint is generated.
   * default: false
   * @type {boolean}
   */
  logScopes: false,

  /**
   * If set to true, the queries will be logged.
   * default: false
   * @type {boolean}
   */
  logQuery: false,

  /**
   * Maximum number of logs to keep. 
   * This can be a number of files or number of days. 
   * If using days, add 'd' as the suffix.
   * default: "20d"
   * @type {string}
   */
  logTTL: "20d",

  /**
   * Maximum size of the log file after which it will rotate.
   * This can be a number of bytes, or units of kb, mb, and gb. 
   * If using the units, add 'k', 'm', or 'g' as the suffix.
   * default: "20m"
   * @type {string}
   */
  logFileMaxSize: "20m",

  /**
   * Cors settings for generated endpoints. Can be set to false to disable.
   * @type {{headers: string[], exposedHeaders: string[]}}
   */
  cors: {
    origin: "*",
    exposedHeaders: ["X-Access-Token", "X-Refresh-Token"],
  },

  /**
   * This is the primary key attribute for your tables.
   * default {name: "id", type: "BIGINT", autoIncrement: true}
   */
  dbPrimaryKey: {
    name: "id",
    type: "BIGINT",
    autoIncrement: true,
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
   * default: true
   * @type {boolean}
   */
  enableCreatedBy: true,
  enableUpdatedBy: true,
  enableDeletedBy: true,

  /**
   * Default limit to fetch records
   * default: 20
   * @type {number}
   */
  limit: 20,

  /**
   * Authentication to be used for all generated endpoints.
   * default: false
   * @type {boolean}
   */
  authentication: false,

  /**
   * Enables record level authorization.
   * default: false
   * @type {boolean}
   */
  enableRecordScopes: false,

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
   * default: 10
   * @type {number}
   */
  saltRounds: 10,

  /**
   * Secret for JWT token creation and algo.
   * Getting from the env file
   */
  jwt: {
    secret: process.env.JWT_SECRET,
    algo: process.env.JWT_ALGO,
  },

  /**
   * When enabled, all create, update, associate, and delete events are recorded.
   * default: true
   * @type {boolean}
   */
  enableAuditLog: true,

  /**
   * Specifies audit log storage
   * default: file
   * available: database | file
   */
  auditLogStorage: constants.AUDIT_LOG_STORAGE.FILE,

  /**
   * Maximum number of logs to keep. 
   * This can be a number of files or number of days. 
   * If using days, add 'd' as the suffix.
   * default: 20d for development & uat
   * default: 60d for production
   * @type {string}
   */
  auditLogTTL: {
    $filter: "env",
    production: "60d",
    $default: "20d",
  },

  /**
   * Enables policies
   * default: false
   * @type {boolean}
   */
  enablePolicies: false,

  /**
   * Validation options:
   * default: true
   * @type {boolean}
   */
  enablePayloadValidation: true,
  enableQueryValidation: true,

  /**
   * When enabled, swagger ui will be generated for the apis.
   * default: true for development & uat
   * default: false for production
   */
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
    explorer: true,
    swaggerOptions: {
      docExpansion: "none",
    },
    customSiteTitle: process.env.TITLE,
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

  /**
   * Basic auth credentials for swagger documentation.
   * Getting from env file.
   */
  basicAuth: {
    username: process.env.BASIC_AUTH_USERNAME,
    password: process.env.BASIC_AUTH_PASSWORD,
  },

  /**
   * DB settings
   */
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
