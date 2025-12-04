/**
 * Main Runtime class
 * Coordinates browser, context pool, and operations
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Server } from 'http';
import type { RuntimeConfig, IDocumentOperations } from './types.js';
import { BrowserManager } from './browser-manager.js';
import { ContextPool } from './context-pool.js';
import { DocumentOperations } from './operations.js';
import { createStaticServer } from './server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Default port for the static file server */
const DEFAULT_SERVER_PORT = 9999;

export class SuperdocRuntime {
  private browserManager: BrowserManager;
  private contextPool: ContextPool | null = null;
  private operations: DocumentOperations | null = null;
  private server: Server | null = null;
  private config: RuntimeConfig;
  private serverPort: number;

  constructor(config: RuntimeConfig = {}) {
    this.config = {
      poolSize: config.poolSize ?? 2,
      headless: config.headless ?? true,
      timeout: config.timeout ?? 30000,
      chromiumPath: config.chromiumPath,
      port: config.port ?? DEFAULT_SERVER_PORT,
      editorDistPath: config.editorDistPath,
    };

    this.serverPort = this.config.port ?? DEFAULT_SERVER_PORT;
    this.browserManager = new BrowserManager(this.config);
  }

  /**
   * Initialize and start the runtime
   */
  async start(): Promise<void> {
    console.log('Starting SuperDoc Runtime...');

    // Determine paths
    const shellPath = join(__dirname, '../shell/index.html');
    const editorDistPath = this.config.editorDistPath || join(__dirname, '../../../../packages/super-editor/dist');

    // Start static server
    console.log('Starting static file server...');
    this.server = await createStaticServer({
      port: this.serverPort,
      editorDistPath,
      shellPath,
    });

    // Start browser
    await this.browserManager.start();

    const browser = this.browserManager.getBrowser();
    if (!browser) {
      throw new Error('Browser failed to start');
    }

    // Initialize context pool
    const shellUrl = `http://localhost:${this.serverPort}/`;
    this.contextPool = new ContextPool(browser, this.config, shellUrl);
    await this.contextPool.initialize();

    // Initialize operations
    this.operations = new DocumentOperations(this.contextPool);

    console.log('SuperDoc Runtime started successfully');
    console.log(`Pool size: ${this.contextPool.getPoolSize()}`);
  }

  /**
   * Stop the runtime
   */
  async stop(): Promise<void> {
    console.log('Stopping SuperDoc Runtime...');

    // Cleanup operations
    if (this.operations) {
      await this.operations.cleanup();
      this.operations = null;
    }

    // Clear context pool
    if (this.contextPool) {
      await this.contextPool.clear();
      this.contextPool = null;
    }

    // Stop browser
    await this.browserManager.stop();

    // Stop server
    if (this.server) {
      this.server.close();
      this.server = null;
      console.log('Server stopped');
    }

    console.log('SuperDoc Runtime stopped');
  }

  /**
   * Get the operations interface
   */
  getOperations(): IDocumentOperations {
    if (!this.operations) {
      throw new Error('Runtime not started. Call start() first.');
    }
    return this.operations;
  }

  /**
   * Get current pool statistics
   * @returns Pool statistics including total, in-use, and available contexts
   */
  getStats() {
    if (!this.contextPool) {
      return { total: 0, inUse: 0, available: 0 };
    }
    return this.contextPool.getStats();
  }
}
