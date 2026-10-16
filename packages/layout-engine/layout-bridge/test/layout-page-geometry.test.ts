import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { FlowBlock, Layout, Page, ParagraphBlock, ParagraphMeasure } from '@superdoc/contracts';
import {
  clearIncrementalModuleState,
  incrementalLayout,
  readLayoutPageGeometry,
  readLayoutPageFragmentBlockIds,
} from '../src/index.js';
import { computeDirtyRegions } from '../src/diff.js';
import { __test_only_pageSequenceMaterializationCount } from '../src/incrementalLayout.js';

const options = { pageSize: { w: 200, h: 100 }, margins: { top: 10, right: 10, bottom: 10, left: 10 } };

function paragraph(id: string, text: string, pmStart: number): ParagraphBlock {
  return { kind: 'paragraph', id, runs: [{ kind: 'text', text, pmStart, pmEnd: pmStart + text.length }] };
}
function measure(block: FlowBlock, count = 1, height = 30): ParagraphMeasure {
  if (block.kind !== 'paragraph') throw new Error(`Unexpected measure kind ${block.kind}`);
  const length = block.runs.reduce((sum, run) => sum + ('text' in run ? run.text.length : 0), 0);
  return {
    kind: 'paragraph',
    totalHeight: count * height,
    lines: Array.from({ length: count }, (_, line) => ({
      fromRun: 0,
      fromChar: Math.floor((length * line) / count),
      toRun: 0,
      toChar: Math.floor((length * (line + 1)) / count),
      width: 100,
      ascent: height * 0.8,
      descent: height * 0.2,
      lineHeight: height,
    })),
  };
}
function retainedProof(before: FlowBlock[], after: FlowBlock[], layout: Layout) {
  const keys = layout.pages.map((page) => {
    const first = page.fragments[0];
    return first
      ? `${first.blockId}#${'fromLine' in first ? first.fromLine : 'fromRow' in first ? first.fromRow : 0}#${page.sectionIndex ?? 0}#${'continuesFromPrev' in first && first.continuesFromPrev ? 1 : 0}`
      : `#empty#0#${page.sectionIndex ?? 0}#0`;
  });
  const blocks = new Map<string, { firstPage: number; lastPage: number }>();
  layout.pages.forEach((page, index) =>
    page.fragments.forEach((fragment) => {
      const old = blocks.get(fragment.blockId);
      if (old) old.lastPage = index;
      else blocks.set(fragment.blockId, { firstPage: index, lastPage: index });
    }),
  );
  const keyIndex = new Map<string, number[]>();
  keys.forEach((key, index) => keyIndex.set(key, [...(keyIndex.get(key) ?? []), index]));
  layout.layoutEpoch = 1;
  const dirty = computeDirtyRegions(before, after);
  return {
    previousLayout: layout,
    retainedMetadataSourceLayoutEpoch: 1,
    previousPageStartKeys: keys,
    previousBlockPageIndex: blocks,
    previousPageStartKeyIndex: keyIndex,
    currentBlockIndexById: new Map(after.map((block, index) => [block.id, index])),
    dirtyBlockIds: dirty.changedBlockIds,
    provedDirtyRegion: dirty,
    requireDocumentStartCheckpoint: true,
    dependencyProof: {
      profile: 'single-section-local-text' as const,
      blockIdsUnchanged: true as const,
      blockIdsUnique: true as const,
      globalDependenciesAbsent: true as const,
      renderInputsUnchanged: true as const,
      pageReferencesAbsent: true as const,
    },
  };
}
function pageBoxes(layout: Layout) {
  return Array.from({ length: layout.pages.length }, (_, index) => readLayoutPageGeometry(layout.pages, index));
}
function pageIds(layout: Layout) {
  return Array.from({ length: layout.pages.length }, (_, index) => [
    ...readLayoutPageFragmentBlockIds(layout.pages, index),
  ]);
}
function observeSourceFragmentReads(layout: Layout) {
  const reads = vi.fn();
  for (const page of layout.pages) {
    const fragments = page.fragments;
    Object.defineProperty(page, 'fragments', {
      configurable: true,
      enumerable: true,
      get() {
        reads();
        return fragments;
      },
    });
  }
  return reads;
}

