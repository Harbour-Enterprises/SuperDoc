/**
 * Plan 15 — the spliced `blockResumeCheckpoints` sidecar must be EXACTLY
 * cold-equal. Two defect classes lived here (both reproduced before the fix,
 * both routed to Plan 15 by the Plans 06/09 records):
 *
 *  - the dirty block's PREDECESSOR lost its checkpoint (its stamp sits ON
 *    the partial-checkpoint page and the strict prefix test dropped it) —
 *    the large-document oracle's 19-of-3,423 missing-boundary-checkpoints family;
 *  - the SUFFIX-START block's stamp came from the local relaid run
 *    (post-break, top-of-window) where cold stamps the pre-break state on
 *    the preceding page — the stitched-plane one-line resume drift family
 *    (page-zero partial resumes refusing convergence).
 *
 * A later resume replays the exact cold break decision only if this map is
 * exact, so the pin sweeps every mid-document edit position and requires
 * full per-entry equality against a cold recompute.
 */
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { FlowBlock, Layout, Line, Measure, Page, ParagraphBlock, ParagraphMeasure } from '@superdoc/contracts';
import { clearIncrementalModuleState, incrementalLayout, type IncrementalLayoutReuseOptions } from '../src/index.js';
import { __test_only_splicedCheckpointStats } from '../src/incrementalLayout.js';
import { computeDirtyRegions } from '../src/diff.js';

const OPTIONS = {
  pageSize: { w: 240, h: 140 },
  margins: { top: 10, right: 10, bottom: 10, left: 10 },
  columns: { count: 1, gap: 0 },
};

function paragraph(id: string, text: string, pmStart: number): ParagraphBlock {
  return { kind: 'paragraph', id, runs: [{ kind: 'text', text, pmStart, pmEnd: pmStart + text.length }] };
}
function paragraphs(count: number): ParagraphBlock[] {
  return Array.from({ length: count }, (_, i) => paragraph(`p${i}`, `text-${i}`, 1 + i * 20));
}
/** Multi-line measures so blocks SPAN pages: block p<i> has (1 + i%3) lines. */
const measureBlock = vi.fn(async (block: FlowBlock): Promise<Measure> => {
  if (block.kind !== 'paragraph') throw new Error('unexpected');
  const n = 1 + (Number(block.id.slice(1)) % 3);
  const lines: Line[] = Array.from({ length: n }, (_, k) => ({
    fromRun: 0,
    fromChar: k,
    toRun: 0,
    toChar: k + 1,
    width: 100,
    ascent: 22,
    descent: 8,
    lineHeight: 30,
  }));
  return { kind: 'paragraph', lines, totalHeight: 30 * n } as ParagraphMeasure;
});

