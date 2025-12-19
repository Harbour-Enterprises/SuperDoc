import { describe, it, expect, beforeEach } from 'vitest';
import { canUseDOM, resetDOMCache } from './canUseDOM.js';

/**
 * Store original global values for restoration after tests.
 */
const ORIGINAL_GLOBALS = {
  window: (globalThis as typeof globalThis & { window?: unknown }).window,
  document: (globalThis as typeof globalThis & { document?: unknown }).document,
};

describe('canUseDOM', () => {
  beforeEach(() => {
    // Reset the cache before each test to ensure isolation
    resetDOMCache();

    // Restore original globals
    if (ORIGINAL_GLOBALS.window === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = ORIGINAL_GLOBALS.window;
    }

    if (ORIGINAL_GLOBALS.document === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = ORIGINAL_GLOBALS.document;
    }
  });

  describe('DOM detection', () => {
    it('returns false when window is undefined', () => {
      delete globalThis.window;
      delete globalThis.document;

      const result = canUseDOM();

      expect(result).toBe(false);
    });

    it('returns false when document is undefined', () => {
      // Create a mock window without document
      (globalThis as { window?: unknown }).window = { setTimeout: () => 0 };
      delete globalThis.document;

      const result = canUseDOM();

      expect(result).toBe(false);
    });

    it('returns false when document.createElement is not a function', () => {
      // Create mock globals with document but no createElement
      (globalThis as { window?: unknown }).window = {};
      (globalThis as { document?: unknown }).document = { querySelector: () => null };

      const result = canUseDOM();

      expect(result).toBe(false);
    });

    it('handles edge cases with globalThis check', () => {
      // globalThis should always be defined in modern environments
      // This test just verifies the function handles the check correctly
      const result = canUseDOM();
      expect(typeof result).toBe('boolean');
    });

    it('returns true when all DOM globals are present and functional', () => {
      // Create complete mock DOM environment
      (globalThis as { window?: unknown }).window = {
        setTimeout: () => 0,
        addEventListener: () => {},
      };
      (globalThis as { document?: unknown }).document = {
        createElement: () => ({ setAttribute: () => {} }),
        querySelector: () => null,
        addEventListener: () => {},
      };

      const result = canUseDOM();

      expect(result).toBe(true);
    });

    it('handles errors during detection gracefully', () => {
      // Create a scenario where accessing properties throws
      Object.defineProperty(globalThis, 'window', {
        get() {
          throw new Error('Access denied');
        },
        configurable: true,
      });

      const result = canUseDOM();

      expect(result).toBe(false);

      // Cleanup
      delete globalThis.window;
    });
  });

  describe('caching behavior', () => {
    it('caches the result on first call', () => {
      delete globalThis.window;
      delete globalThis.document;

      // First call - should detect and cache false
      const firstResult = canUseDOM();
      expect(firstResult).toBe(false);

      // Simulate DOM becoming available (this shouldn't affect cached result)
      (globalThis as { window?: unknown }).window = {};
      (globalThis as { document?: unknown }).document = {
        createElement: () => ({}),
      };

      // Second call - should return cached false despite DOM now being available
      const secondResult = canUseDOM();
      expect(secondResult).toBe(false);
    });

    it('caches positive results', () => {
      // Set up DOM environment
      (globalThis as { window?: unknown }).window = {};
      (globalThis as { document?: unknown }).document = {
        createElement: () => ({}),
      };

      // First call - should detect and cache true
      const firstResult = canUseDOM();
      expect(firstResult).toBe(true);

      // Remove DOM
      delete globalThis.window;
      delete globalThis.document;

      // Second call - should return cached true despite DOM now being gone
      const secondResult = canUseDOM();
      expect(secondResult).toBe(true);
    });

    it('caches error results', () => {
      // Create a throwing scenario
      Object.defineProperty(globalThis, 'window', {
        get() {
          throw new Error('Access denied');
        },
        configurable: true,
      });

      // First call - should catch error and cache false
      const firstResult = canUseDOM();
      expect(firstResult).toBe(false);

      // Fix the property
      delete globalThis.window;
      (globalThis as { window?: unknown }).window = {};
      (globalThis as { document?: unknown }).document = {
        createElement: () => ({}),
      };

      // Second call - should still return cached false
      const secondResult = canUseDOM();
      expect(secondResult).toBe(false);
    });
  });

  describe('resetDOMCache', () => {
    it('clears the cache allowing re-detection', () => {
      delete globalThis.window;
      delete globalThis.document;

      // First call - cache false
      expect(canUseDOM()).toBe(false);

      // Add DOM
      (globalThis as { window?: unknown }).window = {};
      (globalThis as { document?: unknown }).document = {
        createElement: () => ({}),
      };

      // Should still be false (cached)
      expect(canUseDOM()).toBe(false);

      // Reset cache
      resetDOMCache();

      // Should now detect DOM and return true
      expect(canUseDOM()).toBe(true);
    });

    it('allows multiple resets', () => {
      delete globalThis.window;
      delete globalThis.document;

      expect(canUseDOM()).toBe(false);

      resetDOMCache();
      resetDOMCache();
      resetDOMCache();

      // Should still work correctly
      expect(canUseDOM()).toBe(false);
    });

    it('can be called before first canUseDOM call', () => {
      // This should not throw
      expect(() => resetDOMCache()).not.toThrow();
    });
  });

  describe('real-world scenarios', () => {
    it('correctly identifies Node.js environment without DOM', () => {
      // In @vitest-environment node, window and document are undefined
      delete globalThis.window;
      delete globalThis.document;

      expect(canUseDOM()).toBe(false);
    });

    it('correctly identifies JSDOM environment', () => {
      // Simulate JSDOM environment with createElement
      (globalThis as { window?: unknown }).window = {
        document: {
          createElement: () => ({}),
        },
      };
      (globalThis as { document?: unknown }).document = {
        createElement: () => ({}),
      };

      expect(canUseDOM()).toBe(true);
    });

    it('correctly identifies browser environment', () => {
      // Simulate browser with full DOM
      (globalThis as { window?: unknown }).window = {
        document: {
          createElement: (tag: string) => ({ tagName: tag }),
          querySelector: () => null,
          addEventListener: () => {},
        },
        addEventListener: () => {},
        location: { href: 'https://example.com' },
      };
      (globalThis as { document?: unknown }).document = {
        createElement: (tag: string) => ({ tagName: tag }),
        querySelector: () => null,
        addEventListener: () => {},
      };

      expect(canUseDOM()).toBe(true);
    });
  });
});
