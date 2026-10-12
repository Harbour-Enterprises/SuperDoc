import type { DocumentApi } from 'superdoc/ui';

declare const doc: DocumentApi;
declare const parsed: ReturnType<DocumentApi['clipboard']['parse']>;

const fragment: NonNullable<Parameters<DocumentApi['clipboard']['insert']>[0]['fragment']> = {
  kind: 'superdoc.clipboard.fragment',
  version: 'v2.1',
  blocks: [
    {
      kind: 'table',
      cellSpacingPt: 9,
      rows: [
        {
          cells: [
            {
              padding: { topPt: 3 },
              verticalAlign: 'center',
              borders: {
                top: { lineStyle: 'single', lineWeightPt: 0.681818, color: '808080' },
                right: { lineStyle: 'dashed', lineWeightPt: 3, color: '000000' },
                bottom: { lineStyle: 'nil', lineWeightPt: 0, color: 'auto' },
                left: { lineStyle: 'double', lineWeightPt: 1.5, color: 'CC0000' },
              },
              blocks: [{ kind: 'paragraph', runs: [{ text: 'Cell' }] }],
            },
          ],
        },
      ],
    },
  ],
};

doc.clipboard.insert({ fragment });
if (parsed.success) {
  for (const block of parsed.plan.fragment.blocks) {
    if (block.kind === 'table') {
      const spacing: number | undefined = block.cellSpacingPt;
      void spacing;
      for (const row of block.rows) {
        for (const cell of row.cells) {
          const alignment: 'top' | 'center' | 'bottom' | undefined = cell.verticalAlign;
          const style: string | undefined = cell.borders?.top?.lineStyle;
          const width: number | undefined = cell.borders?.right?.lineWeightPt;
          const color: string | undefined = cell.borders?.bottom?.color;
          void [alignment, style, width, color];
        }
      }
    }
  }
}
