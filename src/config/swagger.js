const swaggerUi = require('swagger-ui-express');

const paginationParams = [
  {
    name: 'page',
    in: 'query',
    description: 'Número de página a consultar (por defecto: 1)',
    required: false,
    schema: { type: 'integer', default: 1, minimum: 1 }
  },
  {
    name: 'limit',
    in: 'query',
    description: 'Cantidad de elementos por página (por defecto: 50, máximo: 100)',
    required: false,
    schema: { type: 'integer', default: 50, minimum: 1, maximum: 100 }
  }
];

const paginationSchema = {
  type: 'object',
  properties: {
    total: { type: 'integer', example: 120 },
    page: { type: 'integer', example: 1 },
    limit: { type: 'integer', example: 50 },
    totalPages: { type: 'integer', example: 3 }
  }
};

const rateLimit429Response = {
  description: 'Límite de peticiones excedido (Rate Limit)',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          error: { type: 'string', example: 'Límite de telemetría para este paciente excedido. Máximo 120 peticiones por minuto.' }
        }
      }
    }
  }
};

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'SIAT Backend API',
    version: '1.0.0',
    description: 'Documentación oficial de la API REST del Sistema Inteligente de Acompañamiento Terapéutico (SIAT).'
  },
  servers: [
    {
      url: '/api',
      description: 'Servidor API Principal'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      },
      healthcheckToken: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Healthcheck-Token'
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
        summary: 'Estado del servicio (Público)',
        description: 'Retorna el estado sintético del sistema para sondas de liveness y balanceadores sin exponer detalles de infraestructura.',
        security: [],
        responses: {
          '200': {
            description: 'Servicio saludable o degradado pero operativo',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['healthy', 'degraded'], example: 'healthy' }
                  }
                }
              }
            }
          },
          '503': {
            description: 'Servicio no disponible por fallo de base de datos',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'unhealthy' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/health/detail': {
      get: {
        summary: 'Estado detallado del sistema (Protegido)',
        description: 'Evalúa de forma granular las dependencias del backend: PostgreSQL, Socket.io, EmailJS y Cloudinary. Requiere el header X-Healthcheck-Token.',
        security: [{ healthcheckToken: [] }],
        responses: {
          '200': {
            description: 'Desglose detallado del estado de salud de dependencias',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'], example: 'healthy' },
                    timestamp: { type: 'string', format: 'date-time' },
                    services: {
                      type: 'object',
                      properties: {
                        database: {
                          type: 'object',
                          properties: {
                            status: { type: 'string', example: 'up' },
                            latencyMs: { type: 'integer', example: 15 }
                          }
                        },
                        socketio: {
                          type: 'object',
                          properties: {
                            status: { type: 'string', example: 'up' },
                            clientsCount: { type: 'integer', example: 4 }
                          }
                        },
                        emailjs: {
                          type: 'object',
                          properties: {
                            status: { type: 'string', example: 'configured' }
                          }
                        },
                        cloudinary: {
                          type: 'object',
                          properties: {
                            status: { type: 'string', example: 'configured' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Token de healthcheck no autorizado'
          },
          '404': {
            description: 'Endpoint no habilitado en el entorno actual'
          }
        }
      }
    },
    '/monitoreo/telemetria': {
      post: {
        summary: 'Recepción de telemetría IoT del wearable',
        description: 'Ingesta continua de señales biométricas desde dispositivos IoT (BPM, acelerometría). Protegido con doble rate limit: 300 req/min por IP y 120 req/min por nin_codi.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nin_codi', 'tel_regi', 'tel_tipo'],
                properties: {
                  nin_codi: { type: 'string', example: 'N001' },
                  tel_regi: { type: 'number', example: 98.5 },
                  tel_tipo: { type: 'string', example: 'BPM' },
                  tel_marc: { type: 'integer', example: 12 }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Telemetría procesada exitosamente'
          },
          '429': rateLimit429Response
        }
      }
    },
    '/admin/usuarios': {
      get: {
        summary: 'Listado paginado de usuarios (Admin)',
        description: 'Consulta usuarios del sistema con filtros y paginación (por defecto: page=1, limit=50, max: 100).',
        parameters: [...paginationParams],
        responses: {
          '200': {
            description: 'Lista de usuarios con paginación',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { type: 'object' } },
                    pagination: paginationSchema
                  }
                }
              }
            }
          }
        }
      }
    },
    '/admin/auditoria': {
      get: {
        summary: 'Registro de auditoría paginado (Admin)',
        description: 'Consulta registros de auditoría y trazas de seguridad (por defecto: page=1, limit=50, max: 100).',
        parameters: [...paginationParams],
        responses: {
          '200': {
            description: 'Lista de trazas de auditoría con paginación',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { type: 'object' } },
                    pagination: paginationSchema
                  }
                }
              }
            }
          }
        }
      }
    },
    '/especialista/incidentes/{nin_codi}': {
      get: {
        summary: 'Incidentes conductuales de un paciente con paginación',
        parameters: [
          {
            name: 'nin_codi',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          },
          ...paginationParams
        ],
        responses: {
          '200': {
            description: 'Lista de incidentes conductuales paginados',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    data: { type: 'array', items: { type: 'object' } },
                    pagination: paginationSchema
                  }
                }
              }
            }
          }
        }
      }
    },
    '/especialista/alertas/{nin_codi}': {
      get: {
        summary: 'Alertas y crisis de un paciente con paginación',
        parameters: [
          {
            name: 'nin_codi',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          },
          ...paginationParams
        ],
        responses: {
          '200': {
            description: 'Lista de alertas del paciente paginadas',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    data: { type: 'array', items: { type: 'object' } },
                    pagination: paginationSchema
                  }
                }
              }
            }
          }
        }
      }
    },
    '/reportes/historial-completo/{nin_codi}': {
      get: {
        summary: 'Historial clínico completo y sesiones con paginación',
        parameters: [
          {
            name: 'nin_codi',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          },
          ...paginationParams
        ],
        responses: {
          '200': {
            description: 'Historial completo paginado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        reportes: { type: 'array', items: { type: 'object' } },
                        indicaciones: { type: 'array', items: { type: 'object' } },
                        sesiones: { type: 'array', items: { type: 'object' } },
                        bitacoras: { type: 'array', items: { type: 'object' } }
                      }
                    },
                    pagination: paginationSchema
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

