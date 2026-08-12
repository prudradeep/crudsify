"use strict";

const express = require("express");
const path = require("path");

const crudsifyDocRouter = express.Router();
const docPath = path.join(__dirname, "../docs/crudsifydoc.html");

crudsifyDocRouter.get("/crudsifydoc", (req, res) => {
  res.sendFile(docPath);
});

crudsifyDocRouter.get("/crudsifydoc/", (req, res) => {
  res.redirect(301, "/crudsifydoc");
});

module.exports = { crudsifyDocRouter };
