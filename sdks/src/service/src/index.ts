/**
 * SuperDoc HTTP API Service
 *
 * Entry point for the service. Handles startup and graceful shutdown.
 *
 * Usage:
 *   npm start [port]
 *   npm run dev  # with hot reload
 */

import { startServer, stopServer } from './server.js';
import { logger } from './utils/index.js';

// =============================================================================
// Configuration
// =============================================================================

const PORT = parseInt(process.argv[2] || process.env.PORT || '3456', 10);

// =============================================================================
// Startup
// =============================================================================

async function main(): Promise<void> {
  logger.info('Starting SuperDoc HTTP API Service...');

  try {
    await startServer({ port: PORT });
  } catch (error) {
    logger.fatal({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// =============================================================================
// Graceful Shutdown
// =============================================================================

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Received shutdown signal');

  try {
    await stopServer();
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
}

// Register signal handlers
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled rejection');
  process.exit(1);
});

// =============================================================================
// Run
// =============================================================================

main();
