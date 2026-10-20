import { expect, it } from 'bun:test';
import {
  createParagraphLayoutSkipFacts,
  shouldSkipParagraphDuringLayout as canonical,
  type FlowBlock,
} from '@superdoc/contracts';
import { retainParagraphLayoutFacts, shouldSkipParagraphDuringLayout } from './paragraph-layout-eligibility.js';

function fixture(): FlowBlock[] {
  return [
    {
      kind: 'sectionBreak',
      id: 'start',
      type: 'continuous',
      columns: { count: 3, gap: 20, widths: [100, 200, 200], equalWidth: false },
      attrs: { source: 'sectPr' },
    },
    { kind: 'paragraph', id: 'body', runs: [{ text: 'text' }] },
    { kind: 'paragraph', id: 'marker', runs: [{ text: '' }], attrs: { sectPrMarker: true } },
    { kind: 'sectionBreak', id: 'end', type: 'continuous', columns: { count: 1, gap: 0 }, attrs: { source: 'sectPr' } },
  ];
}

it('scalar anchor facts preserve carrier decisions across eligibility and owner variants', () => {
  for (const widths of [[100, 200, 200], [100, 100, 100], [], [0, 200, 200]]) {
    for (const markerAttrs of [
      { sectPrMarker: true },
      {},
      { sectPrMarker: true, frame: {} },
      { sectPrMarker: true, sdt: {} },
      { sectPrMarker: true, paragraphMarkTrackedChange: {} },
    ]) {
      for (const kind of ['none', 'image', 'drawing', 'table']) {
        for (const owner of ['body', 'marker', 'absent', undefined]) {
          for (const anchored of [false, true]) {
            const blocks = fixture();
            (blocks[0] as any).columns.widths = widths;
            (blocks[2] as any).attrs = markerAttrs;
            if (kind !== 'none')
              blocks.push({
                kind,
                id: 'graphic',
                attrs: { anchorParagraphId: owner },
                anchor: { isAnchored: anchored },
              } as unknown as FlowBlock);
            const facts = createParagraphLayoutSkipFacts(blocks);
            for (let index = 0; index < blocks.length; index++) {
              expect(canonical(blocks, index, facts)).toBe(canonical(blocks, index));
            }
          }
        }
      }
    }
  }
});

it('releases invocation facts and rejects them when their source is retired', () => {
  const blocks = fixture();
  let current = true;
  const release = retainParagraphLayoutFacts(blocks, () => current);
  const nested = retainParagraphLayoutFacts(blocks, () => current);
  expect(shouldSkipParagraphDuringLayout(blocks, 2)).toBe(true);
  nested();
  blocks.push({ kind: 'image', id: 'graphic', attrs: { anchorParagraphId: 'marker' } } as FlowBlock);
  current = false;
  expect(shouldSkipParagraphDuringLayout(blocks, 2)).toBe(false);
  release();
  expect(shouldSkipParagraphDuringLayout(blocks, 2)).toBe(false);
});
