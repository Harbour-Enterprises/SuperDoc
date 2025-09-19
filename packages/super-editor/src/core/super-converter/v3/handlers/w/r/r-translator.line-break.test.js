import { describe, it, expect } from 'vitest';
import { defaultNodeListHandler } from '../../../../v2/importer/docxImporter.js';
import { translator } from './r-translator.js';

describe('w:r translator line break handling', () => {
  it('preserves <w:br> children before and between text nodes', () => {
    const runNode = {
      name: 'w:r',
      elements: [
        { name: 'w:t', elements: [{ type: 'text', text: 'One' }] },
        { name: 'w:br' },
        { name: 'w:t', elements: [{ type: 'text', text: 'test' }] },
        { name: 'w:br' },
        { name: 'w:t', elements: [{ type: 'text', text: 'after space' }] },
      ],
    };

    const handler = defaultNodeListHandler();
    const result = translator.encode({ nodes: [runNode], nodeListHandler: handler, docx: {} });

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(5);
    expect(result[0]).toMatchObject({ type: 'text', text: 'One' });
    expect(result[1]).toMatchObject({ type: 'lineBreak' });
    expect(result[2]).toMatchObject({ type: 'text', text: 'test' });
    expect(result[3]).toMatchObject({ type: 'lineBreak' });
    expect(result[4]).toMatchObject({ type: 'text', text: 'after space' });
  });

  it('preserves leading <w:br> nodes in a run', () => {
    const runNode = {
      name: 'w:r',
      elements: [{ name: 'w:br' }, { name: 'w:t', elements: [{ type: 'text', text: 'starts with break' }] }],
    };

    const handler = defaultNodeListHandler();
    const result = translator.encode({ nodes: [runNode], nodeListHandler: handler, docx: {} });

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ type: 'lineBreak' });
    expect(result[1]).toMatchObject({ type: 'text', text: 'starts with break' });
  });

  it('preserves runs that are only <w:br>', () => {
    const runNode = {
      name: 'w:r',
      elements: [{ name: 'w:br' }],
    };

    const handler = defaultNodeListHandler();
    const result = translator.encode({ nodes: [runNode], nodeListHandler: handler, docx: {} });

    expect(Array.isArray(result)).toBe(false);
    expect(result).toMatchObject({ type: 'lineBreak' });
  });
});
