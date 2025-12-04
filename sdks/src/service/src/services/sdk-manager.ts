/**
 * SDK Manager Service
 *
 * Manages the lifecycle of the SuperDoc SDK and editor sessions.
 * Provides a clean interface for handlers to interact with the SDK.
 */

import { init, type SuperdocSDK, type Editor } from '@superdoc-dev/superdoc-sdk';
import { logger, SessionError, SDKError } from '../utils/index.js';

export interface SDKManagerConfig {
  poolSize?: number;
}

/**
 * Manages SDK lifecycle and editor sessions
 */
export class SDKManager {
  private sdk: SuperdocSDK | null = null;
  private editors: Map<string, Editor> = new Map();
  private sessionCounter = 0;
  private initPromise: Promise<void> | null = null;
  private shutdownInProgress = false;

  constructor(private config: SDKManagerConfig = {}) {}

  /**
   * Initialize the SDK (lazy, called on first use)
   */
  async initialize(): Promise<void> {
    if (this.sdk) return;

    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = this._doInit();
    await this.initPromise;
  }

  private async _doInit(): Promise<void> {
    logger.info('Initializing SuperDoc SDK...');
    try {
      this.sdk = await init({
        poolSize: this.config.poolSize ?? 2,
      });
      logger.info('SDK initialized successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize SDK');
      throw new SDKError('Failed to initialize SDK', error as Error);
    }
  }

  /**
   * Check if SDK is initialized
   */
  isInitialized(): boolean {
    return this.sdk !== null;
  }

  /**
   * Create a new editor session from DOCX buffer
   */
  async createSession(docxBuffer: Buffer): Promise<string> {
    await this.initialize();

    if (!this.sdk) {
      throw new SDKError('SDK not initialized');
    }

    try {
      const editor = await this.sdk.getEditor(docxBuffer);
      const sessionId = `session_${++this.sessionCounter}`;
      this.editors.set(sessionId, editor);

      logger.debug({ sessionId }, 'Created new editor session');
      return sessionId;
    } catch (error) {
      logger.error({ error }, 'Failed to create editor session');
      throw new SDKError('Failed to load document', error as Error);
    }
  }

  /**
   * Get an editor by session ID
   */
  getEditor(sessionId: string): Editor {
    const editor = this.editors.get(sessionId);
    if (!editor) {
      throw new SessionError(sessionId);
    }
    return editor;
  }

  /**
   * Check if a session exists
   */
  hasSession(sessionId: string): boolean {
    return this.editors.has(sessionId);
  }

  /**
   * Destroy an editor session
   */
  async destroySession(sessionId: string): Promise<void> {
    const editor = this.editors.get(sessionId);
    if (editor) {
      try {
        await editor.destroy();
      } catch (error) {
        logger.warn({ sessionId, error }, 'Error destroying editor');
      }
      this.editors.delete(sessionId);
      logger.debug({ sessionId }, 'Destroyed editor session');
    }
  }

  /**
   * Get all active session IDs
   */
  getActiveSessions(): string[] {
    return Array.from(this.editors.keys());
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.editors.size;
  }

  /**
   * Shutdown the SDK and all sessions
   */
  async shutdown(): Promise<void> {
    if (this.shutdownInProgress) return;
    this.shutdownInProgress = true;

    logger.info('Shutting down SDK manager...');

    // Destroy all editors
    const sessions = Array.from(this.editors.entries());
    for (const [sessionId, editor] of sessions) {
      try {
        await editor.destroy();
        logger.debug({ sessionId }, 'Destroyed session during shutdown');
      } catch (error) {
        logger.warn({ sessionId, error }, 'Error destroying session during shutdown');
      }
    }
    this.editors.clear();

    // Close SDK
    if (this.sdk) {
      try {
        await this.sdk.close();
        logger.info('SDK closed');
      } catch (error) {
        logger.warn({ error }, 'Error closing SDK');
      }
      this.sdk = null;
    }

    this.initPromise = null;
    this.shutdownInProgress = false;
  }
}

// Singleton instance
let instance: SDKManager | null = null;

/**
 * Get the global SDK manager instance
 */
export function getSDKManager(config?: SDKManagerConfig): SDKManager {
  if (!instance) {
    instance = new SDKManager(config);
  }
  return instance;
}

/**
 * Reset the SDK manager (for testing)
 */
export async function resetSDKManager(): Promise<void> {
  if (instance) {
    await instance.shutdown();
    instance = null;
  }
}
