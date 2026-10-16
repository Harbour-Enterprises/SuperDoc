import { beforeEach, describe, expect, it } from 'vite-plus/test';
import type { FlowBlock, Layout, ParagraphMeasure } from '@superdoc/contracts';
import { clearIncrementalModuleState, incrementalLayout, type IncrementalLayoutReuseOptions } from '../src/index.js';

const options = {
  pageSize: { w: 200, h: 100 },
  margins: { top: 10, right: 10, bottom: 10, left: 10, header: 0, footer: 0 },
  columns: { count: 1, gap: 0 },
};
function body(): FlowBlock[] {
  const paragraph = (index: number, sectionIndex: number): FlowBlock => ({
    kind: 'paragraph',
    id: `p${index}`,
    attrs: { sectionIndex },
    runs: [{ kind: 'text', text: `text-${index}`, pmStart: 1 + index * 20, pmEnd: 8 + index * 20 }],
  });
  return [
    {
      kind: 'sectionBreak',
      id: 'section-start',
      type: 'continuous',
      columns: { count: 2, gap: 10 },
      margins: {},
      attrs: { source: 'sectPr', sectionIndex: 0, isFirstSection: true },
    },
    ...Array.from({ length: 24 }, (_, index) => paragraph(index, 0)),
    {
      kind: 'sectionBreak',
      id: 'section-end',
      type: 'nextPage',
      columns: { count: 1, gap: 0 },
      margins: {},
      attrs: { source: 'sectPr', sectionIndex: 1 },
    },
    ...Array.from({ length: 100 }, (_, index) => paragraph(24 + index, 1)),
  ];
}
async function measure(block: FlowBlock): Promise<ParagraphMeasure> {
  if (block.kind !== 'paragraph') throw new Error('Unexpected nonparagraph measurement');
  const length = block.runs.reduce((sum, run) => sum + ('text' in run ? run.text.length : 0), 0);
  return {
    kind: 'paragraph',
    totalHeight: 30,
    lines: [{ fromRun: 0, fromChar: 0, toRun: 0, toChar: length, width: 70, ascent: 24, descent: 6, lineHeight: 30 }],
  };
}
function pageIndex(layout: Layout) {
  const index = new Map<string, { firstPage: number; lastPage: number }>();
  layout.pages.forEach((page, pageIndex) =>
    page.fragments.forEach((fragment) => {
      const previous = index.get(fragment.blockId);
      if (previous) previous.lastPage = pageIndex;
      else index.set(fragment.blockId, { firstPage: pageIndex, lastPage: pageIndex });
    }),
  );
  return index;
}
function geometry(layout: Layout) {
  return JSON.parse(JSON.stringify(layout, (key, value) => (key === 'layoutEpoch' ? undefined : value)));
}
async function run(dirtyId = 'p90', mutate?: (reuse: IncrementalLayoutReuseOptions, previous: Layout) => void) {
  const previousBlocks = body();
  const nextBlocks = previousBlocks.map((block) =>
    block.kind === 'paragraph' && block.id === dirtyId
      ? { ...block, runs: block.runs.map((run) => ('text' in run ? { ...run, text: run.text.toUpperCase() } : run)) }
      : block,
  );
  const previous = await incrementalLayout([], null, previousBlocks, options, measure);
  previous.layout.layoutEpoch = 1;
  const index = pageIndex(previous.layout);
  const keys = previous.layout.pages.map((page) => {
    const first = page.fragments[0];
    if (!first) return `#empty#0#${page.sectionIndex ?? 0}#0`;
    const from = 'fromLine' in first ? first.fromLine : 'fromRow' in first ? first.fromRow : 0;
    return `${first.blockId}#${from ?? 0}#${page.sectionIndex ?? 0}#${'continuesFromPrev' in first && first.continuesFromPrev === true ? 1 : 0}`;
  });
  const dirtyIndex = nextBlocks.findIndex((block) => block.id === dirtyId);
  const keyIndex = new Map<string, number[]>();
  keys.forEach((key, index) => keyIndex.set(key, [...(keyIndex.get(key) ?? []), index]));
  const reuse: IncrementalLayoutReuseOptions = {
    previousLayout: previous.layout,
    retainedMetadataSourceLayoutEpoch: previous.layout.layoutEpoch ?? null,
    previousPageStartKeys: keys,
    previousBlockPageIndex: index,
    previousPageStartKeyIndex: keyIndex,
    maxRelaidPages: 4,
    requireDocumentStartCheckpoint: false,
    dirtyBlockIds: [dirtyId],
    currentBlockIndexById: new Map(nextBlocks.map((block, index) => [block.id, index])),
    previousBlockIndexById: new Map(previousBlocks.map((block, index) => [block.id, index])),
    provedDirtyRegion: {
      firstDirtyIndex: dirtyIndex,
      lastStableIndex: dirtyIndex - 1,
      insertedBlockIds: [],
      deletedBlockIds: [],
      changedBlockIds: [dirtyId],
      stableBlockIds: new Set(nextBlocks.map((block) => block.id).filter((id) => id !== dirtyId)),
    },
    dependencyProof: {
      profile: 'page-checkpoint-local-text',
      blockIdsUnchanged: true,
      blockIdsUnique: true,
      globalDependenciesAbsent: false,
      globalDependenciesFencedByPageCheckpoint: true,
      admittedDependencyClasses: ['multiple-sections', 'non-balanceable-multi-column-sections'],
      multiColumnSectionsProvedNonBalanceable: false,
      balanceableSectionsBoundaryBlockId: 'p23',
      balanceableSectionsRetainedPrefix: true,
      renderInputsUnchanged: true,
      pageReferencesAbsent: true,
    },
  };
  mutate?.(reuse, previous.layout);
  const current = await incrementalLayout(
    previousBlocks,
    previous.layout,
    nextBlocks,
    options,
    measure,
    undefined,
    previous.measures,
    undefined,
    undefined,
    reuse,
  );
  return { current, previous, nextBlocks, boundary: index.get('p23')! };
}

