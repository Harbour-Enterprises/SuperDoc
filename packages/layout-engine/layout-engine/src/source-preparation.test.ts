import { describe, expect, it } from 'vitest';
import type { FlowBlock, Measure, ParagraphMeasure, TableBlock, TableMeasure } from '@superdoc/contracts';
import { layoutDocument } from './index.js';
import {
  createCanonicalPaginationSourceReader,
  createPreparedPaginationMetadataView,
  prepareCanonicalPaginationSource,
  readPaginationSourceScan,
  type CanonicalPaginationSourceSplice,
} from './source-preparation.js';

const options = { pageSize: { w: 200, h: 120 }, margins: { top: 10, right: 10, bottom: 10, left: 10 } };
const paragraph = (id: string, candidate = false): FlowBlock => ({
  kind: 'paragraph',
  id,
  runs: [{ kind: 'text', text: id }, ...(candidate ? [{ kind: 'lineBreak' as const }] : [])],
});
const paragraphMeasure = (): ParagraphMeasure => ({
  kind: 'paragraph',
  totalHeight: 10,
  lines: [{ fromRun: 0, toRun: 0, fromChar: 0, toChar: 1, width: 20, ascent: 8, descent: 2, lineHeight: 10 }],
});
const table = (id: string, anchorId = 'p0', rowCount = 2): TableBlock => ({
  kind: 'table',
  id,
  attrs: { anchorParagraphId: anchorId },
  columnWidths: [150],
  rows: Array.from({ length: rowCount }, (_, index) => ({ id: `r${index}`, cells: [{ id: `c${index}`, blocks: [] }] })),
});
const measure = (block: FlowBlock): Measure =>
  block.kind !== 'table'
    ? paragraphMeasure()
    : ({
        kind: 'table',
        columnWidths: [150],
        totalWidth: 150,
        totalHeight: block.rows.length * 9,
        rows: block.rows.map(() => ({ height: 9, cells: [{ width: 150, height: 9, gridColumnStart: 0, blocks: [] }] })),
      } satisfies TableMeasure);

function sourceFixture(data: FlowBlock[]) {
  const reads = new Map<number, number>();
  const source = new Proxy(data, {
    get(target, key, receiver) {
      if (typeof key === 'string' && /^\d+$/.test(key)) {
        const index = Number(key);
        reads.set(index, (reads.get(index) ?? 0) + 1);
      }
      return Reflect.get(target, key, receiver);
    },
  });
  const measures = data.map(measure);
  const cold = layoutDocument(source, measures, options);
  reads.clear();
  // The internal reader seam models an exact issuer. Production ownership,
  // immutable clone and root-revocation checks have their host-owner suite.
  const recipes = new WeakMap<object, CanonicalPaginationSourceSplice>();
  const revoked = new WeakSet<object>();
  const reader = createCanonicalPaginationSourceReader(
    (previous, current) => {
      const recipe = recipes.get(current);
      return recipe?.previous === previous && !revoked.has(previous) && !revoked.has(current) ? recipe : null;
    },
    (current) => recipes.has(current) && !revoked.has(current),
  );
  const prepare = (
    previous: FlowBlock[],
    current: FlowBlock[],
    previousMeasures: Measure[],
    currentMeasures: Measure[],
    dirty: string[],
    rewrites?: ReadonlyMap<string, string>,
    replacements: CanonicalPaginationSourceSplice['replacements'] = [{ start: 0, deleteCount: 1, insertCount: 1 }],
    currentIndexById = new Map(current.map((block, index) => [block.id, index])),
  ) => {
    recipes.set(current, { previous, current, authoredChangedBlockIds: dirty, replacements });
    return prepareCanonicalPaginationSource({
      reader,
      previousBlocks: previous,
      blocks: current,
      previousMeasures,
      measures: currentMeasures,
      dirtyBlockIds: dirty,
      currentIndexById,
      previousToCurrentBlockId: rewrites,
    });
  };
  return { data, source, measures, cold, reads, recipes, revoked, reader, prepare };
}

