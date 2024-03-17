"use strict";

const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const basename = path.basename(__filename);
const configStore = require("../config");
const { routeOptions, routeScopes } = require("../helpers/model");
const { QueryLogger, Logger } = require("../helpers/logger");
const constants = require("../config/constants");
const db = {};

let options = {
  host: configStore.get("/database/host"),
  port: configStore.get("/database/port"),
  dialect: configStore.get("/database/dialect"),
  logging: (msg) => {
    if (configStore.get("/logQuery")) QueryLogger.log("query", msg);
  },
  pool: {
    max: 5,
    min: 0,
    idle: 10000,
  },
  define: {
    ...configStore.modelOptions,
    hooks: {},
  },
};

const sequelize = new Sequelize(
  configStore.get("/database/database"),
  configStore.get("/database/username"),
  configStore.get("/database/password"),
  options
);

const directories = [];
let modelPath = "";
if (configStore.get("/absoluteModelPath") === true)
  modelPath = configStore.get("/modelPath");
else
  modelPath = path.join(__dirname, "/../../../", configStore.get("/modelPath"));

directories.push(modelPath);

try {
  directories.forEach((directory) => {
    fs.readdirSync(directory)
      .filter((file) => {
        return (
          file.indexOf(".") !== 0 &&
          file !== basename &&
          file.slice(-3) === ".js" &&
          file.indexOf(".test.js") === -1
        );
      })
      .forEach((file) => {
        const model = require(path.join(directory, file))(
          sequelize,
          Sequelize.DataTypes
        );
        db[model.name] = model;
      });
  });
} catch (err) {
  if (err.message.includes("no such file")) {
    if (configStore.get("/absoluteModelPath") === true) {
      Logger.error(err);
      throw new Error(
        "The model directory provided is either empty or does not exist. " +
          "Try setting the 'modelPath' property of the config file."
      );
    }
  } else {
    throw err;
  }
}

if (
  configStore.get("/enableAuditLog") &&
  configStore.get("/auditLogStorage") === constants.AUDIT_LOG_STORAGE.DB
) {
  const model = require(path.join(__dirname, '/../helpers/', 'auditlog.js'))(
    sequelize,
    Sequelize.DataTypes
  );
  db[model.name] = model;
}

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }

  routeOptions(db[modelName]);
  if (configStore.get("/generateRouteScopes")) {
    routeScopes(db[modelName]);
  } else {
    db[modelName].routeScopes = {};
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
