import { describe, it, expect } from 'vitest';
import { filterOutRootInlineNodes } from './docxImporter.js';

const n = (type) => ({ type, attrs: {}, marks: [] });

describe('filterOutRootInlineNodes', () => {
  it('removes inline nodes at the root and keeps block nodes', () => {
    const input = [
      n('text'),
      n('bookmarkStart'),
      n('paragraph'),
      n('lineBreak'),
      n('table'),
      n('pageNumber'),
      n('totalPageCount'),
      n('runItem'),
      n('image'),
      n('tab'),
      n('fieldAnnotation'),
      n('mention'),
      n('contentBlock'),
      n('aiLoaderNode'),
      n('commentRangeStart'),
      n('commentRangeEnd'),
      n('commentReference'),
      n('structuredContent'),
    ];

    const result = filterOutRootInlineNodes(input);
    const types = result.map((x) => x.type);

    expect(types).toEqual(['paragraph', 'table']);
  });

  it('returns an empty array when only inline nodes are provided', () => {
    const input = [n('text'), n('bookmarkStart'), n('lineBreak'), n('mention')];
    const result = filterOutRootInlineNodes(input);
    expect(result).toEqual([]);
  });

  it('returns the same array when there are no inline nodes', () => {
    const input = [n('paragraph'), n('table')];
    const result = filterOutRootInlineNodes(input);
    expect(result).toEqual(input);
  });

  it('handles empty input gracefully', () => {
    expect(filterOutRootInlineNodes([])).toEqual([]);
  });

  it('derives inline types from schema when provided', () => {
    // Build a minimal fake schema map using Map with forEach(name, nodeType)
    const nodes = new Map();
    nodes.set('paragraph', { spec: { group: 'block' } });
    nodes.set('table', { spec: { group: 'block' } });
    nodes.set('text', { spec: { group: 'inline' } });
    nodes.set('bookmarkStart', { spec: { group: 'inline' } });
    nodes.set('lineBreak', { spec: { group: 'inline' } });

    const editor = { schema: { nodes } };

    const input = [n('text'), n('bookmarkStart'), n('paragraph'), n('lineBreak'), n('table')];
    const result = filterOutRootInlineNodes(input, editor);
    const types = result.map((x) => x.type);
    expect(types).toEqual(['paragraph', 'table']);
  });
});
