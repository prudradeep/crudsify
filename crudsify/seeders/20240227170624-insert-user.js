"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { faker } = require("@faker-js/faker");
    const ObjectID = require("bson-objectid");
    const { ucfirst } = require("crudsify/utils");
    const configStore = require("crudsify/config");
    const { role, user } = require("crudsify/models");
    const roles = await role.findAll();
    const password = "Cruds!fy";
    const domain = "crudsify.com";
    const users = [
      {
        name: faker.person.fullName(),
        mobile: faker.number.int({ min: 6000000000, max: 9999999999 }),
        email: `user@${domain}`,
        profileImageUrl:
          "https://www.gravatar.com/avatar/" +
          ObjectID().toString() +
          "?r=PG&d=robohash",
        password: password,
        [`role${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
          roles[2][configStore.get("/dbPrimaryKey").name],
        isActive: true,
      },
      {
        name: faker.person.fullName(),
        mobile: faker.number.int({ min: 6000000000, max: 9999999999 }),
        email: `readonlyuser@${domain}`,
        profileImageUrl:
          "https://www.gravatar.com/avatar/" +
          ObjectID().toString() +
          "?r=PG&d=robohash",
        password: password,
        [`role${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
          roles[2][configStore.get("/dbPrimaryKey").name],
        isActive: true,
      },
      {
        name: faker.person.fullName(),
        mobile: faker.number.int({ min: 6000000000, max: 9999999999 }),
        email: `admin@${domain}`,
        profileImageUrl:
          "https://www.gravatar.com/avatar/" +
          ObjectID().toString() +
          "?r=PG&d=robohash",
        password: password,
        [`role${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
          roles[1][configStore.get("/dbPrimaryKey").name],
        isActive: true,
      },
      {
        name: faker.person.fullName(),
        mobile: faker.number.int({ min: 6000000000, max: 9999999999 }),
        email: `readonlyadmin@${domain}`,
        profileImageUrl:
          "https://www.gravatar.com/avatar/" +
          ObjectID().toString() +
          "?r=PG&d=robohash",
        password: password,
        [`role${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
          roles[1][configStore.get("/dbPrimaryKey").name],
        isActive: true,
      },
      {
        name: faker.person.fullName(),
        mobile: faker.number.int({ min: 6000000000, max: 9999999999 }),
        email: `editoradmin@${domain}`,
        profileImageUrl:
          "https://www.gravatar.com/avatar/" +
          ObjectID().toString() +
          "?r=PG&d=robohash",
        password: password,
        [`role${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
          roles[1][configStore.get("/dbPrimaryKey").name],
        isActive: true,
      },
      {
        name: faker.person.fullName(),
        mobile: faker.number.int({ min: 6000000000, max: 9999999999 }),
        email: `superuseradmin@${domain}`,
        profileImageUrl:
          "https://www.gravatar.com/avatar/" +
          ObjectID().toString() +
          "?r=PG&d=robohash",
        password: password,
        [`role${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
          roles[1][configStore.get("/dbPrimaryKey").name],
        isActive: true,
      },
      {
        name: faker.person.fullName(),
        mobile: faker.number.int({ min: 6000000000, max: 9999999999 }),
        email: `superadmin@${domain}`,
        profileImageUrl:
          "https://www.gravatar.com/avatar/" +
          ObjectID().toString() +
          "?r=PG&d=robohash",
        password: password,
        [`role${ucfirst(configStore.get("/dbPrimaryKey").name)}`]:
          roles[0][configStore.get("/dbPrimaryKey").name],
        isActive: true,
      },
    ];
    await user.bulkCreate(users);
    console.table(users, ['name', 'mobile', 'email', 'password']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("users", null, {});
  },
};
