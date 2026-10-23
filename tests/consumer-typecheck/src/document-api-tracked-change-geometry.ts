import type { BrowserDocumentApi, DocumentApi } from 'superdoc/ui';

declare const doc: DocumentApi;
declare const browserDoc: BrowserDocumentApi;
const change = doc.trackChanges.get({ id: 'geometry-change' });
if (change.target?.kind === 'text' || change.target?.kind === 'replacement') {
  change.target.coordinateSpace satisfies 'visible' | 'tracked' | undefined;
  change.target.segments?.[0]?.range.start satisfies number | undefined;
  change.target.story?.kind satisfies 'story' | undefined;
}
const browserChange: Awaited<ReturnType<BrowserDocumentApi['trackChanges']['get']>> = {} as Awaited<
  ReturnType<BrowserDocumentApi['trackChanges']['get']>
>;
if (browserChange.target?.kind === 'text' || browserChange.target?.kind === 'replacement') {
  browserChange.target.coordinateSpace satisfies 'visible' | 'tracked' | undefined;
}
void browserDoc;
