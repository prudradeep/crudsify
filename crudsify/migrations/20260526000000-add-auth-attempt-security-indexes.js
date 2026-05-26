"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex("authAttempts", ["time"], {
      name: "auth_attempts_time_idx",
    });
    await queryInterface.addIndex("authAttempts", ["ip", "time"], {
      name: "auth_attempts_ip_time_idx",
    });
    await queryInterface.addIndex("authAttempts", ["mobileEmail", "time"], {
      name: "auth_attempts_mobile_email_time_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("authAttempts", "auth_attempts_time_idx");
    await queryInterface.removeIndex("authAttempts", "auth_attempts_ip_time_idx");
    await queryInterface.removeIndex(
      "authAttempts",
      "auth_attempts_mobile_email_time_idx"
    );
  },
};
