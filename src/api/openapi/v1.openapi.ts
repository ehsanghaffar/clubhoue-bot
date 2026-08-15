/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

const errorResponse = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        message: { type: 'string' }
      },
      required: ['type', 'message']
    }
  }
}

export const buildV1OpenApiSpec = (port: number): object => ({
  openapi: '3.0.0',
  info: {
    title: 'Clubhouse Bot API',
    version: '1.0.0',
    description: 'Tenant-scoped product API for operating Clubhouse user accounts programmatically.'
  },
  servers: [{ url: `http://localhost:${port}/v1`, description: 'Product API' }],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'Tenant API key'
      }
    },
    schemas: {
      Tenant: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          status: { type: 'string' }
        }
      },
      Bot: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tenantId: { type: 'string' },
          name: { type: 'string' },
          platform: { type: 'string', enum: ['clubhouse'] },
          status: { type: 'string' },
          aiConfig: { type: 'object' },
          personality: { type: 'string', nullable: true },
          welcomeMessage: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      BotCredential: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tenantId: { type: 'string' },
          botId: { type: 'string' },
          platform: { type: 'string' },
          externalAccountId: { type: 'string' },
          externalAccountName: { type: 'string', nullable: true },
          status: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      BotRoom: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tenantId: { type: 'string' },
          botId: { type: 'string' },
          platform: { type: 'string' },
          externalRoomId: { type: 'string', description: 'Canonical Clubhouse room identity' },
          status: { type: 'string' },
          settings: { $ref: '#/components/schemas/RoomSettings' },
          joinedAt: { type: 'string', format: 'date-time', nullable: true },
          lastSeenAt: { type: 'string', format: 'date-time', nullable: true }
        }
      },
      RoomSettings: {
        type: 'object',
        properties: {
          welcomeEnabled: { type: 'boolean' },
          aiEnabled: { type: 'boolean' },
          autoInviteEnabled: { type: 'boolean' },
          moderationEnabled: { type: 'boolean' }
        }
      },
      Message: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          roomId: { type: 'string' },
          userId: { type: 'string' },
          username: { type: 'string', nullable: true },
          displayName: { type: 'string', nullable: true },
          content: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          platform: { type: 'string' },
          username: { type: 'string', nullable: true },
          displayName: { type: 'string', nullable: true }
        }
      },
      CommunityEvent: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tenantId: { type: 'string' },
          botId: { type: 'string' },
          roomId: { type: 'string' },
          externalRoomId: { type: 'string' },
          platform: { type: 'string' },
          type: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          payload: { type: 'object' }
        }
      },
      UsageSummary: {
        type: 'object',
        properties: {
          totals: { type: 'object' }
        }
      },
      ApiError: errorResponse
    }
  },
  security: [{ ApiKeyAuth: [] }],
  paths: {
    '/bots': {
      post: {
        summary: 'Create bot',
        description: 'Creates a bot owned by the authenticated tenant.',
        tags: ['Bots'],
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'platform'],
                properties: {
                  name: { type: 'string' },
                  platform: { type: 'string', enum: ['clubhouse'] },
                  personality: { type: 'string' },
                  welcomeMessage: { type: 'string' },
                  aiConfig: { type: 'object' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Bot created', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Bot' } } } } } },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } }
        }
      },
      get: {
        summary: 'List bots',
        tags: ['Bots'],
        security: [{ ApiKeyAuth: [] }],
        responses: {
          200: { description: 'Bot list', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Bot' } } } } } } },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } }
        }
      }
    },
    '/bots/{botId}': {
      get: {
        summary: 'Get bot',
        tags: ['Bots'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [{ name: 'botId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Bot', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Bot' } } } } } },
          404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } }
        }
      },
      patch: {
        summary: 'Update bot',
        tags: ['Bots'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [{ name: 'botId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
        responses: {
          200: { description: 'Updated bot', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Bot' } } } } } },
          404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } }
        }
      },
      delete: {
        summary: 'Delete bot',
        tags: ['Bots'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [{ name: 'botId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Deleted' },
          404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } }
        }
      }
    },
    '/bots/{botId}/start': {
      post: {
        summary: 'Start bot runtime',
        tags: ['Bots'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [{ name: 'botId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Bot started', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Bot' } } } } } },
          400: { description: 'Missing credential', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } }
        }
      }
    },
    '/bots/{botId}/stop': {
      post: {
        summary: 'Stop bot runtime',
        tags: ['Bots'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [{ name: 'botId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Bot stopped', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Bot' } } } } } }
        }
      }
    },
    '/bots/{botId}/credentials': {
      post: {
        summary: 'Create credential',
        description: 'Stores an encrypted Clubhouse session for the bot. Plaintext tokens are never returned.',
        tags: ['Credentials'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [{ name: 'botId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token'],
                properties: {
                  token: { type: 'string', writeOnly: true },
                  externalAccountId: { type: 'string' },
                  externalAccountName: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Credential created', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/BotCredential' } } } } } }
        }
      },
      get: {
        summary: 'List credentials',
        tags: ['Credentials'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [{ name: 'botId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Credential list', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/BotCredential' } } } } } } }
        }
      }
    },
    '/bots/{botId}/credentials/{credentialId}': {
      delete: {
        summary: 'Delete credential',
        tags: ['Credentials'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'botId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'credentialId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 204: { description: 'Deleted' }, 404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } } }
      }
    },
    '/bots/{botId}/rooms': {
      post: {
        summary: 'Configure room',
        tags: ['Rooms'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [{ name: 'botId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['externalRoomId'],
                properties: {
                  externalRoomId: { type: 'string', example: 'M84V9RyJ' },
                  settings: { $ref: '#/components/schemas/RoomSettings' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Room configured', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/BotRoom' } } } } } }
        }
      },
      get: {
        summary: 'List rooms',
        tags: ['Rooms'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [{ name: 'botId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Room list', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/BotRoom' } } } } } } }
        }
      }
    },
    '/bots/{botId}/rooms/{externalRoomId}': {
      get: {
        summary: 'Get room by external Clubhouse id',
        tags: ['Rooms'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'botId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'externalRoomId', in: 'path', required: true, schema: { type: 'string', example: 'M84V9RyJ' } }
        ],
        responses: {
          200: { description: 'Room', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/BotRoom' } } } } } },
          404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } }
        }
      }
    },
    '/bots/{botId}/rooms/{externalRoomId}/join': {
      post: {
        summary: 'Join room',
        tags: ['Rooms'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'botId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'externalRoomId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Joined', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/BotRoom' } } } } } } }
      }
    },
    '/bots/{botId}/rooms/{externalRoomId}/leave': {
      post: {
        summary: 'Leave room',
        tags: ['Rooms'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'botId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'externalRoomId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Left', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/BotRoom' } } } } } } }
      }
    },
    '/bots/{botId}/rooms/{externalRoomId}/messages': {
      get: {
        summary: 'List room messages',
        tags: ['Messages'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'botId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'externalRoomId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Messages', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Message' } } } } } } }
        }
      },
      post: {
        summary: 'Send room message',
        tags: ['Messages'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'botId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'externalRoomId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['message'], properties: { message: { type: 'string' } } } } }
        },
        responses: { 200: { description: 'Sent', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'object', properties: { ok: { type: 'boolean' } } } } } } } } }
      }
    },
    '/bots/{botId}/rooms/{externalRoomId}/accept-invite': {
      post: {
        summary: 'Accept speaker invite',
        tags: ['Rooms'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'botId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'externalRoomId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Accepted', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'object', properties: { ok: { type: 'boolean' } } } } } } } } }
      }
    },
    '/bots/{botId}/users/search': {
      post: {
        summary: 'Search users',
        tags: ['Users'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [{ name: 'botId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['query'], properties: { query: { type: 'string' } } } } } },
        responses: { 200: { description: 'Users', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/User' } } } } } } } }
      }
    },
    '/bots/{botId}/users/{userId}': {
      get: {
        summary: 'Get user',
        tags: ['Users'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'botId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'User', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/User' } } } } } } }
      }
    },
    '/bots/{botId}/me': {
      get: {
        summary: 'Get bot Clubhouse profile',
        tags: ['Users'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [{ name: 'botId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Bot profile', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/User' } } } } } } }
      }
    },
    '/bots/{botId}/usage': {
      get: {
        summary: 'Usage summary',
        tags: ['Usage'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [{ name: 'botId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Usage', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/UsageSummary' } } } } } } }
      }
    },
    '/bots/{botId}/events': {
      get: {
        summary: 'List community events',
        tags: ['Usage'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'botId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } }
        ],
        responses: {
          200: {
            description: 'Events',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { data: { type: 'array', items: { $ref: '#/components/schemas/CommunityEvent' } } }
                }
              }
            }
          }
        }
      }
    }
  }
})
