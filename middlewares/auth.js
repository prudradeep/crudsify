"use strict";

const configStore = require("../config");

exports.basicAuthMiddleware = (req, res, next) => {
  const authheader = req.headers.authorization;
  if (authheader) {
    const auth = new Buffer.from(authheader.split(" ")[1], "base64")
      .toString()
      .split(":");

    if (
      auth[0] == configStore.get("/basicAuth").username &&
      auth[1] == configStore.get("/basicAuth").password
    )
      return next();
  }
  res.setHeader("WWW-Authenticate", 'Basic realm="401"');
  res.status(401).end("You are not authenticated!");
};
