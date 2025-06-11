"use strict";

const express = require("express");
const http = require("http");
const https = require("https");
const fs = require("fs");
const cors = require("cors");
const helmet = require("helmet");
const compression = require('compression');
const { Logger } = require("./helpers/logger");
const { sequelize } = require("./models");
const configStore = require("./config");
const sslOptions = configStore.get("/ssl");
const { errorResponder, handleNotFoundError } = require("./middlewares/error");

const Crudsify = express();
Crudsify.plugins = {};
let CrudsifyServer;
if (sslOptions.cert && sslOptions.key) {
  const options = {
    key: fs.readFileSync(sslOptions.key),
    cert: fs.readFileSync(sslOptions.cert),
  };
  CrudsifyServer = https.createServer(options, Crudsify);
} else {
  CrudsifyServer = http.createServer(Crudsify);
}

Crudsify.use(compression(configStore.get("/compression")))
Crudsify.use(helmet(configStore.get("/helmet")));
Crudsify.disable("etag");
Crudsify.use(cors(configStore.get("/cors")));
Crudsify.use(express.json({
  limit: "20mb"
}));

module.exports = async (authStrategy = false, globalMiddleware=[]) => {
  try {
    await sequelize.authenticate();
    const { Endpoints, setAuthMiddleware } = require("./endpoints/generate");
    if (configStore.get("/authentication")) {
      if (authStrategy) setAuthMiddleware(authStrategy);
      else {
        throw "Authentication is enabled, Auth strategy required!";
      }
    }

    globalMiddleware.forEach(middleware => Crudsify.use(middleware));

    require("./helpers/plugins")(CrudsifyServer, Crudsify);
    require("./helpers/api");
    require("./helpers/route");
    Crudsify.use("/", Endpoints);
    if (configStore.get("/enableSwagger")) {
      const { swaggerRouter } = require("./helpers/swagger");
      Crudsify.use("/", swaggerRouter);
    }
    Crudsify.use(errorResponder);
    Crudsify.use(handleNotFoundError);
    CrudsifyServer.listen(process.env.SERVER_PORT, () => {
      Logger.info(
        `Crudsify Server listening on port ${process.env.SERVER_PORT}`
      );
    });
  } catch (err) {
    Logger.error(err);
    process.exit();
  }
};

//Gracefull shutdown and close DB Connection
process.on("SIGINT", function () {
  sequelize.close().then(() => process.exit(0));
});
