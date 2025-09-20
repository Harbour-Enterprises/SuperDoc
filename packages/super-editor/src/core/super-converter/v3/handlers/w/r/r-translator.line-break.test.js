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

    expect(result?.type).toBe('run');
    expect(result.content).toHaveLength(5);
    expect(result.content[0]).toMatchObject({ type: 'text', text: 'One' });
    expect(result.content[1]).toMatchObject({ type: 'lineBreak' });
    expect(result.content[2]).toMatchObject({ type: 'text', text: 'test' });
    expect(result.content[3]).toMatchObject({ type: 'lineBreak' });
    expect(result.content[4]).toMatchObject({ type: 'text', text: 'after space' });
  });

  it('preserves leading <w:br> nodes in a run', () => {
    const runNode = {
      name: 'w:r',
      elements: [{ name: 'w:br' }, { name: 'w:t', elements: [{ type: 'text', text: 'starts with break' }] }],
    };

    const handler = defaultNodeListHandler();
    const result = translator.encode({ nodes: [runNode], nodeListHandler: handler, docx: {} });

    expect(result?.type).toBe('run');
    expect(result.content).toHaveLength(2);
    expect(result.content[0]).toMatchObject({ type: 'lineBreak' });
    expect(result.content[1]).toMatchObject({ type: 'text', text: 'starts with break' });
  });

  it('preserves runs that are only <w:br>', () => {
    const runNode = {
      name: 'w:r',
      elements: [{ name: 'w:br' }],
    };

    const handler = defaultNodeListHandler();
    const result = translator.encode({ nodes: [runNode], nodeListHandler: handler, docx: {} });

    expect(result?.type).toBe('run');
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toMatchObject({ type: 'lineBreak' });
  });
});