function pageStartKey(page: Page): string {
  const f = page.fragments[0];
  const s = page.sectionIndex ?? 0;
  if (!f) return `#empty#0#${s}#0`;
  const from = 'fromLine' in f ? f.fromLine : 'fromRow' in f ? f.fromRow : 0;
  const carry = 'continuesFromPrev' in f && f.continuesFromPrev === true ? 1 : 0;
  return `${f.blockId}#${from ?? 0}#${s}#${carry}`;
}
function blockPageIndex(layout: Layout): Map<string, { firstPage: number; lastPage: number }> {
  const index = new Map<string, { firstPage: number; lastPage: number }>();
  layout.pages.forEach((page, pi) => {
    for (const f of page.fragments) {
      const prev = index.get(f.blockId);
      if (prev) prev.lastPage = pi;
      else index.set(f.blockId, { firstPage: pi, lastPage: pi });
    }
  });
  return index;
}
function buildReuse(
  prevB: FlowBlock[],
  nextB: FlowBlock[],
  prevL: Layout,
  editPmEnd: number,
): IncrementalLayoutReuseOptions {
  const keys = prevL.pages.map(pageStartKey);
  const keyIndex = new Map<string, number[]>();
  keys.forEach((k, i) => keyIndex.set(k, [...(keyIndex.get(k) ?? []), i]));
  const dirty = computeDirtyRegions(prevB, nextB);
  return {
    previousLayout: prevL,
    retainedMetadataSourceLayoutEpoch: prevL.layoutEpoch ?? null,
    previousPageStartKeys: keys,
    previousPageStartKeyIndex: keyIndex,
    previousBlockPageIndex: blockPageIndex(prevL),
    currentBlockIndexById: new Map(nextB.map((b, i) => [b.id, i])),
    maxRelaidPages: 3,
    requireDocumentStartCheckpoint: false,
    dirtyBlockIds: dirty.changedBlockIds,
    pmShift: { atChar: editPmEnd, delta: 1 },
    provedDirtyRegion: dirty,
    dependencyProof: {
      profile: 'page-checkpoint-local-text',
      blockIdsUnchanged: true,
      blockIdsUnique: true,
      globalDependenciesAbsent: false,
      globalDependenciesFencedByPageCheckpoint: true,
      admittedDependencyClasses: ['body-anchored-objects'],
      renderInputsUnchanged: true,
      pageReferencesAbsent: true,
      multiColumnSectionsProvedNonBalanceable: true,
    },
  } as IncrementalLayoutReuseOptions;
}
function applyEdit(blocks: ParagraphBlock[], idx: number): ParagraphBlock[] {
  const start = blocks[idx]!.runs[0]!.pmStart!;
  return blocks.map((b, i) =>
    i === idx
      ? paragraph(b.id, `${b.runs[0]!.text}!`, b.runs[0]!.pmStart!)
      : b.runs[0]!.pmStart! > start
        ? paragraph(b.id, b.runs[0]!.text, b.runs[0]!.pmStart! + 1)
        : b,
  );
}

