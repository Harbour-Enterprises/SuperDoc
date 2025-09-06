import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyBlockOrInline } from '@superdoc-dev/ooxml-oracle';
import { config as passthroughConfig } from './passthrough-translator.js';

vi.mock('@superdoc-dev/ooxml-oracle', () => ({
  classifyBlockOrInline: vi.fn(),
}));

describe('passthrough translator (encode/decode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('encode: produces an inline passthrough when classifier returns "inline"', () => {
    classifyBlockOrInline.mockReturnValue('inline');

    const payload = { name: 'w:unknownInlineChild', data: { x: 1 } };
    const params = {
      nodes: [payload],
      ctx: { parent: { name: 'w:p' } }, // will be passed to classifier as 'w:p'
    };

    const res = passthroughConfig.encode(params);

    expect(classifyBlockOrInline).toHaveBeenCalledTimes(1);
    expect(classifyBlockOrInline).toHaveBeenCalledWith('w:p');

    expect(res).toEqual({
      type: 'passthroughInline',
      content: [],
      attrs: { payload },
    });
    // ensure it passes through the exact object reference
    expect(res.attrs.payload).toBe(payload);
  });

  it('encode: produces a block passthrough when classifier returns "block"', () => {
    classifyBlockOrInline.mockReturnValue('block');

    const payload = { name: 'w:unknownBlockChild', meta: { y: 2 } };
    const params = {
      nodes: [payload],
      ctx: { parent: { name: 'w:tc' } }, // table cell
    };

    const res = passthroughConfig.encode(params);

    expect(classifyBlockOrInline).toHaveBeenCalledWith('w:tc');
    expect(res.type).toBe('passthroughBlock');
    expect(res.content).toEqual([]);
    expect(res.attrs.payload).toBe(payload);
  });

  it('encode: falls back to block when classifier returns "unknown"', () => {
    classifyBlockOrInline.mockReturnValue('unknown');

    const payload = { name: 'g13:someChartThing' };
    const params = {
      nodes: [payload],
      ctx: { parent: { name: 'g13:pt' } },
    };

    const res = passthroughConfig.encode(params);

    expect(classifyBlockOrInline).toHaveBeenCalledWith('g13:pt');
    expect(res.type).toBe('passthroughBlock'); // inline only when result === 'inline'
    expect(res.attrs.payload).toBe(payload);
  });

  it('encode: calls classifier with undefined when ctx/parent is missing', () => {
    classifyBlockOrInline.mockReturnValue('block');

    const payload = { name: 'w:mystery' };
    const params = { nodes: [payload] }; // no ctx

    const res = passthroughConfig.encode(params);

    expect(classifyBlockOrInline).toHaveBeenCalledWith(undefined);
    expect(res.type).toBe('passthroughBlock');
    expect(res.attrs.payload).toBe(payload);
  });

  it('decode: returns the original payload', () => {
    const payload = { name: 'w:anything', extra: 123 };
    const node = { attrs: { payload } };

    const decoded = passthroughConfig.decode({ node });

    expect(decoded).toBe(payload);
  });

  it('decode: returns undefined when payload is missing', () => {
    expect(passthroughConfig.decode({ node: {} })).toBeUndefined();
    expect(passthroughConfig.decode({ node: { attrs: {} } })).toBeUndefined();
    expect(passthroughConfig.decode({})).toBeUndefined();
  });
});
