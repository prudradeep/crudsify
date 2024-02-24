const { get, meta, constants } = require("./config");
const modelsUtil = require("./utils/model");
const utils = require('./utils');

module.exports = {
  getConfig: get,
  metaConfig: meta,
  constConfig: constants,
  ...modelsUtil,
  ...utils
};
