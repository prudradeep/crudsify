#! /usr/bin/env node
const fs = require("fs");
const path = require("path");

const userArgs = process.argv.slice(2);

const command = userArgs[0];

let sourceDir = "";
let destinationDir = "";

switch (command) {
  case "quick-start":
    sourceDir = path.join(__dirname, "/../", "crudsify");
    destinationDir = path.join(__dirname, "/../../../");
    break;
  case "init":
    sourceDir = path.join(__dirname, "/../", "initiate");
    destinationDir = path.join(__dirname, "/../../../");
    break;
  case "db-audit-log":
    sourceDir = path.join(__dirname, "/../", "audit-log");
    destinationDir = path.join(__dirname, "/../../../");
    break;
}

const copyDirectory = (source, destination) => {
  if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination);
  }

  const files = fs.readdirSync(source);

  files.forEach(file => {
      const sourcePath = path.join(source, file);
      const destPath = path.join(destination, file);

      if (fs.statSync(sourcePath).isDirectory()) {
          copyDirectory(sourcePath, destPath);
      } else {
          fs.copyFileSync(sourcePath, destPath);
      }
  });
}

copyDirectory(sourceDir, destinationDir);
