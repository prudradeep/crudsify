#! /usr/bin/env node
const fs = require("fs");
const path = require("path");

const userArgs = process.argv.slice(2);

const command = userArgs[0];

switch (command) {
  case "copy":
    //migrations
    const sourceDir = path.join(__dirname, "/../", "crudsify");
    const destinationDir = path.join(__dirname, "/../../../");

    const migFiles = fs.readdirSync(sourceDir);
    for (const file of migFiles) {
      fs.renameSync(sourceDir + "/" + file, destinationDir + "/" + file);
    }
    break;
}
