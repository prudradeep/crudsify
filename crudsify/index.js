"use strict";

const server = require("crudsify");
const { tokenStrategy } = require("./strategies/token");

server(tokenStrategy);
