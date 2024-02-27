"use strict";

const fs = require("fs");
const path = require("path");
const configStore = require("../config");
const { Logger } = require("../helpers/logger");

//Generate api routes
let apiPath = "";
if (configStore.get("/absoluteApiPath") === true)
  apiPath = configStore.get("/apiPath");
else apiPath = path.join(__dirname, "/../", configStore.get("/apiPath"));

try {
  const files = fs.readdirSync(apiPath);

  for (const file of files) {
    const ext = path.extname(file);
    if (ext === ".js") {
      const fileName = path.basename(file, ".js");
      require(apiPath + "/" + fileName);
    }
  }
} catch (err) {
  if (err.message.includes("no such file")) {
    if (configStore.get("/absoluteApiPath") === true) {
      Logger.error(err);
      throw new Error(
        "The api directory provided is either empty or does not exist. " +
          "Try setting the 'apiPath' property of the config file."
      );
    }
  } else {
    throw err;
  }
}
