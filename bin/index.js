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

    const srcDirs = fs.readdirSync(sourceDir);
    for(const dir of srcDirs){
      if(!fs.existsSync(path.join(destinationDir, dir)))
        fs.mkdirSync(path.join(destinationDir, dir))
      const srcFiles = fs.readdirSync(path.join(sourceDir, dir));
      for (const file of srcFiles) {
        fs.copyFileSync(path.join(sourceDir, dir, file), path.join(destinationDir, dir, file))
      }
    }
    break;
}
