"use strict";

module.exports = {
  OTP_SEND_ATTEMPT_PREFIX: "otp-send:",
  OTP_VERIFY_ATTEMPT_PREFIX: "otp-verify:",
  PUBLIC_AUTH_ATTEMPT_PREFIX: "public-auth:",
  OTP_VALIDITY_PERIOD_MS: 10 * 60 * 1000,
  TOKEN_TYPES: {
    ACCESS: "access",
    REFRESH: "refresh",
    OTP_CHALLENGE: "otp-challenge",
    OTP_VERIFIED: "otp-verified",
    PASSWORD_RESET: "password-reset",
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
    USER: 2,
    ADMIN: 3,
    SUPER_ADMIN: 4,
  },
  PASSWORD_MAX_LENGTH: 128,
  EXPIRATION_PERIOD: {
    SHORT: "10m",
    MEDIUM: "4h",
    LONG: "24h",
  },
  LOCKOUT_PERIOD: 30, //In minutes
  AUTH_ATTEMPTS: {
    FOR_IP: 50,
    FOR_IP_AND_USER: 5,
    FOR_PUBLIC_IP: 200,
  },
};
