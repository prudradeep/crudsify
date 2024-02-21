require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_DEV_USERNAME,
    password: process.env.DB_DEV_PASSWORD,
    database: process.env.DB_DEV_NAME,
    host: process.env.DB_DEV_HOST,
    port: process.env.DB_DEV_PORT,
    dialect: process.env.DB_DEV_DIALECT
  },
  uat: {
    username: process.env.DB_UAT_USERNAME,
    password: process.env.DB_UAT_PASSWORD,
    database: process.env.DB_UAT_NAME,
    host: process.env.DB_UAT_HOST,
    port: process.env.DB_UAT_PORT,
    dialect: process.env.DB_UAT_DIALECT
  },
  production: {
    username: process.env.DB_PROD_USERNAME,
    password: process.env.DB_PROD_PASSWORD,
    database: process.env.DB_PROD_NAME,
    host: process.env.DB_PROD_HOST,
    port: process.env.DB_PROD_PORT,
    dialect: process.env.DB_PROD_DIALECT
  }
}
