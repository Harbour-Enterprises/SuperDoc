import type { BrowserDocumentApi, DocumentApi, TextTarget } from 'superdoc/ui';

declare const doc: DocumentApi;
declare const browserDoc: BrowserDocumentApi;

const input: Parameters<DocumentApi['trackChanges']['get']>[0] = { id: 'revision-id' };
const info = doc.trackChanges.get(input);
if (info.target?.kind === 'formatting') {
  const segments: TextTarget['segments'] | undefined = info.target.segments;
  const story: TextTarget['story'] = info.target.story;
  const space: TextTarget['coordinateSpace'] = info.target.coordinateSpace;
  void [segments, story, space];
}
Promise.resolve(browserDoc.trackChanges.get(input)).then(({ target }) => {
  if (target?.kind === 'formatting') {
    const range: TextTarget | undefined = target.segments
      ? { kind: 'text', segments: target.segments, story: target.story, coordinateSpace: target.coordinateSpace }
      : undefined;
    void range;
  }
});
