import type { DocumentApi } from 'superdoc/ui';

declare const doc: DocumentApi;
const fragment: NonNullable<Parameters<DocumentApi['clipboard']['insert']>[0]['fragment']> = {
  kind: 'superdoc.clipboard.fragment',
  version: 'v2.1',
  blocks: [
    {
      kind: 'table',
      columnWidthShares: [2, 3],
      rows: [
        {
          cells: [
            { vMerge: 'restart', blocks: [{ kind: 'paragraph', runs: [{ text: 'A' }] }] },
            { blocks: [{ kind: 'paragraph', runs: [{ text: 'B' }] }] },
          ],
        },
        {
          cells: [
            { vMerge: 'continue', blocks: [{ kind: 'paragraph', runs: [{ text: '' }] }] },
            { blocks: [{ kind: 'paragraph', runs: [{ text: 'C' }] }] },
          ],
        },
      ],
    },
  ],
};
const result: ReturnType<DocumentApi['clipboard']['insert']> = doc.clipboard.insert({ fragment });
const parsed = doc.clipboard.parse({
  items: [{ type: 'text/html', kind: 'string', data: '<table><tr><td>A</td></tr></table>' }],
});
if (parsed.success) {
  for (const block of parsed.plan.fragment.blocks) {
    if (block.kind !== 'table') continue;
    const shares: readonly number[] | undefined = block.columnWidthShares;
    for (const row of block.rows) {
      for (const cell of row.cells) {
        const merge: 'restart' | 'continue' | undefined = cell.vMerge;
        void merge;
      }
    }
    void shares;
  }
}
void result;
