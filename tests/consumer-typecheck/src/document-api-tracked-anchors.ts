import type { DocumentApi } from 'superdoc/ui';
import type { SuperDocExtensionContext } from 'superdoc';

declare const doc: DocumentApi;
declare const ctx: SuperDocExtensionContext;
const anchor = ctx.anchors.from({
  kind: 'text',
  coordinateSpace: 'tracked',
  segments: [{ blockId: 'clause', range: { start: 3, end: 8 } }],
});
const selectionAnchor = ctx.anchors.from({
  kind: 'selection',
  coordinateSpace: 'tracked',
  start: { kind: 'text', blockId: 'clause', offset: 3 },
  end: { kind: 'text', blockId: 'clause', offset: 8 },
});
const receipt = doc.trackChanges.decide({ decision: 'accept', target: { kind: 'id', id: 'revision' } });
if (receipt.success)
  for (const shift of receipt.trackedTextRangeShifts ?? []) {
    const offset: number = shift.atCharInBlock;
    const block: string = shift.blockId;
    void [offset, block, shift.story, shift.delta];
  }
void [anchor, selectionAnchor];
