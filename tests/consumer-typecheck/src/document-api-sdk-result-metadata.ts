import type { DocumentApi } from 'superdoc/ui';

declare const doc: DocumentApi;

const deletion = doc.delete({ ref: 'resolved-text-ref' });
if (deletion.success) {
  const txId: string | undefined = deletion.txId;
  const storyKind: 'story' | undefined = deletion.affectedStories?.[0]?.kind;
  const shift: number | undefined = deletion.textRangeShifts?.[0]?.delta;
  const resolvedText: string = deletion.resolution.text;
  const changed: boolean | undefined = deletion.changed;
  const trackedCount: number | undefined = deletion.trackedChangeCount;
  const trackedId: string | undefined = deletion.trackedChangeRefs?.[0]?.entityId;
  void [txId, storyKind, shift, resolvedText, changed, trackedCount, trackedId];
}

const image = doc.create.image({
  src: 'data:image/png;base64,fixture',
  at: { kind: 'documentEnd' },
  size: { width: 1, height: 1 },
});
if (image.success) {
  const txId: string | undefined = image.txId;
  const nodeId: string = image.image.nodeId;
  void [txId, nodeId];
}

const watermarks = doc.watermarks.list({ target: { kind: 'document' } });
const watermarkId: string = watermarks.items[0].watermarkId;
const discoveryId: string = watermarks.items[0].id;
const mutationRef: string = watermarks.items[0].handle.ref;
const revision: string = watermarks.evaluatedRevision;
void [watermarkId, discoveryId, mutationRef, revision];

const toc = doc.toc.get({
  target: { kind: 'block', nodeType: 'tableOfContents', nodeId: 'toc' },
});
const visibleText: string | undefined = toc.text;
const instruction: string = toc.properties.instruction;
void [visibleText, instruction];

const capability = doc.capabilities().operations['format.bold'];
const available: boolean = capability.available;
const support: 'always' | 'conditional' | 'never' | undefined = capability.trackedSupport;
void [available, support];

const split = doc.blocks.split({
  target: { kind: 'block', nodeType: 'paragraph', nodeId: 'paragraph' },
  offset: 1,
});
if (split.success) {
  const insertedId: string = split.inserted.nodeId;
  const originalId: string | undefined = split.anchor?.nodeId;
  const txId: string | undefined = split.txId;
  void [insertedId, originalId, txId];
}

const merged = doc.blocks.merge({
  first: { kind: 'block', nodeType: 'paragraph', nodeId: 'first' },
  second: { kind: 'block', nodeType: 'paragraph', nodeId: 'second' },
});
if (merged.success) {
  const removedId: string = merged.removed.nodeId;
  const survivingId: string | undefined = merged.anchor?.nodeId;
  const joinOffset: number | undefined = merged.joinOffset;
  void [removedId, survivingId, joinOffset];
}

const imageUpdate = doc.images.setLockAspectRatio({ imageId: 'image', locked: true });
if (imageUpdate.success) {
  const changed: boolean | undefined = imageUpdate.changed;
  const txId: string | undefined = imageUpdate.txId;
  void [changed, txId];
}

const hyperlink = doc.hyperlinks.insert({ text: 'Example', link: { destination: { href: 'https://example.com' } } });
if (hyperlink.success) {
  const nodeId: string | null | undefined = hyperlink.hyperlinkNodeId;
  const createdParts: readonly string[] | undefined = hyperlink.partsCreated;
  const modifiedParts: readonly string[] | undefined = hyperlink.partsModified;
  const relationshipId: string | undefined = hyperlink.createdRId;
  const txId: string | undefined = hyperlink.txId;
  void [nodeId, createdParts, modifiedParts, relationshipId, txId];
}

const afterControl = doc.contentControls.insertAfter({
  target: { kind: 'block', nodeType: 'sdt', nodeId: 'control' },
  content: 'After the control',
  format: 'text',
});
if (afterControl.success) {
  const createdBlockId: string | undefined = afterControl.createdBlockId;
  const txId: string | undefined = afterControl.txId;
  void [createdBlockId, txId];
}

const insertion = doc.insert({ value: 'Tracked insertion', ref: 'resolved-text-ref' }, { changeMode: 'tracked' });
const replaced = doc.replace({ text: 'Tracked replacement', ref: 'resolved-text-ref' }, { changeMode: 'tracked' });
for (const receipt of [insertion, replaced]) {
  const changed: boolean | undefined = receipt.changed;
  const trackedCount: number | undefined = receipt.trackedChangeCount;
  const trackedId: string | undefined = receipt.trackedChangeRefs?.[0]?.entityId;
  void [changed, trackedCount, trackedId];
}

if (deletion.success) {
  const outcomeEdit: number | undefined = deletion.trackedChangeOutcomes?.[0]?.editIndex;
  const outcomeId: string | undefined = deletion.trackedChangeOutcomes?.[0]?.trackedChangeRefs[0]?.entityId;
  const warningFeature: 'comments' | 'trackedChanges' | undefined = deletion.warnings?.[0]?.feature;
  const shiftedBlock: string | undefined = deletion.textRangeShifts?.[0]?.blockId;
  const createdText: string | undefined = deletion.effects?.insertedText?.[0]?.text;
  const createdBlock: string | undefined = deletion.effects?.insertedBlocks?.[0]?.target.nodeId;
  const remapping = deletion.remappedRefs?.[0];
  if (remapping?.to.kind === 'text') {
    const movedStart: number = remapping.to.range.start;
    void movedStart;
  }
  void [outcomeEdit, outcomeId, warningFeature, shiftedBlock, createdText, createdBlock];
}

const pasted = doc.clipboard.insert({
  payload: { source: 'api', items: [{ type: 'text/plain', kind: 'string', data: 'Paste' }] },
});
if (pasted.success) {
  const sourceKind: string = pasted.plan.sourceKind;
  const blocks: number = pasted.plan.blockCount;
  const assets: number = pasted.plan.assetCount;
  const imageRefs: number = pasted.plan.imageRefCount;
  const plainFallback: boolean = pasted.plan.plainFallback;
  const reason: string | undefined = pasted.diagnostics[0]?.reason;
  const source: string | undefined = pasted.diagnostics[0]?.sourceKind;
  const causeCode: string | undefined = pasted.diagnostics[0]?.cause?.code;
  const sourceOffset: number | undefined = pasted.diagnostics[0]?.cause?.source.range?.startOffset;
  const txId: string | undefined = pasted.txId;
  void [sourceKind, blocks, assets, imageRefs, plainFallback, reason, source, causeCode, sourceOffset, txId];
}
