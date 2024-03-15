const fs = require("fs");
const path = require("path");
let userConstants = {};
const constPath = path.join(__dirname, "/../../../", "config", "constants.js");
if (fs.existsSync(constPath)) userConstants = require(constPath);

module.exports = {
  AUTH_STRATEGIES: {
    TOKEN: "standard-jwt",
    SESSION: "jwt-with-session",
    REFRESH: "jwt-with-session-and-refresh-token",
  },
  PERMISSION_STATES: {
    INCLUDED: "Included",
    EXCLUDED: "Excluded",
    FORBIDDEN: "Forbidden",
  },
  USER_ROLES: {
    USER: "User",
    ADMIN: "Admin",
    SUPER_ADMIN: "Super Admin",
  },
  REQUIRED_PASSWORD_STRENGTH: {
    USER: 0,
    ADMIN: 3,
    SUPER_ADMIN: 4,
  },
  EXPIRATION_PERIOD: {
    SHORT: "10m",
    MEDIUM: "4h",
    LONG: "24h",
  },
  LOCKOUT_PERIOD: 30, //In minutes
  AUTH_ATTEMPTS: {
    FOR_IP: 50,
    FOR_IP_AND_USER: 5,
  },
  ...userConstants,
  AUDIT_LOG_STORAGE: {
    FILE: "file",
    DB: "database",
  },
};
