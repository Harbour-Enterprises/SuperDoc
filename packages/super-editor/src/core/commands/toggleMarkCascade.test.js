import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock selection mark collector to avoid real ProseMirror state
vi.mock('../helpers/getMarksFromSelection.js', () => ({
  getMarksFromSelection: vi.fn(() => []),
}));

import {
  toggleMarkCascade,
  getEffectiveStyleId,
  getStyleIdFromMarks,
  mapMarkToStyleKey,
} from './toggleMarkCascade.js';
import { getMarksFromSelection } from '../helpers/getMarksFromSelection.js';

function mark(name, attrs = {}) {
  return { type: { name }, attrs };
}

function runMarkWithRP(rp) {
  return mark('run', { runProperties: rp });
}

function makeChainRecorder() {
  const calls = [];
  const api = {
    unsetMark: vi.fn((name, opts) => {
      calls.push(['unsetMark', name, opts]);
      return api;
    }),
    setMark: vi.fn((name, attrs, opts) => {
      calls.push(['setMark', name, attrs, opts]);
      return api;
    }),
    run: vi.fn(() => true),
  };
  const chain = vi.fn(() => api);
  return { chain, api, calls };
}

describe('mapMarkToStyleKey', () => {
  it('maps textStyle and color to color', () => {
    expect(mapMarkToStyleKey('textStyle')).toBe('color');
    expect(mapMarkToStyleKey('color')).toBe('color');
  });

  it('passes through other mark names', () => {
    expect(mapMarkToStyleKey('bold')).toBe('bold');
    expect(mapMarkToStyleKey('italic')).toBe('italic');
  });
});

describe('getStyleIdFromMarks', () => {
  it('returns null when no run mark present', () => {
    expect(getStyleIdFromMarks([mark('bold')])).toBe(null);
  });

  it('extracts styleId from runProperties object', () => {
    const m = runMarkWithRP({ styleId: 'Heading1' });
    expect(getStyleIdFromMarks([m])).toBe('Heading1');
  });

  it('extracts styleId from runProperties array rStyle entry', () => {
    const m = runMarkWithRP([
      { xmlName: 'w:other', attributes: { 'w:val': 'nope' } },
      { xmlName: 'w:rStyle', attributes: { 'w:val': 'Title' } },
    ]);
    expect(getStyleIdFromMarks([m])).toBe('Title');
  });
});

describe('getEffectiveStyleId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefers run-level styleId from selection marks (object form)', () => {
    const selMarks = [runMarkWithRP({ styleId: 'Heading2' })];
    const state = { selection: { $from: {} } };
    expect(getEffectiveStyleId(state, selMarks)).toBe('Heading2');
  });

  it('prefers run-level styleId from selection marks (array form)', () => {
    const selMarks = [
      runMarkWithRP([
        { xmlName: 'w:rStyle', attributes: { 'w:val': 'SubtleEmphasis' } },
      ]),
    ];
    const state = { selection: { $from: {} } };
    expect(getEffectiveStyleId(state, selMarks)).toBe('SubtleEmphasis');
  });

  it('falls back to cursor-adjacent nodeBefore marks', () => {
    const before = { marks: [runMarkWithRP({ styleId: 'BeforeStyle' })] };
    const state = { selection: { $from: { nodeBefore: before, nodeAfter: null } } };
    expect(getEffectiveStyleId(state, [])).toBe('BeforeStyle');
  });

  it('falls back to cursor-adjacent nodeAfter marks', () => {
    const after = { marks: [runMarkWithRP({ styleId: 'AfterStyle' })] };
    const state = { selection: { $from: { nodeBefore: null, nodeAfter: after } } };
    expect(getEffectiveStyleId(state, [])).toBe('AfterStyle');
  });

  it('uses textStyle mark styleId when present', () => {
    const selectionMarks = [mark('textStyle', { styleId: 'TS-123' })];
    const state = { selection: { $from: {} } };
    expect(getEffectiveStyleId(state, selectionMarks)).toBe('TS-123');
  });

  it('walks paragraph ancestors to find styleId', () => {
    const paragraph = { type: { name: 'paragraph' }, attrs: { styleId: 'ParaStyle' } };
    const other = { type: { name: 'doc' }, attrs: {} };
    const resolver = {
      depth: 2,
      node: (d) => (d === 1 ? other : paragraph),
    };
    const state = {
      selection: { $from: { pos: 5 } },
      doc: { resolve: () => resolver },
    };
    expect(getEffectiveStyleId(state, [])).toBe('ParaStyle');
  });

  it('returns null when no styleId found anywhere', () => {
    const resolver = { depth: 0, node: () => ({ type: { name: 'doc' } }) };
    const state = { selection: { $from: { pos: 1 } }, doc: { resolve: () => resolver } };
    expect(getEffectiveStyleId(state, [])).toBe(null);
  });
});

