"use strict";

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Logger } = require("./helpers/logger");
const { sequelize } = require("./models");
const configStore = require("./config");
const { errorResponder, handleNotFoundError } = require("./middlewares/error");

const Crudsify = express();
Crudsify.plugins = {};
const CrudsifyServer = http.createServer(Crudsify);
Crudsify.disable("etag");
Crudsify.disable('x-powered-by');
Crudsify.use(cors(configStore.get("/cors")));
Crudsify.use(express.json());

const start = async () => {
  try {
    await sequelize.authenticate();
    require("./helpers/plugins")(CrudsifyServer, Crudsify);
    require("./helpers/api");
    require("./helpers/route");
    const { Endpoints } = require("./endpoints/generate");
    const { swaggerRouter } = require("./helpers/swagger");
    Crudsify.use("/", Endpoints);
    if (configStore.get("/enableSwagger")) Crudsify.use("/", swaggerRouter);
    Crudsify.use(errorResponder);
    Crudsify.use(handleNotFoundError);
    CrudsifyServer.listen(process.env.SERVER_PORT, () => {
      Logger.info(`Crudsify Server listening on port ${process.env.SERVER_PORT}`);
    });
  } catch (err) {
    Logger.error(err);
    process.exit();
  }
};

start();
