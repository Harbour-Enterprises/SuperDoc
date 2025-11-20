import type { FlowBlock, Layout, Measure } from '@superdoc/contracts';

export function createSampleDoc() {
  const block: FlowBlock = {
    kind: 'paragraph',
    id: 'block-1',
    runs: [
      {
        text: 'hello',
        fontFamily: 'Arial',
        fontSize: 16,
        pmStart: 1,
        pmEnd: 6,
      },
    ],
  };

  const measure: Measure = {
    kind: 'paragraph',
    totalHeight: 18,
    lines: [
      {
        fromRun: 0,
        fromChar: 0,
        toRun: 0,
        toChar: 5,
        width: 100,
        ascent: 12,
        descent: 4,
        lineHeight: 18,
      },
    ],
  };

  const layout: Layout = {
    pageSize: { w: 600, h: 800 },
    pages: [
      {
        number: 1,
        fragments: [
          {
            kind: 'para',
            blockId: 'block-1',
            fromLine: 0,
            toLine: 1,
            x: 10,
            y: 20,
            width: 200,
            pmStart: 1,
            pmEnd: 6,
          },
        ],
      },
    ],
  };

  return {
    layout,
    blocks: [block],
    measures: [measure],
  };
}
