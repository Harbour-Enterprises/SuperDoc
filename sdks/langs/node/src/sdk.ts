/**
 * Main SDK implementation
 */

import { SuperdocRuntime } from '@superdoc/playwright-runtime';
import type { SDKConfig, Editor, ISuperdocSDK } from './types.js';

export class SuperdocSDK implements ISuperdocSDK {
  private runtime: SuperdocRuntime | null = null;
  private config: SDKConfig;

  constructor(config: SDKConfig = {}) {
    this.config = {
      poolSize: config.poolSize ?? 2,
      chromiumPath: config.chromiumPath,
      timeout: config.timeout ?? 30000,
    };
  }

  /**
   * Initialize the SDK and start the browser runtime.
   *
   * This method must be called before using getEditor(). It starts a headless
   * Chromium instance with a pool of browser contexts based on the poolSize config.
   *
   * @throws {Error} If browser fails to launch or runtime initialization fails
   * @example
   * ```typescript
   * const sdk = new SuperdocSDK({ poolSize: 3 });
   * await sdk.init();
   * ```
   */
  async init(): Promise<void> {
    if (this.runtime) {
      console.warn('SDK already initialized');
      return;
    }

    this.runtime = new SuperdocRuntime({
      poolSize: this.config.poolSize,
      chromiumPath: this.config.chromiumPath,
      headless: true,
      timeout: this.config.timeout,
    });

    await this.runtime.start();
  }

  /**
   * Load a DOCX file and get an editor handle for document operations.
   *
   * The editor is backed by a browser context from the pool. When you're done
   * with the editor, call editor.destroy() to return the context to the pool.
   *
   * @param docxBuffer - DOCX file as a Node.js Buffer
   * @returns Promise that resolves to an Editor instance
   * @throws {Error} If SDK is not initialized (call init() first)
   * @throws {Error} If DOCX buffer is invalid or cannot be loaded
   * @example
   * ```typescript
   * const docxBuffer = readFileSync('document.docx');
   * const editor = await sdk.getEditor(docxBuffer);
   * const json = await editor.getJSON();
   * await editor.destroy();
   * ```
   */
  async getEditor(docxBuffer: Buffer): Promise<Editor> {
    if (!this.runtime) {
      throw new Error('SDK not initialized. Call init() first.');
    }

    const ops = this.runtime.getOperations();
    const editorHandle = await ops.loadDocx(docxBuffer);

    // EditorHandle implements the same methods as Editor - cast for stricter SDK types
    return editorHandle as Editor;
  }

  /**
   * Get browser context pool statistics.
   *
   * Use this to monitor pool utilization and determine if you need to
   * increase poolSize for better concurrency.
   *
   * @returns Object containing pool statistics
   * @example
   * ```typescript
   * const { total, inUse, available } = sdk.getStats();
   * console.log(`Pool: ${inUse}/${total} contexts in use`);
   * ```
   */
  getStats() {
    if (!this.runtime) {
      return { total: 0, inUse: 0, available: 0 };
    }
    return this.runtime.getStats();
  }

  /**
   * Shutdown the SDK and cleanup all resources.
   *
   * This method closes the browser, releases all contexts, and cleans up
   * the runtime. After calling close(), you cannot use this SDK instance
   * anymore and must create a new one.
   *
   * Always call close() in a finally block to ensure proper cleanup.
   *
   * @example
   * ```typescript
   * const sdk = await init();
   * try {
   *   // ... use sdk
   * } finally {
   *   await sdk.close();
   * }
   * ```
   */
  async close(): Promise<void> {
    if (!this.runtime) {
      return;
    }

    await this.runtime.stop();
    this.runtime = null;
  }
}

/**
 * Initialize the SDK and start the browser runtime.
 *
 * This is the main entry point for creating an SDK instance. It creates
 * and initializes the SDK in one call, starting the headless Chromium
 * browser with a pool of contexts for concurrent document processing.
 *
 * @param config - Optional SDK configuration
 * @returns Promise that resolves to initialized SuperdocSDK instance
 * @throws {Error} If browser fails to launch or initialization fails
 * @example
 * ```typescript
 * const sdk = await init({ poolSize: 3, timeout: 60000 });
 * const editor = await sdk.getEditor(docxBuffer);
 * ```
 */
export async function init(config?: SDKConfig): Promise<SuperdocSDK> {
  const sdk = new SuperdocSDK(config);
  await sdk.init();
  return sdk;
}