describe('canonical pagination preparation membership', () => {
  it('never reopens clean non-table candidates during consecutive prepared passes after the canonical cold scan', () => {
    const f = sourceFixture(Array.from({ length: 1000 }, (_, index) => paragraph(`p${index}`, index > 0)));
    const currentData = [paragraph('p0'), ...f.data.slice(1)];
    let previousReads = 0;
    const current = new Proxy(currentData, {
      get(target, key, receiver) {
        if (typeof key === 'string' && /^\d+$/.test(key)) previousReads++;
        return Reflect.get(target, key, receiver);
      },
    });
    const measures = [paragraphMeasure(), ...f.measures.slice(1)];
    expect(f.prepare(f.source, current, f.measures, measures, ['p0'])).toBe(true);
    expect([...f.reads.values()].reduce((sum, reads) => sum + reads, 0)).toBe(0);
    expect(layoutDocument(current, measures, options)).toEqual(layoutDocument([...current], [...measures], options));

    previousReads = 0;
    const next = [paragraph('p0'), ...currentData.slice(1)];
    const nextMeasures = [paragraphMeasure(), ...measures.slice(1)];
    expect(f.prepare(current, next, measures, nextMeasures, ['p0'])).toBe(true);
    expect(previousReads).toBe(0);
    expect(layoutDocument(next, nextMeasures, options)).toEqual(f.cold);
  });

  it('treats an empty cold membership cache as complete and retains it across prepared generations', () => {
    const f = sourceFixture([paragraph('p0'), paragraph('p1')]);
    const current = [paragraph('p0'), f.data[1]!];
    const measures = current.map(measure);
    expect(f.prepare(f.source, current, f.measures, measures, ['p0'])).toBe(true);
    expect(f.reads.size).toBe(0);
    expect(readPaginationSourceScan(current, measures)?.dependencyIds).toEqual([]);
    expect(createPreparedPaginationMetadataView(current, measures)).toBe(current);
    const next = [paragraph('p0'), current[1]!],
      nextMeasures = next.map(measure);
    expect(f.prepare(current, next, measures, nextMeasures, ['p0'])).toBe(true);
    expect(readPaginationSourceScan(next, nextMeasures)?.dependencyIds).toEqual([]);
    expect(layoutDocument(next, nextMeasures, options)).toEqual(f.cold);
  });

  it('reuses exact clean table snapshots, remaps table/anchor IDs, and leaves historical metadata intact', () => {
    const f = sourceFixture([paragraph('p0'), paragraph('p1'), table('late', 'p1', 3)]);
    const currentData = [paragraph('p0'), ...f.data.slice(1)];
    let cleanReads = 0;
    const current = new Proxy(currentData, {
      get(target, key, receiver) {
        if (key === '1' || key === '2') {
          cleanReads++;
          throw new Error('clean coordinate payload opened');
        }
        return Reflect.get(target, key, receiver);
      },
    });
    const index = new Map(currentData.map((block, ordinal) => [block.id, ordinal]));
    const measures = currentData.map(measure);
    expect(f.prepare(f.source, current, f.measures, measures, ['p0'], undefined, undefined, index)).toBe(true);
    expect(f.reads.size).toBe(0);
    const snapshot = createPreparedPaginationMetadataView(current, measures)[2]! as TableBlock;
    expect(snapshot.rows).toHaveLength(3);
    expect(snapshot.rows[0]).toBeUndefined();
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.rows)).toBe(true);
    const next = [paragraph('p0'), ...currentData.slice(1)],
      nextMeasures = next.map(measure);
    expect(f.prepare(current, next, measures, nextMeasures, ['p0'])).toBe(true);
    expect(createPreparedPaginationMetadataView(next, nextMeasures)[2]).toBe(snapshot);
    expect(cleanReads).toBe(0);

    const rekeyed = [paragraph('p0'), paragraph('p1-next'), table('late-next', 'p1-next', 3)];
    const rekeyedMeasures = rekeyed.map(measure);
    expect(
      f.prepare(
        next,
        rekeyed,
        nextMeasures,
        rekeyedMeasures,
        ['p0'],
        new Map([
          ['p1', 'p1-next'],
          ['late', 'late-next'],
        ]),
      ),
    ).toBe(true);
    const remapped = createPreparedPaginationMetadataView(rekeyed, rekeyedMeasures)[2]! as TableBlock;
    expect(remapped).not.toBe(snapshot);
    expect(remapped).toMatchObject({ id: 'late-next', attrs: { anchorParagraphId: 'p1-next' } });
    expect(remapped.rows).toHaveLength(3);
    expect(remapped.rows[0]).toBeUndefined();
    expect(snapshot).toMatchObject({ id: 'late', attrs: { anchorParagraphId: 'p1' } });
    expect(layoutDocument(rekeyed, rekeyedMeasures, options)).toEqual(
      layoutDocument([...rekeyed], [...rekeyedMeasures], options),
    );
  });

  it('refreshes dirty table geometry, then uses that exact snapshot when the table is clean', () => {
    const f = sourceFixture([paragraph('p0'), table('late', 'p0', 4)]);
    const current = [f.data[0]!, table('late', 'p0', 1)],
      measures = current.map(measure);
    expect(
      f.prepare(f.source, current, f.measures, measures, ['late'], undefined, [
        { start: 1, deleteCount: 1, insertCount: 1 },
      ]),
    ).toBe(true);
    // Dirty preflight reads the current payload, never the retained snapshot.
    expect(createPreparedPaginationMetadataView(current, measures)[1]).toBe(current[1]);
    const next = [paragraph('p0'), current[1]!],
      nextMeasures = next.map(measure);
    expect(f.prepare(current, next, measures, nextMeasures, ['p0'])).toBe(true);
    const snapshot = createPreparedPaginationMetadataView(next, nextMeasures)[1]! as TableBlock;
    expect(snapshot.rows).toHaveLength(1);
    expect(snapshot.rows[0]).toBeUndefined();
    expect(layoutDocument(next, nextMeasures, options)).toEqual(layoutDocument([...next], [...nextMeasures], options));
  });

  it.each(['lineBreak', 'keepNext'] as const)(
    'removes dirty %s candidate membership and adds it back on restoration',
    (kind) => {
      const candidate = paragraph('p1', kind === 'lineBreak');
      if (kind === 'keepNext' && candidate.kind === 'paragraph') candidate.attrs = { keepNext: true };
      const f = sourceFixture([paragraph('p0'), candidate]);
      const current = [f.data[0]!, paragraph('p1')],
        measures = current.map(measure);
      expect(
        f.prepare(f.source, current, f.measures, measures, ['p1'], undefined, [
          { start: 1, deleteCount: 1, insertCount: 1 },
        ]),
      ).toBe(true);
      expect(readPaginationSourceScan(current, measures)?.dependencyIds).toEqual([]);
      expect(readPaginationSourceScan(current, measures)?.candidateIds).toEqual(['p1']);
      const next = [current[0]!, candidate],
        nextMeasures = next.map(measure);
      expect(
        f.prepare(current, next, measures, nextMeasures, ['p1'], undefined, [
          { start: 1, deleteCount: 1, insertCount: 1 },
        ]),
      ).toBe(true);
      expect(readPaginationSourceScan(next, nextMeasures)?.dependencyIds).toEqual(['p1']);
      expect(layoutDocument(next, nextMeasures, options)).toEqual(f.cold);
    },
  );

  it('updates table/non-table kind changes and removes deleted dependencies without reading the old blocks', () => {
    const f = sourceFixture([paragraph('p0'), table('changed'), table('deleted')]);
    const current = [f.data[0]!, paragraph('changed')],
      measures = current.map(measure);
    expect(
      f.prepare(f.source, current, f.measures, measures, ['changed'], undefined, [
        { start: 1, deleteCount: 2, insertCount: 1 },
      ]),
    ).toBe(true);
    expect(f.reads.size).toBe(0);
    expect(readPaginationSourceScan(current, measures)?.dependencyIds).toEqual([]);
    expect(createPreparedPaginationMetadataView(current, measures)).toBe(current);
    const next = [current[0]!, table('changed', 'p0', 1)],
      nextMeasures = next.map(measure);
    expect(
      f.prepare(current, next, measures, nextMeasures, ['changed'], undefined, [
        { start: 1, deleteCount: 1, insertCount: 1 },
      ]),
    ).toBe(true);
    expect(readPaginationSourceScan(next, nextMeasures)?.dependencyIds).toEqual(['changed']);
    expect(createPreparedPaginationMetadataView(next, nextMeasures)[1]).toBe(next[1]);
    expect(layoutDocument(next, nextMeasures, options)).toEqual(layoutDocument([...next], [...nextMeasures], options));
  });

  it.each([
    'unknown-reader',
    'copied-previous',
    'copied-current',
    'copied-measures',
    'foreign-index',
    'stale-index',
    'omitted-dirty',
    'revoked-previous',
  ] as const)('declines %s without publishing cached metadata', (poison) => {
    const f = sourceFixture([paragraph('p0'), table('late')]);
    const current = [paragraph('p0'), f.data[1]!],
      measures = current.map(measure);
    const input = {
      reader: f.reader,
      previousBlocks: f.source,
      blocks: current,
      previousMeasures: f.measures,
      measures,
      dirtyBlockIds: ['p0'],
      currentIndexById: new Map(current.map((block, index) => [block.id, index])),
    };
    f.recipes.set(current, {
      previous: f.source,
      current,
      authoredChangedBlockIds: ['p0'],
      replacements: [{ start: 0, deleteCount: 1, insertCount: 1 }],
    });
    if (poison === 'unknown-reader') input.reader = {};
    if (poison === 'copied-previous') input.previousBlocks = [...f.source];
    if (poison === 'copied-current') input.blocks = [...current];
    if (poison === 'copied-measures') input.previousMeasures = [...f.measures];
    if (poison === 'foreign-index') input.currentIndexById = new Map();
    if (poison === 'stale-index')
      input.currentIndexById = new Map([
        ['p0', 1],
        ['late', 0],
      ]);
    if (poison === 'omitted-dirty') input.dirtyBlockIds = [];
    if (poison === 'revoked-previous') f.revoked.add(f.source);
    expect(prepareCanonicalPaginationSource(input)).toBe(false);
    expect(readPaginationSourceScan(input.blocks, measures)).toBeNull();
    expect(createPreparedPaginationMetadataView(input.blocks, measures)).toBe(input.blocks);
  });

  it('revokes metadata substitution through the existing owned-source currentness callback', () => {
    const f = sourceFixture([paragraph('p0'), table('late')]);
    const current = [paragraph('p0'), f.data[1]!],
      measures = current.map(measure);
    expect(f.prepare(f.source, current, f.measures, measures, ['p0'])).toBe(true);
    const view = createPreparedPaginationMetadataView(current, measures);
    expect((view[1]! as TableBlock).rows[0]).toBeUndefined();
    f.revoked.add(current);
    expect(readPaginationSourceScan(current, measures)).toBeNull();
    expect(createPreparedPaginationMetadataView(current, measures)).toBe(current);
    expect(view[1]).toBe(current[1]);
    const next = [paragraph('p0'), current[1]!];
    expect(f.prepare(current, next, measures, next.map(measure), ['p0'])).toBe(false);
  });
});
