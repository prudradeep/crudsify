"use strict";
const { Model } = require("sequelize");
const _ = require("lodash");
const configStore = require("../config");
const {
  getPrimaryKey,
  getTimestamps,
  getMetadata,
} = require("../helpers/model");
const { ucfirst } = require("../utils");
module.exports = (sequelize, DataTypes) => {
  class authAttempt extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }

    static async createInstance(ip, id) {
      try {
        const record = {
          ip,
          [`user${ucfirst(configStore.get("/dbPrimaryKey").name)}`]: id,
          time: new Date(),
        };
        return await this.create(record);
      } catch (err) {
        throw err;
      }
    }

    static async abuseDetected(ip, id) {
      try {
        const LOCKOUT_PERIOD = configStore.get("/constants/LOCKOUT_PERIOD");
        const expirationDate = LOCKOUT_PERIOD
          ? { [Op.gt]: Date.now() - LOCKOUT_PERIOD * 60000 }
          : { [Op.lt]: Date.now() };

        let query = {
          where: {
            ip,
            time: expirationDate,
          },
        };

        const abusiveIpCount = await this.count(query);
        query = {
          where: {
            ip,
            [`user${ucfirst(configStore.get("/dbPrimaryKey").name)}`]: id,
            time: expirationDate,
          },
        };

        const abusiveIpUserCount = await this.count(query);

        const AUTH_ATTEMPTS = configStore.get("/constants/AUTH_ATTEMPTS");
        const ipLimitReached = abusiveIpCount >= AUTH_ATTEMPTS.FOR_IP;
        const ipUserLimitReached =
          abusiveIpUserCount >= AUTH_ATTEMPTS.FOR_IP_AND_USER;

        return ipLimitReached || ipUserLimitReached;
      } catch (err) {
        throw err;
      }
    }
  }
  authAttempt.init(
    {
      ..._.cloneDeep(getPrimaryKey(DataTypes)),
      [`user${ucfirst(configStore.get("/dbPrimaryKey").name)}`]: {
        type: DataTypes[configStore.get("/dbPrimaryKey").type],
        allowNull: false,
        references: {
          model: "users",
          key: configStore.get("/dbPrimaryKey").name,
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      ip: DataTypes.STRING,
      time: DataTypes.DATE,
      ..._.cloneDeep(getTimestamps(DataTypes)),
      ..._.cloneDeep(getMetadata(DataTypes)),
    },
    {
      sequelize,
      modelName: "auth-attempt",
    }
  );
  return authAttempt;
};
