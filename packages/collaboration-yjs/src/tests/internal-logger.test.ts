import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createLogger } from '../internal-logger/logger.js';

describe('createLogger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('logs with configured color for known label', () => {
    const logger = createLogger('ConnectionHandler');

    logger('connected', 123);

    expect(consoleSpy).toHaveBeenCalledWith('\x1b[34m[ConnectionHandler]\x1b[0m', 'connected', 123);
  });

  test('falls back to reset color for unknown label', () => {
    const logger = createLogger('Custom');

    logger('info');

    expect(consoleSpy).toHaveBeenCalledWith('\x1b[0m[Custom]\x1b[0m', 'info');
  });

  test('returns a stable logging function', () => {
    const logger = createLogger('DocumentManager');
    const secondLogger = createLogger('DocumentManager');

    expect(typeof logger).toBe('function');
    expect(typeof secondLogger).toBe('function');
    expect(logger).not.toBe(secondLogger);
  });
});
