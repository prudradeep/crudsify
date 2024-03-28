"use strict";

module.exports = {
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
};
