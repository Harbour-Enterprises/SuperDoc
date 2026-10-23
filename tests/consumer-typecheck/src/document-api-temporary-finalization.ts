import type { BrowserDocumentApi, DocumentApi } from 'superdoc/ui';

declare const doc: DocumentApi;
declare const browserDoc: BrowserDocumentApi;
const input: Parameters<DocumentApi['mutations']['commitTemporary']>[0] = {
  previewId: 'preview',
  expectedRevision: '1',
  operations: [
    {
      operation: 'trackChanges.decide',
      input: {
        decision: 'accept',
        target: { kind: 'ids', ids: ['selected-paragraph-change'] },
      },
    },
    {
      operation: 'blocks.delete',
      input: {
        target: { kind: 'block', nodeType: 'listItem', nodeId: 'selected-item' },
      },
      options: { changeMode: 'direct' },
    },
  ],
};
const result: ReturnType<DocumentApi['mutations']['commitTemporary']> = doc.mutations.commitTemporary(input);
const browserResult: ReturnType<BrowserDocumentApi['mutations']['commitTemporary']> =
  browserDoc.mutations.commitTemporary(input);
void result;
void browserResult;
