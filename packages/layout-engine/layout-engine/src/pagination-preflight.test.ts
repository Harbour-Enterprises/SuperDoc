import { describe, expect, it } from 'vitest';
import type { FlowBlock, Measure, ParagraphMeasure } from '@superdoc/contracts';
import { createLayoutDocumentContinuation, layoutDocument, type LayoutOptions } from './index.js';
import {
  createCanonicalPaginationSourceReader,
  createPreparedPaginationSuffix,
  prepareCanonicalPaginationSource,
} from './source-preparation.js';

const geometry = { pageSize: { w: 200, h: 120 }, margins: { top: 10, right: 10, bottom: 10, left: 10 } };
const block = (id: string): FlowBlock => ({
  kind: 'paragraph',
  id,
  attrs: { widowControl: false },
  runs: [{ kind: 'text', text: id }],
});
const measure = (): ParagraphMeasure => ({
  kind: 'paragraph',
  totalHeight: 10,
  lines: [{ fromRun: 0, toRun: 0, fromChar: 0, toChar: 1, width: 20, ascent: 8, descent: 2, lineHeight: 10 }],
});

function preparedFixture(dirtyIndex = 0, replacement?: FlowBlock, replacementMeasure?: Measure) {
  const previous = Array.from({ length: 1000 }, (_, index) => block(`p${index}`));
  const previousMeasures: Measure[] = previous.map(measure);
  layoutDocument(previous, previousMeasures, geometry);
  const dirtyId = `p${dirtyIndex}`;
  const data = previous.slice();
  data[dirtyIndex] = replacement ?? block(dirtyId);
  const reads = new Map<number, number>();
  const current = new Proxy(data, {
    get(target, key, receiver) {
      if (typeof key === 'string' && /^\d+$/.test(key)) {
        const index = Number(key);
        reads.set(index, (reads.get(index) ?? 0) + 1);
      }
      return Reflect.get(target, key, receiver);
    },
  });
  const measures: Measure[] = previousMeasures.slice();
  measures[dirtyIndex] = replacementMeasure ?? measure();
  let revoked = false;
  // Canonical issuer admission, copied vectors, revocation and immutable
  // coordinate-clone validation are independently covered by the host suite.
  const reader = createCanonicalPaginationSourceReader(
    (old, value) =>
      !revoked && old === previous && value === current
        ? {
            previous,
            current,
            authoredChangedBlockIds: [dirtyId],
            replacements: [{ start: dirtyIndex, deleteCount: 1, insertCount: 1 }],
          }
        : null,
    (value) => !revoked && value === current,
  );
  expect(
    prepareCanonicalPaginationSource({
      reader,
      previousBlocks: previous,
      blocks: current,
      previousMeasures,
      measures,
      dirtyBlockIds: [dirtyId],
      currentIndexById: new Map(data.map((value, index) => [value.id, index])),
    }),
  ).toBe(true);
  reads.clear();
  return {
    current,
    measures,
    data,
    reads,
    revoke: () => {
      revoked = true;
    },
  };
}

