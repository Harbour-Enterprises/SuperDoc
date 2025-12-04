/**
 * Context pool manager
 * Manages a pool of browser contexts for concurrent operations
 */

import type { Browser } from 'playwright-core';
import type { IContextPool, PooledContext, RuntimeConfig } from './types.js';
import { RuntimeError, RuntimeErrorCode } from './types.js';

/** Interval in ms between acquire retry attempts */
const ACQUIRE_RETRY_INTERVAL_MS = 100;

export class ContextPool implements IContextPool {
  private pool: PooledContext[] = [];
  private browser: Browser;
  private poolSize: number;
  private timeout: number;
  private shellUrl: string;

  constructor(browser: Browser, config: RuntimeConfig = {}, shellUrl: string) {
    this.browser = browser;
    this.poolSize = config.poolSize ?? 2;
    this.timeout = config.timeout ?? 30000;
    this.shellUrl = shellUrl;
  }

  /**
   * Initialize the pool with contexts
   */
  async initialize(): Promise<void> {
    console.log(`Initializing context pool with size ${this.poolSize}...`);

    for (let i = 0; i < this.poolSize; i++) {
      const pooled = await this.createPooledContext();
      this.pool.push(pooled);
    }

    console.log(`Context pool initialized with ${this.pool.length} contexts`);
  }

  /**
   * Create a new pooled context
   */
  private async createPooledContext(): Promise<PooledContext> {
    const context = await this.browser.newContext();
    const page = await context.newPage();

    // Load the shell HTML
    await page.goto(this.shellUrl, { waitUntil: 'networkidle', timeout: this.timeout });

    // Load editor module
    await page.addScriptTag({
      type: 'module',
      content: `
        import * as SuperEditor from '/dist/super-editor.es.js';
        window.SuperEditor = SuperEditor;
        window.Editor = SuperEditor.Editor;
        window.getStarterExtensions = SuperEditor.getStarterExtensions;
        window.editorLoaded = true;
      `,
    });

    // Wait for editor to load
    await page.waitForFunction(() => (window as unknown as { editorLoaded?: boolean }).editorLoaded === true, {
      timeout: this.timeout,
    });

    return {
      context,
      page,
      inUse: false,
      createdAt: Date.now(),
    };
  }

  /**
   * Acquire a context from the pool
   * Waits if all contexts are in use
   */
  async acquire(): Promise<PooledContext> {
    const startTime = Date.now();

    while (true) {
      // Find an available context
      const available = this.pool.find((p) => !p.inUse);

      if (available) {
        available.inUse = true;
        return available;
      }

      // Check timeout
      if (Date.now() - startTime > this.timeout) {
        throw new RuntimeError(
          RuntimeErrorCode.CONTEXT_POOL_EXHAUSTED,
          `Failed to acquire context within ${this.timeout}ms`,
        );
      }

      // Wait a bit before retrying
      await new Promise((resolve) => setTimeout(resolve, ACQUIRE_RETRY_INTERVAL_MS));
    }
  }

  /**
   * Release a context back to the pool
   * Clears the page state
   */
  async release(pooled: PooledContext): Promise<void> {
    if (!this.pool.includes(pooled)) {
      console.warn('Attempted to release a context not in the pool');
      return;
    }

    try {
      // Clear any editor instances
      await pooled.page.evaluate(() => {
        const win = window as unknown as { currentEditor?: { destroy: () => void } };
        if (win.currentEditor) {
          win.currentEditor.destroy();
          delete win.currentEditor;
        }
      });

      // Reload the page to ensure clean state
      await pooled.page.goto(this.shellUrl, { waitUntil: 'networkidle', timeout: this.timeout });

      // Reload editor module
      await pooled.page.addScriptTag({
        type: 'module',
        content: `
          import * as SuperEditor from '/dist/super-editor.es.js';
          window.SuperEditor = SuperEditor;
          window.Editor = SuperEditor.Editor;
          window.getStarterExtensions = SuperEditor.getStarterExtensions;
          window.editorLoaded = true;
        `,
      });

      await pooled.page.waitForFunction(() => (window as unknown as { editorLoaded?: boolean }).editorLoaded === true, {
        timeout: this.timeout,
      });

      pooled.inUse = false;
    } catch (error) {
      console.error('Error releasing context, recreating:', error);

      // If release fails, destroy and recreate
      try {
        await pooled.context.close();
      } catch {
        // Ignore close errors
      }

      const index = this.pool.indexOf(pooled);
      if (index !== -1) {
        const newPooled = await this.createPooledContext();
        this.pool[index] = newPooled;
      }
    }
  }

  /**
   * Clear the entire pool
   */
  async clear(): Promise<void> {
    console.log('Clearing context pool...');

    await Promise.all(
      this.pool.map(async (pooled) => {
        try {
          await pooled.context.close();
        } catch (error) {
          console.error('Error closing context:', error);
        }
      }),
    );

    this.pool = [];
    console.log('Context pool cleared');
  }

  /**
   * Get current pool size
   */
  getPoolSize(): number {
    return this.pool.length;
  }

  /**
   * Get pool statistics
   * @returns Object containing total contexts, in-use count, and available count
   */
  getStats() {
    return {
      total: this.pool.length,
      inUse: this.pool.filter((p) => p.inUse).length,
      available: this.pool.filter((p) => !p.inUse).length,
    };
  }
}
