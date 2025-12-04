/**
 * Fastify Server Setup
 *
 * Configures the Fastify server with middleware, routes, and error handling.
 */

import Fastify, { type FastifyInstance } from 'fastify';
import { logger, ServiceError } from './utils/index.js';
import { getHandler, listMethods } from './handlers/index.js';
import { getSDKManager } from './services/index.js';

// =============================================================================
// Types
// =============================================================================

interface RPCRequest {
  method: string;
  params?: Record<string, unknown>;
}

interface RPCResponse {
  result?: unknown;
  error?: string;
}

// =============================================================================
// Server Factory
// =============================================================================

export interface ServerConfig {
  port?: number;
  host?: string;
}

export async function createServer(_config: ServerConfig = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false, // We use our own logger
  });

  // =============================================================================
  // CORS
  // =============================================================================

  app.addHook('onRequest', async (request, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type');

    if (request.method === 'OPTIONS') {
      reply.status(200).send();
    }
  });

  // =============================================================================
  // Request Logging
  // =============================================================================

  app.addHook('onRequest', async (request) => {
    if (request.method !== 'OPTIONS') {
      logger.debug(
        {
          method: request.method,
          url: request.url,
        },
        'Incoming request',
      );
    }
  });

  app.addHook('onResponse', async (request, reply) => {
    if (request.method !== 'OPTIONS') {
      logger.debug(
        {
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          responseTime: reply.elapsedTime,
        },
        'Request completed',
      );
    }
  });

  // =============================================================================
  // Error Handler
  // =============================================================================

  app.setErrorHandler(async (error, request, reply) => {
    logger.error({ error, url: request.url }, 'Request error');

    if (error instanceof ServiceError) {
      return reply.status(error.statusCode).send({
        error: error.message,
        code: error.code,
      });
    }

    // Unknown error
    return reply.status(500).send({
      error: error.message || 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  });

  // =============================================================================
  // Routes
  // =============================================================================

  // Health check (GET for load balancers)
  app.get('/health', async (_request, reply) => {
    const manager = getSDKManager();
    return reply.send({
      status: manager.isInitialized() ? 'healthy' : 'unhealthy',
      sessions: manager.getSessionCount(),
      uptime: process.uptime(),
    });
  });

  // List available methods
  app.get('/methods', async (_request, reply) => {
    return reply.send({
      methods: listMethods(),
    });
  });

  // Main RPC endpoint
  app.post<{ Body: RPCRequest }>('/', async (request, reply) => {
    const { method, params = {} } = request.body;

    if (!method) {
      return reply.status(400).send({
        error: 'method is required',
        code: 'VALIDATION_ERROR',
      } satisfies RPCResponse);
    }

    try {
      const handler = getHandler(method);
      const result = await handler(params);

      return reply.send({ result } satisfies RPCResponse);
    } catch (error) {
      if (error instanceof ServiceError) {
        return reply.status(error.statusCode).send({
          error: error.message,
        } satisfies RPCResponse);
      }

      logger.error({ error, method }, 'Handler error');

      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      } satisfies RPCResponse);
    }
  });

  return app;
}

// =============================================================================
// Server Lifecycle
// =============================================================================

let serverInstance: FastifyInstance | null = null;

/**
 * Start the server
 */
export async function startServer(config: ServerConfig = {}): Promise<FastifyInstance> {
  const port = config.port ?? parseInt(process.env.PORT || '3456', 10);
  const host = config.host ?? '127.0.0.1';

  const app = await createServer(config);

  // Initialize SDK eagerly
  logger.info('Initializing SDK...');
  const manager = getSDKManager();
  await manager.initialize();

  await app.listen({ port, host });
  serverInstance = app;

  logger.info({ port, host }, 'Server started');
  logger.info('Available methods:');
  for (const method of listMethods()) {
    logger.info(`  - ${method}`);
  }

  return app;
}

/**
 * Stop the server
 */
export async function stopServer(): Promise<void> {
  logger.info('Stopping server...');

  // Shutdown SDK first
  const manager = getSDKManager();
  await manager.shutdown();

  // Close server
  if (serverInstance) {
    await serverInstance.close();
    serverInstance = null;
  }

  logger.info('Server stopped');
}

/**
 * Get the current server instance
 */
export function getServer(): FastifyInstance | null {
  return serverInstance;
}