describe('owned pagination preflight with a bounded page stop', () => {
  it.each([false, true])('does not open the unpaginated clean source tail (prepared suffix: %s)', (suffix) => {
    const f = preparedFixture();
    const input = suffix
      ? createPreparedPaginationSuffix(f.current, f.measures, 0, f.current.length)!
      : { blocks: f.current, measures: f.measures };
    const options = { ...geometry, pageBoundary: { shouldStopBeforeNewPage: () => true } };
    const actual = layoutDocument(input.blocks, input.measures, options);
    expect(actual.pages).toHaveLength(1);
    expect([...f.reads.keys()].filter((index) => index >= 20)).toEqual([]);
    expect(actual).toEqual(layoutDocument([...f.data], [...f.measures], options));
  });

  it('validates a dirty measure beyond the bounded page stop', () => {
    const f = preparedFixture(900);
    f.measures[900] = { kind: 'pageBreak' };
    const options = { ...geometry, pageBoundary: { shouldStopBeforeNewPage: () => true } };
    expect(() => layoutDocument(f.current, f.measures, options)).toThrow('expected paragraph measure for block p900');
    expect(f.reads.has(900)).toBe(true);
  });

  it('validates the actual dirty table row plane beyond the bounded page stop', () => {
    const f = preparedFixture(
      900,
      {
        kind: 'table',
        id: 'p900',
        rows: [
          { id: 'r0', cells: [] },
          { id: 'r1', cells: [] },
        ],
      },
      { kind: 'table', rows: [{ height: 10, cells: [] }], columnWidths: [100], totalWidth: 100, totalHeight: 10 },
    );
    const options = { ...geometry, pageBoundary: { shouldStopBeforeNewPage: () => true } };
    expect(() => layoutDocument(f.current, f.measures, options)).toThrow('incomplete table row measure plane');
    expect(f.reads.has(900)).toBe(true);
  });

  it.each([
    { columns: { count: 2, gap: 10 } },
    { sectionMetadata: [{ sectionIndex: 0, vAlign: 'center' as const }] },
  ] satisfies LayoutOptions[])('preserves complete preflight for non-boundary dependency options %j', (dependency) => {
    const f = preparedFixture();
    const options = { ...geometry, ...dependency, pageBoundary: { shouldStopBeforeNewPage: () => true } };
    const actual = layoutDocument(f.current, f.measures, options);
    expect(f.reads.has(999)).toBe(true);
    expect(actual).toEqual(layoutDocument([...f.data], [...f.measures], options));
  });

  it.each([
    ['columns', { count: 2, gap: 10 }],
    ['sectionMetadata', [{ sectionIndex: 0, vAlign: 'center' }]],
  ] as const)('preserves non-enumerable %s dependency reads', (name, value) => {
    const f = preparedFixture();
    const options: LayoutOptions = { ...geometry, pageBoundary: { shouldStopBeforeNewPage: () => true } };
    Object.defineProperty(options, name, { value, enumerable: false });
    const actual = layoutDocument(f.current, f.measures, options);
    expect(f.reads.has(999)).toBe(true);
    expect(actual).toEqual(layoutDocument([...f.data], [...f.measures], options));
  });

  it('preserves complete section preflight for a changed multicolumn boundary', () => {
    const f = preparedFixture(
      900,
      {
        kind: 'sectionBreak',
        id: 'p900',
        type: 'continuous',
        columns: { count: 2, gap: 10 },
        attrs: { sectionIndex: 1 },
      },
      { kind: 'sectionBreak' },
    );
    const options = { ...geometry, pageBoundary: { shouldStopBeforeNewPage: () => true } };
    const actual = layoutDocument(f.current, f.measures, options);
    expect(f.reads.has(999)).toBe(true);
    expect(actual).toEqual(layoutDocument([...f.data], [...f.measures], options));
  });

  it('uses the current certified section border without reading the unrelated source tail', () => {
    const borders = { offsetFrom: 'page' as const, top: { width: 2, space: 3, color: '#ff0000' } };
    const f = preparedFixture(
      0,
      { kind: 'sectionBreak', id: 'p0', attrs: { sectionIndex: 0 }, pageBorders: borders },
      { kind: 'sectionBreak' },
    );
    const options = { ...geometry, pageBoundary: { shouldStopBeforeNewPage: () => true } };
    const actual = layoutDocument(f.current, f.measures, options);
    expect(actual.pages[0]!.pageBorders).toEqual(borders);
    expect([...f.reads.keys()].filter((index) => index >= 20)).toEqual([]);
    expect(actual).toEqual(layoutDocument([...f.data], [...f.measures], options));
  });

  it.each(['unissued-vector', 'copied-measures', 'revoked'] as const)(
    'uses canonical full validation for %s rather than skipping an unproved tail',
    (poison) => {
      const f = preparedFixture();
      const blocks = poison === 'unissued-vector' ? new Proxy(f.current, {}) : f.current;
      const measures = poison === 'copied-measures' ? f.measures.slice() : f.measures;
      if (poison === 'revoked') f.revoke();
      const options = { ...geometry, pageBoundary: { shouldStopBeforeNewPage: () => true } };
      const actual = layoutDocument(blocks, measures, options);
      expect(f.reads.has(999)).toBe(true);
      expect(actual).toEqual(layoutDocument([...f.data], [...measures], options));
    },
  );

  it('keeps bounded page publication blocked until canonical finalization completes', async () => {
    const f = preparedFixture();
    const options = { ...geometry, pageBoundary: { shouldStopBeforeNewPage: () => true } };
    const continuation = createLayoutDocumentContinuation(f.current, f.measures, options);
    try {
      const batch = await continuation.advance({ pageCount: 1 });
      expect(batch.status).toBe('complete');
      expect(batch.completeReason).toBe('post-pagination-dependency:page-boundary');
      expect(batch.layout).toEqual(layoutDocument([...f.data], [...f.measures], options));
      expect([...f.reads.keys()].filter((index) => index >= 20)).toEqual([]);
    } finally {
      continuation.dispose();
    }
  });
});
