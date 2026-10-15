import type { BrowserDocumentApi, DocumentApi, TextTarget } from 'superdoc/ui';

declare const doc: DocumentApi;
declare const browserDoc: BrowserDocumentApi;

const tracked: TextTarget | null | undefined = doc.selection.current().trackedTarget;
if (tracked) {
  const receipt = doc.trackChanges.decide({
    decision: 'accept',
    target: { kind: 'range', coordinateSpace: 'tracked', range: tracked },
  });
  const success: boolean = receipt.success;
  void success;
}

Promise.resolve(browserDoc.selection.current()).then((selection) => {
  const target: TextTarget | null | undefined = selection.trackedTarget;
  if (target)
    return browserDoc.trackChanges.decide({
      decision: 'reject',
      target: { kind: 'range', coordinateSpace: 'tracked', range: target },
    });
});
