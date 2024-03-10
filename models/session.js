"use strict";
const { Model, Op } = require("sequelize");
const _ = require("lodash");
const { v4: uuidv4 } = require("uuid");
const configStore = require("../config");
const {
  getPrimaryKey,
  getTimestamps,
  getMetadata,
} = require("../helpers/model");
const { ucfirst } = require("../utils");
module.exports = (sequelize, DataTypes) => {
  class session extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }

    static async findByCredentials(id, key) {
      try {
        let session = await this.findByPk(id);
        if (!session) {
          return false;
        }
        return session.key === key ? session : false;
      } catch (err) {
        throw err;
      }
    }

    static async createInstance(user) {
      try {
        const record = {
          [`user${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
            user[configStore.get("/dbPrimaryKey").name],
          key: uuidv4(),
          passwordHash: user.password,
        };

        let newSession = await this.create(record);

        /**
         * Allow only one login at a time.
         */
        const query = {
          where: {
            [`user${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
              user[configStore.get("/dbPrimaryKey").name],
            key: { [Op.ne]: record.key },
          },
        };
        await this.destroy(query);

        return newSession;
      } catch (err) {
        throw err;
      }
    }
  }

  session.init(
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
      key: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      ..._.cloneDeep(getTimestamps(DataTypes)),
      ..._.cloneDeep(getMetadata(DataTypes)),
    },
    {
      sequelize,
      modelName: "session",
    }
  );

  session.routeOptions = {
    allowList: false,
    allowRead: false,
    allowCreate: false,
    allowUpdate: false,
    allowDelete: false,
    allowDeleteMany: false,
  };

  return session;
};