describe('incrementalLayout spliced checkpoint sidecar equality (plan 15)', () => {
  beforeEach(() => clearIncrementalModuleState());
  it('keeps the spliced blockResumeCheckpoints exactly cold-equal across edit positions', async () => {
    for (const editIdx of Array.from({ length: 46 }, (_, i) => i + 6)) {
      clearIncrementalModuleState();
      const prevBlocks = paragraphs(60);
      const prev = await incrementalLayout([], null, prevBlocks, OPTIONS, measureBlock);
      prev.layout.layoutEpoch = 1;
      const nextBlocks = applyEdit(prevBlocks, editIdx);
      const inc = await incrementalLayout(
        prevBlocks,
        prev.layout,
        nextBlocks,
        OPTIONS,
        measureBlock,
        undefined,
        prev.measures,
        undefined,
        undefined,
        buildReuse(prevBlocks, nextBlocks, prev.layout, prevBlocks[editIdx]!.runs[0]!.pmEnd!),
      );
      clearIncrementalModuleState();
      const cold = await incrementalLayout([], null, nextBlocks, OPTIONS, measureBlock);
      const spliced = new Map(inc.layout.blockResumeCheckpoints ?? []);
      const coldMap = new Map(cold.layout.blockResumeCheckpoints ?? []);
      const missing: string[] = [];
      const wrong: string[] = [];
      for (const [id, cp] of coldMap) {
        const got = spliced.get(id);
        if (!got) {
          missing.push(`${id}@p${cp.pageIndex}`);
          continue;
        }
        if (
          JSON.stringify({ ...got, footnoteAnchorsThisPage: [...got.footnoteAnchorsThisPage] }) !==
          JSON.stringify({ ...cp, footnoteAnchorsThisPage: [...cp.footnoteAnchorsThisPage] })
        ) {
          wrong.push(`${id}: got p${got.pageIndex} y${got.cursorY} want p${cp.pageIndex} y${cp.cursorY}`);
        }
      }
      expect(inc.layoutReuse.mode, `editIdx=${editIdx}`).toBe('tail-splice');
      expect(missing, `editIdx=${editIdx} missing`).toEqual([]);
      expect(wrong, `editIdx=${editIdx} wrong`).toEqual([]);
      expect(spliced.size, `editIdx=${editIdx} size`).toBe(coldMap.size);
      expect(inc.layout.pageStartColumns, `editIdx=${editIdx} page columns`).toEqual(cold.layout.pageStartColumns);
    }
  });

  it('keeps checkpoint ancestry shallow across 1,001 sequential retained splices', async () => {
    let currentBlocks = paragraphs(60);
    let current = await incrementalLayout([], null, currentBlocks, OPTIONS, measureBlock);
    current.layout.layoutEpoch = 1;

    for (let sequence = 0; sequence < 1_001; sequence += 1) {
      const nextBlocks = applyEdit(currentBlocks, 20);
      const next = await incrementalLayout(
        currentBlocks,
        current.layout,
        nextBlocks,
        OPTIONS,
        measureBlock,
        undefined,
        current.measures,
        undefined,
        undefined,
        buildReuse(currentBlocks, nextBlocks, current.layout, currentBlocks[20]!.runs[0]!.pmEnd!),
      );
      expect(next.layoutReuse.mode, `sequence=${sequence}`).toBe('tail-splice');
      next.layout.layoutEpoch = sequence + 2;
      currentBlocks = nextBlocks;
      current = next;
    }

    const stats = __test_only_splicedCheckpointStats(current.layout.blockResumeCheckpoints);
    expect(stats).not.toBeNull();
    expect(stats!.pieceCount).toBeLessThanOrEqual(4);
    expect(stats!.sourceCount).toBeLessThanOrEqual(4);
    expect(stats!.maximumTransformTreeDepth).toBeLessThanOrEqual(32);

    clearIncrementalModuleState();
    const cold = await incrementalLayout([], null, currentBlocks, OPTIONS, measureBlock);
    expect(new Map(current.layout.blockResumeCheckpoints ?? [])).toEqual(
      new Map(cold.layout.blockResumeCheckpoints ?? []),
    );
    expect(current.layout.pageStartColumns).toEqual(cold.layout.pageStartColumns);
  });

  const verifyStructuralCheckpointComposition = async (
    count: number,
    qualification: 'paired' | 'ordinary' | 'mismatched-token' | 'wrong-direction' | 'one-sided' = 'paired',
  ): Promise<void> => {
    const baseline = Array.from({ length: count }, (_, index) =>
      paragraph(`n/main:body/P${index}/o${index}`, `text-${index}`, 1 + index * 20),
    );
    const head = Math.floor(count / 3);
    const headId = baseline[head]!.id;
    const tailId = `n/main:body/TAIL/o${head + 1}`;
    const measureSingleLine = async (block: FlowBlock): Promise<Measure> => {
      if (block.kind !== 'paragraph') throw new Error('unexpected');
      return {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: block.runs[0]!.text.length,
            width: 100,
            ascent: 90,
            descent: 30,
            lineHeight: 120,
          },
        ],
        totalHeight: 120,
      } as ParagraphMeasure;
    };
    let currentBlocks = baseline;
    let current = await incrementalLayout([], null, currentBlocks, OPTIONS, measureSingleLine);
    current.layout.layoutEpoch = 1;
    for (let step = 0; step < (qualification === 'paired' ? 4 : 1); step++) {
      const split = step % 2 === 0;
      const text = baseline[head]!.runs[0]!.text;
      const start = baseline[head]!.runs[0]!.pmStart!;
      const nextBlocks = split
        ? [
            ...baseline.slice(0, head),
            paragraph(headId, text.slice(0, 3), start),
            paragraph(tailId, text.slice(3), start + 3),
            ...baseline
              .slice(head + 1)
              .map((block, index) =>
                paragraph(
                  `n/main:body/P${head + index + 1}/o${head + index + 2}`,
                  block.runs[0]!.text,
                  block.runs[0]!.pmStart! + 20,
                ),
              ),
          ]
        : baseline;
      const sourceStartIndex = head + (split ? 1 : 2);
      const targetStartIndex = head + (split ? 2 : 1);
      const token = {};
      let identityEntriesVisited = 0;
      class CountedIdentityMap extends Map<string, string> {
        override *entries(): MapIterator<[string, string]> {
          for (const entry of super.entries()) {
            identityEntriesVisited++;
            yield entry;
          }
        }
        override [Symbol.iterator](): MapIterator<[string, string]> {
          return this.entries();
        }
      }
      const forward = new CountedIdentityMap(
        currentBlocks
          .slice(sourceStartIndex)
          .map((block, index) => [block.id, nextBlocks[targetStartIndex + index]!.id] as const),
      );
      const reverse = new CountedIdentityMap([...Map.prototype.entries.call(forward)].map(([from, to]) => [to, from]));
      for (const [map, direction] of [
        [forward, 'previous-to-current'],
        [reverse, 'current-to-previous'],
      ] as const) {
        if (qualification === 'ordinary' || (qualification === 'one-sided' && map === reverse)) continue;
        Object.defineProperty(map, Symbol.for('superdoc.v2.structural-block-id-rewrite.v1'), {
          value: Object.freeze({
            version: 1,
            token: qualification === 'mismatched-token' && map === reverse ? {} : token,
            direction: qualification === 'wrong-direction' && map === reverse ? 'previous-to-current' : direction,
            sourceStartIndex,
            targetStartIndex,
            localRewriteCount: 0,
            sourceSize: currentBlocks.length,
            targetSize: nextBlocks.length,
          }),
        });
      }
      const insertedBlockIds = split ? [tailId] : [];
      const deletedBlockIds = split ? [] : [tailId];
      const changedBlockIds = [headId, ...insertedBlockIds];
      const reuse = {
        ...buildReuse(currentBlocks, nextBlocks, current.layout, start + text.length),
        allowBlockIdChurn: true,
        previousBlockIndexById: new Map(currentBlocks.map((block, index) => [block.id, index])),
        blockIdRewrites: { previousToCurrent: forward, currentToPrevious: reverse },
        dirtyBlockIds: changedBlockIds,
        provedDirtyRegion: {
          firstDirtyIndex: head,
          lastStableIndex: head - 1,
          insertedBlockIds,
          deletedBlockIds,
          changedBlockIds,
          stableBlockIds: new Set(
            nextBlocks.filter((_, index) => index < head || index >= targetStartIndex).map((block) => block.id),
          ),
        },
        pmShift: { atChar: currentBlocks[sourceStartIndex]!.runs[0]!.pmStart!, delta: split ? 20 : -20 },
      };
      const next = await incrementalLayout(
        currentBlocks,
        current.layout,
        nextBlocks,
        OPTIONS,
        measureSingleLine,
        undefined,
        current.measures,
        undefined,
        undefined,
        reuse,
      );
      expect(next.layoutReuse.mode, `step=${step}: ${JSON.stringify(next.layoutReuse)}`).toBe('tail-splice');
      if (qualification === 'paired') {
        expect(
          identityEntriesVisited,
          `step=${step}: qualified checkpoint construction must use local identity lookups`,
        ).toBe(0);
      } else {
        expect(
          identityEntriesVisited,
          `${qualification}: generic checkpoint construction remains eager`,
        ).toBeGreaterThan(0);
      }
      clearIncrementalModuleState();
      const cold = await incrementalLayout([], null, nextBlocks, OPTIONS, measureSingleLine);
      expect([...next.layout.pages], `step=${step}: complete geometry`).toEqual([...cold.layout.pages]);
      expect(new Map(next.layout.blockResumeCheckpoints ?? []), `step=${step}: exact checkpoints`).toEqual(
        new Map(cold.layout.blockResumeCheckpoints ?? []),
      );
      next.layout.layoutEpoch = step + 2;
      currentBlocks = nextBlocks;
      current = next;
    }
    if (qualification === 'paired') expect(currentBlocks).toBe(baseline);
    const stats = __test_only_splicedCheckpointStats(current.layout.blockResumeCheckpoints);
    expect(stats!.pieceCount).toBeLessThanOrEqual(4);
    expect(stats!.sourceCount).toBeLessThanOrEqual(4);
  };

  it.each([64, 512])(
    'keeps checkpoint identity composition local through repeated split and inverse merge in %i paragraphs',
    async (count) => {
      await verifyStructuralCheckpointComposition(count);
    },
  );

  it.each(['ordinary', 'mismatched-token', 'wrong-direction', 'one-sided'] as const)(
    'preserves eager checkpoint composition and cold parity for %s rewrite maps',
    async (qualification) => {
      await verifyStructuralCheckpointComposition(64, qualification);
    },
  );
});
