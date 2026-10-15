import type { BrowserDocumentApi, DocumentApi, SelectionTarget } from 'superdoc/ui';

declare const doc: DocumentApi;
declare const browserDoc: BrowserDocumentApi;
const target = { kind: 'block', nodeType: 'listItem', nodeId: 'paragraph-id' } as const;

const at: SelectionTarget = {
  kind: 'selection',
  start: { kind: 'nodeEdge', node: target, edge: 'before' },
  end: { kind: 'nodeEdge', node: target, edge: 'after' },
};
const original = doc.selection.extractOoxml({ at, retain: true });
const handle: string | undefined = original.snapshotId;
const revision: string = original.evaluatedRevision;
const xml: string = original.fragment.xml;
const packageCoordinate: string | undefined = original.source.packageRevision;
doc.replace(
  { target, type: 'markdown', value: '**Alternate**' },
  { replaceMode: 'contents', expectedSnapshotId: handle, changeMode: 'direct', expectedRevision: revision },
);
doc.replace(
  { target, snapshotId: handle! },
  { replaceMode: 'contents', expectedSnapshotId: handle!, changeMode: 'direct' },
);
doc.replace({ target, capture: original }, { changeMode: 'direct', dryRun: true });
doc.insert(
  { target, type: 'ooxml', value: '<w:r><w:t>Native</w:t></w:r>', namespaces: original.fragment.namespaces },
  { changeMode: 'direct' },
);
const released: boolean = doc.selection.releaseSnapshot({ snapshotId: handle! }).released;
const invoked = doc.invoke<'selection.extractOoxml'>({
  operationId: 'selection.extractOoxml',
  input: { at, retain: true },
});
const capturedXml: string = invoked.fragment.xml;

async function browserRoundTrip() {
  const captured = await browserDoc.selection.extractOoxml({ at, retain: true });
  const receipt = await browserDoc.replace(
    { target, text: 'Another option' },
    { replaceMode: 'contents', expectedSnapshotId: captured.snapshotId, changeMode: 'direct' },
  );
  const live = await browserDoc.selection.extractOoxml({ at, retain: true });
  const restore = await browserDoc.replace(
    { target, snapshotId: captured.snapshotId! },
    { replaceMode: 'contents', expectedSnapshotId: live.snapshotId, changeMode: 'direct' },
  );
  const release = await browserDoc.selection.releaseSnapshot({ snapshotId: live.snapshotId! });
  const success: boolean = receipt.success;
  void [success, restore.success, release.released];
}
// @ts-expect-error Unpublished paragraph APIs have been removed.
doc.blocks.captureParagraph({ target });
// @ts-expect-error Native XML requires explicit namespace bindings.
doc.replace({ target, type: 'ooxml', value: '<w:p/>' });

void [xml, packageCoordinate, released, capturedXml, browserRoundTrip];
