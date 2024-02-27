"use strict";

const { Boom } = require("@hapi/boom");
const { generateEndpoint } = require("../endpoints/generate");
const { sendResponse } = require("../helpers/sendResponse");

generateEndpoint({
  method: "get",
  path: `/access-token`,
  summary: `Get new access token.`,
  tags: ["access-token"],
  auth: true,
  handler: (req, res, next) => {
    const credentials = req.auth.credentials || { session: null };
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
