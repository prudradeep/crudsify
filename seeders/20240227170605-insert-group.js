"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const groups = [
      {
        name: "Read Only",
        description:
          "Group that excludes all permissions except for Admin level read permissions.",
      },
      {
        name: "Editor",
        description: "Group that forbids all creating.",
      },
      {
        name: "Super User",
        description:
          "Group with full permissions except root. Role restrictions remain.",
      },
    ];
    await queryInterface.bulkInsert("groups", groups);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("groups", null, {});
  },
};
