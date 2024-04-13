const fs = require("fs");
const path = require("path");
let userConstants = {};
const constPath = path.join(__dirname, "/../../../", "config", "constants.js");
if (fs.existsSync(constPath)) userConstants = require(constPath);

module.exports = {
  ...userConstants,
  AUDIT_LOG_STORAGE: {
    FILE: "file",
    DB: "database",
  },
};