describe('canonical lightweight pagination geometry', () => {
  beforeEach(() => clearIncrementalModuleState());

  it('keeps copied and mutable hidden page identities live without minting a snapshot', () => {
    const pages: Page[] = Array.from({ length: 30 }, (_, index) => ({
      number: index + 1,
      fragments: [
        {
          kind: 'para',
          blockId: `p${index}`,
          fromLine: 0,
          toLine: 1,
          x: 0,
          y: 0,
          width: 100,
        },
      ],
    }));
    expect([...readLayoutPageFragmentBlockIds(pages, 29)]).toEqual(['p29']);
    pages[29]!.fragments[0]!.blockId = 'missing-hidden-owner';
    expect([...readLayoutPageFragmentBlockIds(pages, 29)]).toEqual(['missing-hidden-owner']);
    const copied = pages.map((page) => ({ ...page, fragments: page.fragments.map((fragment) => ({ ...fragment })) }));
    copied[29]!.fragments[0]!.blockId = 'copied-missing-hidden-owner';
    expect([...readLayoutPageFragmentBlockIds(copied, 29)]).toEqual(['copied-missing-hidden-owner']);
    expect([...readLayoutPageFragmentBlockIds(pages, 29)]).toEqual(['missing-hidden-owner']);
    const read = vi.fn(() => 'accessor-missing-owner');
    Object.defineProperty(copied[29]!.fragments[0]!, 'blockId', { enumerable: true, configurable: true, get: read });
    expect([...readLayoutPageFragmentBlockIds(copied, 29)]).toEqual(['accessor-missing-owner']);
    expect(read).toHaveBeenCalledOnce();
    for (const index of [-1, 30, 0.5, NaN, Infinity])
      expect(() => [...readLayoutPageFragmentBlockIds(pages, index)]).toThrow(RangeError);
  });

  it('reads mixed fresh boxes without fragments and detaches mutable readbacks', () => {
    const pages: Page[] = [
      {
        number: 1,
        fragments: [],
        size: { w: 200, h: 100 },
        margins: { top: 10, right: 11, bottom: 12, left: 13, header: 2, footer: 3, gutter: 4 },
        sectionIndex: 0,
      },
      {
        number: 2,
        fragments: [],
        size: { w: 300, h: 180 },
        margins: { top: 20, right: 21, bottom: 22, left: 23 },
        sectionIndex: 1,
      },
      { number: 3, fragments: [] },
    ];
    for (const page of pages)
      Object.defineProperty(page, 'fragments', {
        get() {
          throw new Error('Page geometry must not read fragments');
        },
      });
    expect(readLayoutPageGeometry(pages, 1)).toEqual({
      size: { w: 300, h: 180 },
      margins: { top: 20, right: 21, bottom: 22, left: 23 },
      sectionIndex: 1,
    });
    expect(readLayoutPageGeometry(pages, 2)).toEqual({ size: undefined, margins: undefined, sectionIndex: undefined });
    const copy = readLayoutPageGeometry(pages, 0);
    copy.size!.w = 999;
    copy.margins!.top = 999;
    expect(pages[0]!.size!.w).toBe(200);
    expect(pages[0]!.margins!.top).toBe(10);
    expect(readLayoutPageGeometry(pages, 0).margins).toMatchObject({ header: 2, footer: 3, gutter: 4 });
    for (const index of [-1, 3, 0.5, NaN, Infinity])
      expect(() => readLayoutPageGeometry(pages, index)).toThrow(RangeError);
  });

  it.each(['decimal', 'upperRoman'] as const)(
    'matches cold mixed-section geometry after %s text edits and page-count shifts without cloning the tail',
    async (format) => {
      const head = Array.from({ length: 8 }, (_, index) => paragraph(`p${index}`, `text-${index}`, 1 + index * 20));
      const tail = Array.from({ length: 8 }, (_, index) => paragraph(`q${index}`, `tail-${index}`, 500 + index * 20));
      const section: FlowBlock = {
        kind: 'sectionBreak',
        id: 's1',
        type: 'nextPage',
        pageSize: { w: 300, h: 180 },
        margins: { top: 20, right: 21, bottom: 22, left: 23, header: 5, footer: 6 },
        attrs: { sectionIndex: 1 },
      };
      const before: FlowBlock[] = [...head, section, ...tail];
      const sectionOptions = {
        ...options,
        sectionMetadata: [
          { sectionIndex: 0, numbering: { format } },
          { sectionIndex: 1, numbering: { format } },
        ],
      };
      for (const lines of [1, 3]) {
        clearIncrementalModuleState();
        const previous = await incrementalLayout([], null, before, sectionOptions, async (block) => measure(block));
        const edited = `${head[0]!.runs[0]!.text}x`;
        const after: FlowBlock[] = [
          paragraph('p0', edited, 1),
          ...head.slice(1).map((block) => paragraph(block.id, block.runs[0]!.text, block.runs[0]!.pmStart! + 1)),
          section,
          ...tail.map((block) => paragraph(block.id, block.runs[0]!.text, block.runs[0]!.pmStart! + 1)),
        ];
        const reuse = retainedProof(before, after, previous.layout);
        const nextMeasure = async (block: FlowBlock) => measure(block, block.id === 'p0' ? lines : 1);
        const warm = await incrementalLayout(
          before,
          previous.layout,
          after,
          sectionOptions,
          nextMeasure,
          undefined,
          previous.measures,
          undefined,
          undefined,
          {
            ...reuse,
            provedDirtyRegion: {
              firstDirtyIndex: 0,
              lastStableIndex: -1,
              insertedBlockIds: [],
              deletedBlockIds: [],
              changedBlockIds: ['p0'],
              stableBlockIds: new Set(after.slice(1).map((block) => block.id)),
            },
            dirtyBlockIds: ['p0'],
            pmShift: { atChar: head[0]!.runs[0]!.pmEnd!, delta: 1 },
            dependencyProof: {
              profile: 'document-start-local-text',
              blockIdsUnchanged: true,
              blockIdsUnique: true,
              globalDependenciesAbsent: false,
              globalDependenciesFencedByDocumentStart: true,
              multiColumnSectionsProvedNonBalanceable: true,
              renderInputsUnchanged: true,
              pageReferencesAbsent: true,
            },
            provedDirtyMeasureConstraints: new Map([['p0', { maxWidth: 180, maxHeight: 80 }]]),
          },
        );
        expect(warm.layoutReuse.mode, JSON.stringify(warm.layoutReuse)).toBe('tail-splice');
        expect(warm.layoutReuse.tailAdoption?.pageIndexDelta).toBe(lines === 3 ? 1 : 0);
        const cold = await incrementalLayout([], null, after, sectionOptions, nextMeasure);
        const beforeIdentities = __test_only_pageSequenceMaterializationCount(warm.layout.pages);
        expect(pageIds(warm.layout)).toEqual(
          cold.layout.pages.map((page) => page.fragments.map((fragment) => fragment.blockId)),
        );
        expect(__test_only_pageSequenceMaterializationCount(warm.layout.pages)).toBe(beforeIdentities);
        const sourceTail = previous.layout.pages.at(-1)!.fragments[0]!;
        const sourceId = sourceTail.blockId;
        sourceTail.blockId = 'missing-unmaterialized-tail-owner';
        expect([...readLayoutPageFragmentBlockIds(warm.layout.pages, warm.layout.pages.length - 1)]).toContain(
          'missing-unmaterialized-tail-owner',
        );
        expect(__test_only_pageSequenceMaterializationCount(warm.layout.pages)).toBe(beforeIdentities);
        sourceTail.blockId = sourceId;
        const fragmentReads = observeSourceFragmentReads(previous.layout);
        const materializedBefore = __test_only_pageSequenceMaterializationCount(warm.layout.pages);
        const geometry = pageBoxes(warm.layout);
        expect(fragmentReads).not.toHaveBeenCalled();
        expect(__test_only_pageSequenceMaterializationCount(warm.layout.pages)).toBe(materializedBefore);
        expect(geometry).toEqual(pageBoxes(cold.layout));
        expect(new Set(geometry.map((page) => page.size?.w ?? warm.layout.pageSize.w))).toEqual(new Set([200, 300]));
        const sectionCounts = (boxes: typeof geometry) =>
          boxes.reduce(
            (counts, box) => counts.set(box.sectionIndex, (counts.get(box.sectionIndex) ?? 0) + 1),
            new Map<number | undefined, number>(),
          );
        expect(sectionCounts(geometry)).toEqual(sectionCounts(pageBoxes(cold.layout)));
        const adoption = warm.layoutReuse.tailAdoption!;
        const currentPage = warm.layout.pages[adoption.startPageIndex]!;
        expect(__test_only_pageSequenceMaterializationCount(warm.layout.pages)).toBeGreaterThan(materializedBefore);
        expect(currentPage).not.toBe(previous.layout.pages[adoption.sourcePageStartIndex]!);
        const currentId = currentPage.fragments[0]!.blockId;
        currentPage.fragments[0]!.blockId = 'missing-cached-tail-owner';
        expect([...readLayoutPageFragmentBlockIds(warm.layout.pages, adoption.startPageIndex)]).toContain(
          'missing-cached-tail-owner',
        );
        currentPage.fragments[0]!.blockId = currentId;
        expect(currentPage.fragments[0]!.pmStart).toBe(
          cold.layout.pages[adoption.startPageIndex]!.fragments[0]!.pmStart,
        );
        const detached = readLayoutPageGeometry(warm.layout.pages, warm.layout.pages.length - 1);
        detached.size!.w = 999;
        detached.margins!.top = 999;
        expect(readLayoutPageGeometry(warm.layout.pages, warm.layout.pages.length - 1)).toEqual(
          pageBoxes(cold.layout).at(-1),
        );
      }
    },
  );

  it.each([false, true])(
    'matches cold geometry and identities across structural removal (ordinal rekey: %s)',
    async (ordinalIds) => {
      const before = Array.from({ length: 24 }, (_, index) =>
        paragraph(ordinalIds ? `n/main:body/P${index}/o${index}` : `p${index}`, `text-${index}`, 1 + index * 20),
      );
      const measureBlock = async (block: FlowBlock) => measure(block, 1, 60);
      const previous = await incrementalLayout([], null, before, options, measureBlock);
      const head = 8;
      const removedCount = 2;
      const after = [
        ...before.slice(0, head),
        paragraph(before[head]!.id, 'merged', before[head]!.runs[0]!.pmStart!),
        ...before
          .slice(head + removedCount + 1)
          .map((block, index) =>
            paragraph(
              ordinalIds ? `n/main:body/P${head + removedCount + 1 + index}/o${head + 1 + index}` : block.id,
              block.runs[0]!.text,
              block.runs[0]!.pmStart! - removedCount * 20,
            ),
          ),
      ];
      const forward = new Map(
        ordinalIds
          ? before
              .slice(head + removedCount + 1)
              .map((block, index) => [block.id, after[head + 1 + index]!.id] as const)
          : [],
      );
      const reuse = retainedProof(before, after, previous.layout);
      const warm = await incrementalLayout(
        before,
        previous.layout,
        after,
        options,
        measureBlock,
        undefined,
        previous.measures,
        undefined,
        undefined,
        {
          ...reuse,
          allowBlockIdChurn: true,
          previousBlockIndexById: new Map(before.map((block, index) => [block.id, index])),
          blockIdRewrites: {
            previousToCurrent: forward,
            currentToPrevious: new Map([...forward].map(([before, after]) => [after, before])),
          },
          dirtyBlockIds: [before[head]!.id],
          provedDirtyRegion: {
            firstDirtyIndex: head,
            lastStableIndex: head - 1,
            insertedBlockIds: [],
            deletedBlockIds: [before[head + 1]!.id, before[head + 2]!.id],
            changedBlockIds: [before[head]!.id],
            stableBlockIds: new Set(after.filter((block) => block.id !== before[head]!.id).map((block) => block.id)),
          },
          pmShift: { atChar: before[head + removedCount + 1]!.runs[0]!.pmStart!, delta: -removedCount * 20 },
        },
      );
      expect(warm.layoutReuse.mode, JSON.stringify(warm.layoutReuse)).toBe('tail-splice');
      expect(warm.layout.pages.length).toBe(previous.layout.pages.length - 2);
      const cold = await incrementalLayout([], null, after, options, measureBlock);
      const beforeIdentities = __test_only_pageSequenceMaterializationCount(warm.layout.pages);
      expect(pageIds(warm.layout)).toEqual(
        cold.layout.pages.map((page) => page.fragments.map((fragment) => fragment.blockId)),
      );
      expect(__test_only_pageSequenceMaterializationCount(warm.layout.pages)).toBe(beforeIdentities);
      const sourcePage = previous.layout.pages.at(-1)!;
      const sourceId = sourcePage.fragments[0]!.blockId;
      const targetPageIndex = warm.layout.pages.length - 1;
      sourcePage.fragments[0]!.blockId = `footnote-separator-page-${previous.layout.pages.length}-col-0`;
      const separator = `footnote-separator-page-${warm.layout.pages.length}-col-0`;
      expect([...readLayoutPageFragmentBlockIds(warm.layout.pages, targetPageIndex)]).toContain(separator);
      expect(__test_only_pageSequenceMaterializationCount(warm.layout.pages)).toBe(beforeIdentities);
      expect(warm.layout.pages[targetPageIndex]!.fragments[0]!.blockId).toBe(separator);
      sourcePage.fragments[0]!.blockId = sourceId;
      warm.layout.pages[targetPageIndex]!.fragments[0]!.blockId =
        cold.layout.pages[targetPageIndex]!.fragments[0]!.blockId;
      const fragmentReads = observeSourceFragmentReads(previous.layout);
      const materializedBefore = __test_only_pageSequenceMaterializationCount(warm.layout.pages);
      expect(pageBoxes(warm.layout)).toEqual(pageBoxes(cold.layout));
      expect(fragmentReads).not.toHaveBeenCalled();
      expect(__test_only_pageSequenceMaterializationCount(warm.layout.pages)).toBe(materializedBefore);
      const index = warm.layoutReuse.tailAdoption!.startPageIndex;
      expect(warm.layout.pages[index]!.number).toBe(index + 1);
      expect(warm.layout.pages[index]!.fragments[0]!.pmStart).toBe(cold.layout.pages[index]!.fragments[0]!.pmStart);
    },
  );
});
