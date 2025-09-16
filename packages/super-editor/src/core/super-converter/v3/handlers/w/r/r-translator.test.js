import { describe, it, expect, vi } from 'vitest';
import { translator, config } from './r-translator.js';

describe('w:r r-translator (mark)', () => {
  it('exposes correct metadata', () => {
    expect(config.xmlName).toBe('w:r');
    expect(config.sdNodeOrKeyName).toBe('run');
  });

  it('encode applies a run mark to child content', () => {
    const fakeChild = { type: 'text', text: 'Hello', marks: [] };
    const runNode = { name: 'w:r', elements: [{ name: 'w:t', elements: [{ type: 'text', text: 'Hello' }] }] };

    const params = {
      nodes: [runNode],
      nodeListHandler: { handler: vi.fn(() => [fakeChild]) },
    };
    const out = translator.encode(params);
    const target = Array.isArray(out?.content) ? out.content[0] : out;
    expect(target?.marks?.some((m) => m.type === 'run')).toBe(true);
  });
});

