import { describe, it, expect, vi } from 'vitest';
import { Editor } from '@core/index.js';
import { getStarterExtensions } from '@extensions/index.js';

describe('Run mark', () => {
  it('is present in the starter schema', () => {
    const originalMatchMedia = window.matchMedia;
    if (!originalMatchMedia) {
      window.matchMedia = vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
    }
    const editor = new Editor({
      extensions: getStarterExtensions(),
    });
    expect(editor.schema.marks.run).toBeDefined();
    if (!originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
    }
  });
});
