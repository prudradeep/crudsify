"use strict";

const Boom = require("@hapi/boom");
const { generateEndpoint } = require("crudsify/endpoints/generate");
const { sendResponse } = require("crudsify/helpers/sendResponse");
const configStore = require("crudsify/config");
const { refreshStrategy } = require("../strategies/refresh");
const authentication = configStore.get("/authentication");

if (authentication) {
  generateEndpoint({
    method: "get",
    path: `/access-token`,
    summary: `Get new access token.`,
    tags: ["access-token"],
    auth: true,
    authMiddleware: refreshStrategy,
    handler: (req, res, next) => {
      const credentials = (req.auth && req.auth.credentials) || {
        session: null,
      };
      const session = credentials.session;
      if (session) {
        sendResponse({
          data: { message: "Success." },
          status: 200,
          res,
          next,
        });
      } else {
        throw Boom.badRequest("Refresh token required to get access token");
      }
    },
    log: "Generating Access Token endpoint.",
  });
}
