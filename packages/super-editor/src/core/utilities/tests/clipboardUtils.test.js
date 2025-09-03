import { describe, it, expect, vi, afterEach } from 'vitest';

import { ensureClipboardPermission, readFromClipboard } from '../clipboardUtils.js';

// Helper to restore globals after each test
const originalNavigator = global.navigator;
const originalWindowClipboardItem = globalThis.ClipboardItem;

function restoreGlobals() {
  if (typeof originalNavigator !== 'undefined') {
    global.navigator = originalNavigator;
  } else {
    delete global.navigator;
  }

  if (typeof originalWindowClipboardItem !== 'undefined') {
    globalThis.ClipboardItem = originalWindowClipboardItem;
  } else {
    delete globalThis.ClipboardItem;
  }
}

afterEach(() => {
  restoreGlobals();
  vi.restoreAllMocks();
});

describe('clipboardUtils', () => {
  describe('ensureClipboardPermission', () => {
    it('navigator undefined returns false', async () => {
      // Remove navigator entirely
      delete global.navigator;
      const result = await ensureClipboardPermission();
      expect(result).toBe(false);
    });
    it('permissions absent but clipboard present returns true', async () => {
      global.navigator = {
        clipboard: {},
      };
      const result = await ensureClipboardPermission();
      expect(result).toBe(true);
    });
  });

  describe('readFromClipboard', () => {
    it('navigator.clipboard undefined returns null (no throw)', async () => {
      global.navigator = {};
      const mockState = { schema: { text: (t) => t } };
      const res = await readFromClipboard(mockState);
      expect(res).toBeNull();
    });

    it('read() fails so fallback readText() is used', async () => {
      const readTextMock = vi.fn().mockResolvedValue('plain');
      global.navigator = {
        clipboard: {
          read: vi.fn().mockRejectedValue(new Error('fail')),
          readText: readTextMock,
        },
        permissions: {
          query: vi.fn().mockResolvedValue({ state: 'granted' }),
        },
      };

      const mockState = { schema: { text: (t) => t } };
      const res = await readFromClipboard(mockState);

      expect(readTextMock).toHaveBeenCalled();
      expect(res).toBe('plain');
    });
  });
});
