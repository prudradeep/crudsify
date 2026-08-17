"use strict";

const express = require("express");
const path = require("path");

const crudsifyDocRouter = express.Router();
const docPath = path.join(__dirname, "../docs/crudsifydoc.html");

const docContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "img-src 'self' data:",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
].join("; ");

crudsifyDocRouter.get("/crudsifydoc", (req, res) => {
  res.set("Content-Security-Policy", docContentSecurityPolicy);
  res.sendFile(docPath);
});

crudsifyDocRouter.get("/crudsifydoc/", (req, res) => {
  res.redirect(301, "/crudsifydoc");
});

module.exports = { crudsifyDocRouter };
