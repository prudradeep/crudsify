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

const srcDirs = fs.readdirSync(sourceDir);
for (const dir of srcDirs) {
  if (!fs.existsSync(path.join(destinationDir, dir)))
    fs.mkdirSync(path.join(destinationDir, dir));
  const srcFiles = fs.readdirSync(path.join(sourceDir, dir));
  for (const file of srcFiles) {
    fs.copyFileSync(
      path.join(sourceDir, dir, file),
      path.join(destinationDir, dir, file)
    );
  }
}
