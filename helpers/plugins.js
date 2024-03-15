"use strict";

const fs = require("fs");
const path = require("path");
const configStore = require("../config");
const { Logger } = require("../helpers/logger");

//Register plugins
const directories = [path.join(__dirname, "/../", "plugins")];
let pluginPath = "";
if (configStore.get("/absolutePluginPath") === true)
  pluginPath = configStore.get("/pluginPath");
else
  pluginPath = path.join(
    __dirname,
    "/../../../",
    configStore.get("/pluginPath")
  );
directories.push(pluginPath);

const registerPlugin = (CrudsifyServer, Crudsify) => {
  try {
    directories.forEach((directory) => {
      const files = fs.readdirSync(directory);

      for (const file of files) {
        const ext = path.extname(file);
        if (ext === ".js") {
          const fileName = path.basename(file, ".js");
          const plugin = require(directory + "/" + fileName)(CrudsifyServer);
          const name = fileName.split(".")[0];
          Crudsify.plugins[name] = plugin;
        }
      }
    });
  } catch (err) {
    if (err.message.includes("no such file")) {
      if (configStore.get("/absolutePluginPath") === true) {
        Logger.error(err);
        throw new Error(
          "The plugin directory provided is either empty or does not exist. " +
            "Try setting the 'pluginPath' property of the config file."
        );
      }
    } else {
      throw err;
    }
  }
};

module.exports = registerPlugin;
