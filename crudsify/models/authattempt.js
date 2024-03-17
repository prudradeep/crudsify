"use strict";
const { Model, Op } = require("sequelize");
const _ = require("lodash");
const { getPrimaryKey, getTimestamps } = require("crudsify/helpers/model");
const { LOCKOUT_PERIOD, AUTH_ATTEMPTS } = require("crudsify/config/constants");
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

    static async createInstance(ip, mobile_email) {
      try {
        const record = {
          ip,
          mobileEmail: mobile_email,
          time: new Date(),
        };
        return await this.create(record);
      } catch (err) {
        throw err;
      }
    }

    static async abuseDetected(ip, id) {
      try {
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
            mobileEmail: id,
            time: expirationDate,
          },
        };

        const abusiveIpUserCount = await this.count(query);

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
      mobileEmail: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      ip: DataTypes.STRING,
      time: DataTypes.DATE,
      ..._.cloneDeep(getTimestamps(DataTypes)),
    },
    {
      sequelize,
      modelName: "authAttempt",
    }
  );
  return authAttempt;
};