describe('toggleMarkCascade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes negation mark when present (turn ON)', () => {
    getMarksFromSelection.mockReturnValueOnce([mark('bold', { value: '0' })]);
    const { chain, calls } = makeChainRecorder();
    const cmd = toggleMarkCascade('bold')({ state: { selection: {} }, chain, editor: {} });
    expect(chain).toHaveBeenCalledTimes(1);
    expect(calls).toEqual([
      ['unsetMark', 'bold', { extendEmptyMarkRange: true }],
    ]);
    expect(cmd).toBe(true);
  });

  it('removes inline and adds negation when style is ON too', () => {
    // inline bold present
    // style provided via run styleId + linkedStyles
    getMarksFromSelection.mockReturnValueOnce([
      mark('bold', {}),
      runMarkWithRP({ styleId: 'Heading1' }),
    ]);
    const editor = {
      converter: {
        linkedStyles: [
          { id: 'Heading1', definition: { styles: { bold: true }, attrs: {} } },
        ],
      },
    };
    const { chain, calls } = makeChainRecorder();
    const result = toggleMarkCascade('bold')({ state: { selection: {} }, chain, editor });
    expect(result).toBe(true);
    expect(calls).toEqual([
      ['unsetMark', 'bold', { extendEmptyMarkRange: true }],
      ['setMark', 'bold', { value: '0' }, { extendEmptyMarkRange: true }],
    ]);
  });

  it('removes inline mark when present without style (turn OFF)', () => {
    getMarksFromSelection.mockReturnValueOnce([mark('bold', {})]);
    const { chain, calls } = makeChainRecorder();
    toggleMarkCascade('bold')({ state: { selection: {} }, chain, editor: {} });
    expect(calls).toEqual([
      ['unsetMark', 'bold', { extendEmptyMarkRange: true }],
    ]);
  });

  it('adds negation when only style is present (turn OFF style)', () => {
    getMarksFromSelection.mockReturnValueOnce([runMarkWithRP({ styleId: 'Title' })]);
    const editor = {
      converter: {
        linkedStyles: [
          { id: 'Title', definition: { styles: { bold: undefined }, attrs: {} } }, // undefined -> treated as ON
        ],
      },
    };
    const { chain, calls } = makeChainRecorder();
    toggleMarkCascade('bold')({ state: { selection: {} }, chain, editor });
    expect(calls).toEqual([
      ['setMark', 'bold', { value: '0' }, { extendEmptyMarkRange: true }],
    ]);
  });

  it('turns ON inline mark when neither inline nor style present', () => {
    getMarksFromSelection.mockReturnValueOnce([]);
    const { chain, calls } = makeChainRecorder();
    toggleMarkCascade('bold')({ state: { selection: {} }, chain, editor: {} });
    expect(calls).toEqual([
      ['setMark', 'bold', {}, { extendEmptyMarkRange: true }],
    ]);
  });

  it('respects custom negationAttrs and isNegation checker', () => {
    getMarksFromSelection.mockReturnValueOnce([mark('italic', { off: true })]);
    const { chain, calls } = makeChainRecorder();
    toggleMarkCascade('italic', {
      negationAttrs: { off: true },
      isNegation: (attrs) => attrs.off === true,
    })({ state: { selection: {} }, chain, editor: {} });
    expect(calls).toEqual([
      ['unsetMark', 'italic', { extendEmptyMarkRange: true }],
    ]);
  });

  it('passes extendEmptyMarkRange=false through to set/unset', () => {
    getMarksFromSelection.mockReturnValueOnce([mark('bold', {})]);
    const { chain, calls } = makeChainRecorder();
    toggleMarkCascade('bold', { extendEmptyMarkRange: false })({ state: { selection: {} }, chain, editor: {} });
    expect(calls).toEqual([
      ['unsetMark', 'bold', { extendEmptyMarkRange: false }],
    ]);
  });

  it('walks basedOn style chain to detect style', () => {
    getMarksFromSelection.mockReturnValueOnce([runMarkWithRP({ styleId: 'Child' })]);
    const editor = {
      converter: {
        linkedStyles: [
          { id: 'Child', definition: { attrs: { basedOn: 'Parent' }, styles: {} } },
          { id: 'Parent', definition: { attrs: {}, styles: { bold: '1' } } },
        ],
      },
    };
    const { chain, calls } = makeChainRecorder();
    toggleMarkCascade('bold')({ state: { selection: {} }, chain, editor });
    expect(calls).toEqual([
      ['setMark', 'bold', { value: '0' }, { extendEmptyMarkRange: true }],
    ]);
  });

  it('treats style value "0" or false as OFF', () => {
    // style present but value explicitly OFF should not trigger negation path when inline exists
    getMarksFromSelection.mockReturnValueOnce([
      mark('bold', {}),
      runMarkWithRP({ styleId: 'S1' }),
    ]);
    const editor = {
      converter: {
        linkedStyles: [
          { id: 'S1', definition: { attrs: {}, styles: { bold: '0' } } },
        ],
      },
    };
    const { chain, calls } = makeChainRecorder();
    toggleMarkCascade('bold')({ state: { selection: {} }, chain, editor });
    expect(calls).toEqual([
      ['unsetMark', 'bold', { extendEmptyMarkRange: true }],
    ]);
  });

  it('default styleDetector fails safely (catch path) and proceeds as style OFF', () => {
    getMarksFromSelection.mockReturnValueOnce([]);
    const { chain, calls } = makeChainRecorder();
    // state is null to trigger an error inside defaultStyleDetector -> returns false
    toggleMarkCascade('bold')({ state: null, chain, editor: {} });
    expect(calls).toEqual([
      ['setMark', 'bold', {}, { extendEmptyMarkRange: true }],
    ]);
  });
});
