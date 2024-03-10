"use strict";
const { Model } = require("sequelize");
const _ = require("lodash");
const { getPrimaryKey, getTimestamps } = require("../helpers/model");
module.exports = (sequelize, DataTypes) => {
  class otp extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  otp.init(
    {
      ..._.cloneDeep(getPrimaryKey(DataTypes)),
      mobileEmail: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      otpHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      ..._.cloneDeep(getTimestamps(DataTypes)),
    },
    {
      sequelize,
      modelName: "otp",
    }
  );

  otp.routeOptions = {
    allowList: false,
    allowRead: false,
    allowCreate: false,
    allowDelete: false,
    allowDeleteMany: false,
    allowUpdate: false,
  };

  return otp;
};