describe('retained balanced prefix before a seeded checkpoint', () => {
  beforeEach(() => clearIncrementalModuleState());
  it('matches every cold page while paginating only the deep changed window', async () => {
    const result = await run();
    const dirtyPage = result.previous.layout.pages[pageIndex(result.previous.layout).get('p90')!.firstPage]!;
    const boundaryPage = result.previous.layout.pages[result.boundary.lastPage]!;
    expect(
      result.current.layoutReuse,
      JSON.stringify({
        reason: result.current.layoutReuse?.reason,
        dirty: { section: dirtyPage.sectionIndex, columns: dirtyPage.columns, size: dirtyPage.size },
        boundary: { section: boundaryPage.sectionIndex, columns: boundaryPage.columns },
      }),
    ).toMatchObject({ mode: 'tail-splice', tailDisposition: 'adopted-source-tail' });
    expect(result.current.layoutReuse!.checkpointPageIndex).toBeGreaterThan(result.boundary.lastPage);
    expect(result.current.layoutReuse!.pagesPaginated).toBeLessThanOrEqual(6);
    clearIncrementalModuleState();
    const cold = await incrementalLayout([], null, result.nextBlocks, options, measure);
    expect(geometry(result.current.layout)).toEqual(geometry(cold.layout));
  });
  it('rejects dirty owners inside the balanced section despite a forged prefix flag', async () => {
    expect((await run('p2')).current.layoutReuse).toMatchObject({
      mode: 'full',
      reason: 'm5-layout-reuse-disabled-balanceable-prefix-checkpoint-crosses-boundary',
    });
  });
  it('rejects a missing named boundary', async () => {
    const result = await run('p90', (reuse) => {
      (reuse.dependencyProof as any).balanceableSectionsBoundaryBlockId = 'absent';
    });
    expect(result.current.layoutReuse).toMatchObject({
      mode: 'full',
      reason: 'm5-layout-reuse-disabled-balanceable-boundary-unresolved',
    });
  });
  it('rejects an active checkpoint whose columns cannot be proved inert', async () => {
    const result = await run('p90', (_reuse, previous) => {
      const range = pageIndex(previous).get('p90')!;
      previous.pages[range.firstPage]!.columns = { count: 2, gap: 10 };
    });
    expect(result.current.layoutReuse).toMatchObject({
      mode: 'full',
      reason: 'm5-layout-reuse-disabled-balanceable-prefix-active-section-unproved',
    });
  });
  it('preserves document-start replay when the prefix fact is absent', async () => {
    const result = await run('p2', (reuse) => {
      reuse.requireDocumentStartCheckpoint = true;
      delete (reuse.dependencyProof as any).balanceableSectionsRetainedPrefix;
    });
    expect(result.current.layoutReuse).toMatchObject({ mode: 'tail-splice', checkpointPageIndex: 0 });
    expect(result.current.layoutReuse!.sourceConvergencePageIndex).toBeGreaterThan(result.boundary.lastPage);
  });
});
