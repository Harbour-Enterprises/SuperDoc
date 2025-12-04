/**
 * System Handlers
 *
 * Handlers for system-level operations like health checks and ping.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { getSDKManager } from '../services/index.js';

/**
 * Ping handler - simple health check
 */
export async function ping(_request: FastifyRequest, _reply: FastifyReply): Promise<{ pong: boolean }> {
  return { pong: true };
}

/**
 * Health check handler - detailed health status
 */
export async function health(
  _request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{
  status: 'healthy' | 'unhealthy';
  sdk: boolean;
  sessions: number;
  uptime: number;
}> {
  const manager = getSDKManager();

  return {
    status: manager.isInitialized() ? 'healthy' : 'unhealthy',
    sdk: manager.isInitialized(),
    sessions: manager.getSessionCount(),
    uptime: process.uptime(),
  };
}

/**
 * Get active sessions
 */
export async function getSessions(
  _request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ sessions: string[]; count: number }> {
  const manager = getSDKManager();
  const sessions = manager.getActiveSessions();

  return {
    sessions,
    count: sessions.length,
  };
}

// Note: System routes can be registered separately for REST-style access
// They're also available via the RPC endpoint

/**
 * System handler map for RPC-style access
 */
export const systemHandlers = {
  ping,
  health,
  getSessions,
} as const;

export type SystemMethod = keyof typeof systemHandlers;
