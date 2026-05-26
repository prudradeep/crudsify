"use strict";

const server = require("crudsify");
const { refreshStrategy } = require("./strategies/refresh");

server(refreshStrategy);
