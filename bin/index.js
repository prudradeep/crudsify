#! /usr/bin/env node
const path = require("path");
const minimist = require("minimist");
const {
  copyDirectory,
  generateModel,
  generateMigration,
} = require("./helper");
const args = minimist(process.argv.slice(2));

let sourceDir = "";
let destinationDir = "";

switch (args._[0]) {
  case "quick-start":
    sourceDir = path.join(__dirname, "/../", "crudsify");
    destinationDir = path.join(__dirname, "/../../../");
    copyDirectory(sourceDir, destinationDir);
    break;
  case "init":
    sourceDir = path.join(__dirname, "/../", "initiate");
    destinationDir = path.join(__dirname, "/../../../");
    copyDirectory(sourceDir, destinationDir);
    break;
  case "db-audit-log":
    sourceDir = path.join(__dirname, "/../", "audit-log");
    destinationDir = path.join(__dirname, "/../../../");
    copyDirectory(sourceDir, destinationDir);
    break;
  case "model":
    generateMigration(args);
    generateModel(args);
    console.info("Migration and Model generated!");
    break;
  case "migration":
    generateMigration(args);
    console.info("Migration generated!");
    break;
}
