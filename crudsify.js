"use strict";

const express = require("express");
const http = require("http");
const cors = require("cors");
const Log = require("./helpers/logger");
const { sequelize } = require("./models");
const configStore = require("./config");
const { errorResponder, handleNotFoundError } = require("./middlewares/error");
const PORT = configStore.get("/port");

const Crudsify = express();
Crudsify.plugins = {};
const CrudsifyServer = http.createServer(Crudsify);
Crudsify.use(cors(configStore.get("/cors")));
Crudsify.use(express.json());

const start = async () => {
  try {
    await sequelize.authenticate();
    require('./helpers/route')
    const { Endpoints } = require("./endpoints/generate");
    const { swaggerRouter } = require("./helpers/swagger");
    Crudsify.use('/', Endpoints)
    if (configStore.get("/enableSwagger")) Crudsify.use("/", swaggerRouter);
    Crudsify.use(errorResponder);
    Crudsify.use(handleNotFoundError);
    CrudsifyServer.listen(PORT, () => {
      Log.info(`Crudsify Server listening on port ${PORT}`);
    });
  } catch (err) {
    Log.error(err);
    process.exit();
  }
};

start();
