const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'SIAT Backend API',
    version: '1.0.0',
    description: 'Documentación oficial de la API REST del Sistema de Monitoreo y Acompañamiento Terapéutico (SIAT).'
  },
  servers: [
    {
      url: '/api',
      description: 'Servidor API'
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
  security: [
    {
      bearerAuth: []
    }
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Estado del servicio',
        description: 'Retorna el estado de salud del backend SIAT.',
        responses: {
          '200': {
            description: 'Servicio funcionando correctamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    message: { type: 'string', example: 'Backend SIAT funcionando correctamente' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

function setupSwagger(app) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customSiteTitle: 'SIAT API Documentation'
  }));
}

module.exports = setupSwagger;
