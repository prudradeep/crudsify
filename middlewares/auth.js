"use strict";

const crypto = require("crypto");
const configStore = require("../config");

const matches = (provided, configured) => {
  if (!provided || !configured) return false;
  const providedValue = Buffer.from(provided);
  const configuredValue = Buffer.from(configured);
  return (
    providedValue.length === configuredValue.length &&
    crypto.timingSafeEqual(providedValue, configuredValue)
  );
};

exports.basicAuthMiddleware = (req, res, next) => {
  const authheader = req.headers.authorization;
  if (authheader) {
    const token = authheader.split(" ")[1] || authheader;
    const [username, ...passwordParts] = Buffer.from(token, "base64")
      .toString()
      .split(":");
    const password = passwordParts.join(":");
    const basicAuth = configStore.get("/basicAuth");

    if (
      matches(username, basicAuth.username) &&
      matches(password, basicAuth.password)
    )
      return next();
  }
  res.setHeader("WWW-Authenticate", 'Basic realm="401"');
  res.status(401).json({message: "You are not authenticated!"});
};
