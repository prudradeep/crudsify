"use strict";

const Bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const Jwt = require('jsonwebtoken')
const configStore = require("../config");

module.exports = {
  ucfirst: function (string) {
    return string.charAt(0).toUpperCase() + string.substring(1).toLowerCase();
  },
  sortObjectByKeys: (o) => {
    return Object.keys(o)
      .sort()
      .reduce((r, k) => ((r[k] = o[k]), r), {});
  },
  generateHash: (key = false) => {
    if (!key) key = uuidv4();

    try {
      let salt = Bcrypt.genSaltSync(configStore.get("/saltRounds"));
      let hash = Bcrypt.hashSync(key, salt);
      return { key, hash };
    } catch (err) {
      throw err;
    }
  },
  getIP: (req) => {
    return (
      req.headers["x-real-ip"] ||
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.ip
    );
  },
  generateToken: (data, expirationPeriod) => {
    try{
        return Jwt.sign(data, configStore.get('/jwtSecret'), {algorithm: "HS256", expiresIn: expirationPeriod})
    }catch(err){
        throw err;
    }
  }
};
