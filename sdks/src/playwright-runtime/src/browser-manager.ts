/**
 * Browser lifecycle manager
 * Manages a single Playwright browser instance
 */

import { chromium, type Browser, type LaunchOptions } from 'playwright-core';
import type { RuntimeConfig, IBrowserManager } from './types.js';
import { RuntimeError, RuntimeErrorCode } from './types.js';

export class BrowserManager implements IBrowserManager {
  private browser: Browser | null = null;
  private config: Required<Omit<RuntimeConfig, 'port' | 'editorDistPath'>>;

  constructor(config: RuntimeConfig = {}) {
    this.config = {
      poolSize: config.poolSize ?? 2,
      chromiumPath: config.chromiumPath ?? '',
      headless: config.headless ?? true,
      timeout: config.timeout ?? 30000,
    };
  }

  /**
   * Launch the browser
   */
  async start(): Promise<void> {
    if (this.browser) {
      console.warn('Browser already running');
      return;
    }

    try {
      const launchOptions: LaunchOptions = {
        headless: this.config.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      };

      if (this.config.chromiumPath) {
        launchOptions.executablePath = this.config.chromiumPath;
      }

      this.browser = await chromium.launch(launchOptions);
      console.log('Browser launched successfully');
    } catch (error) {
      throw new RuntimeError(RuntimeErrorCode.BROWSER_LAUNCH_FAILED, 'Failed to launch browser', error as Error);
    }
  }

  /**
   * Stop the browser
   */
  async stop(): Promise<void> {
    if (!this.browser) {
      return;
    }

    try {
      await this.browser.close();
      this.browser = null;
      console.log('Browser stopped');
    } catch (error) {
      console.error('Error stopping browser:', error);
    }
  }

  /**
   * Get the browser instance
   */
  getBrowser(): Browser | null {
    return this.browser;
  }

  /**
   * Check if the browser is currently running
   * @returns True if browser is running and connected
   */
  isRunning(): boolean {
    return this.browser !== null && this.browser.isConnected();
  }
}
