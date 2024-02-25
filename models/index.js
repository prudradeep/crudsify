"use strict";

const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const basename = path.basename(__filename);
const configStore = require("../config");
const { routeOptions, routeScopes } = require("../helpers/model");
const db = {};

let options = {
  host: configStore.get("/database/host"),
  port: configStore.get("/database/port"),
  dialect: configStore.get("/database/dialect"),
  logging: false,
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

fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf(".") !== 0 &&
      file !== basename &&
      file.slice(-3) === ".js" &&
      file.indexOf(".test.js") === -1
    );
  })
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(
      sequelize,
      Sequelize.DataTypes
    );
    db[model.name] = model;
  });

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
