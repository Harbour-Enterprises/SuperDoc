import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./helpers.js', () => ({
  getLinkedStyle: vi.fn(),
  generateLinkedStyleString: vi.fn(),
}));

vi.mock('prosemirror-view', () => ({
  Decoration: {
    inline: vi.fn((from, to, attrs) => ({ type: 'inline', from, to, attrs })),
  },
}));

import { generateStyleDecoration, checkNodeHasStyleId } from './plugin-helpers.js';

import { getLinkedStyle, generateLinkedStyleString } from './helpers.js';
import { Decoration } from 'prosemirror-view';

describe('generateStyleDecoration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeState = (parent = { type: 'paragraph' }) => ({
    doc: {
      resolve: vi.fn().mockReturnValue({ parent }),
    },
  });

  it('returns undefined when no linkedStyle is found', () => {
    getLinkedStyle.mockReturnValue({ linkedStyle: null, basedOnStyle: null });

    const state = makeState();
    const node = { nodeSize: 5 };
    const res = generateStyleDecoration('Heading1', [], state, node, 10);

    expect(res).toBeUndefined();
    expect(Decoration.inline).not.toHaveBeenCalled();
    expect(state.doc.resolve).not.toHaveBeenCalled(); // bails before resolve()
  });

  it('extracts styleId from object via w:val and generates a Decoration', () => {
    getLinkedStyle.mockReturnValue({
      linkedStyle: { id: 'Strong' },
      basedOnStyle: { id: 'Normal' },
    });
    generateLinkedStyleString.mockReturnValue('font-weight:bold');

    const state = makeState({ type: 'paragraph', attrs: { id: 'p1' } });
    const node = { nodeSize: 3 };
    const pos = 42;

    const styleIdObj = { attributes: { 'w:val': 'Strong' } };
    const res = generateStyleDecoration(styleIdObj, [], state, node, pos);

    // verify resolve and arg plumbing
    expect(state.doc.resolve).toHaveBeenCalledWith(pos);
    expect(getLinkedStyle).toHaveBeenCalledWith('Strong', []);
    expect(generateLinkedStyleString).toHaveBeenCalledWith(
      { id: 'Strong' }, // linkedStyle
      { id: 'Normal' }, // basedOnStyle
      node, // node
      { type: 'paragraph', attrs: { id: 'p1' } }, // parent from resolve()
    );

    // verify Decoration.inline call and return shape
    expect(Decoration.inline).toHaveBeenCalledWith(pos, pos + node.nodeSize, { style: 'font-weight:bold' });
    expect(res).toEqual({
      type: 'inline',
      from: pos,
      to: pos + node.nodeSize,
      attrs: { style: 'font-weight:bold' },
    });
  });

  it('returns undefined when generateLinkedStyleString returns falsy', () => {
    getLinkedStyle.mockReturnValue({
      linkedStyle: { id: 'Emphasis' },
      basedOnStyle: null,
    });
    generateLinkedStyleString.mockReturnValue('');

    const state = makeState();
    const node = { nodeSize: 2 };

    const res = generateStyleDecoration('Emphasis', [], state, node, 7);

    expect(state.doc.resolve).toHaveBeenCalledWith(7);
    expect(res).toBeUndefined();
    expect(Decoration.inline).not.toHaveBeenCalled();
  });

  it('uses pos + node.nodeSize for the range', () => {
    getLinkedStyle.mockReturnValue({
      linkedStyle: { id: 'Custom' },
      basedOnStyle: null,
    });
    generateLinkedStyleString.mockReturnValue('color:red');

    const state = makeState();
    const node = { nodeSize: 10 };
    const pos = 5;

    generateStyleDecoration('Custom', [], state, node, pos);

    expect(Decoration.inline).toHaveBeenCalledWith(5, 15, { style: 'color:red' });
  });
});

describe('checkNodeHasStyleId', () => {
  it('returns node.attrs.styleId when present', () => {
    const node = { attrs: { styleId: 'Heading1' } };
    expect(checkNodeHasStyleId(node)).toBe('Heading1');
  });

  it('falls back to run-level w:rStyle in runProperties array', () => {
    const node = {
      attrs: {
        runProperties: [{ xmlName: 'w:b' }, { xmlName: 'w:rStyle', attributes: { 'w:val': 'Strong' } }],
      },
    };
    expect(checkNodeHasStyleId(node)).toBe('Strong');
  });

  it('returns undefined when neither path exists', () => {
    expect(checkNodeHasStyleId({})).toBeUndefined();
    expect(checkNodeHasStyleId(undefined)).toBeUndefined();
  });
});
