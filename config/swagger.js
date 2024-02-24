const swagger = {
    openapi: '3.0.0',
    info: {
      title: 'Crudsify API',
      version: '1.0.0',
      description: 'The REST API Service'
    },
    servers: [
      {
        url: process.env.API_DEV_URL,
        description: 'Development server'
      },
      {
        url: process.env.API_UAT_URL,
        description: 'UAT server'
      },
      {
        url: process.env.API_PROD_URL,
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    paths: {
    }
  }
  module.exports = swagger