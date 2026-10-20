import type { BrowserDocumentApi, DocumentApi } from 'superdoc/ui';

declare const doc: DocumentApi;
declare const browserDoc: BrowserDocumentApi;

const input: Parameters<DocumentApi['lists']['insert']>[0] = {
  target: { kind: 'block', nodeType: 'listItem', nodeId: 'placement-item' },
  inheritFrom: { kind: 'block', nodeType: 'listItem', nodeId: 'formatting-item' },
  position: 'after',
  text: 'New item',
};
const result: ReturnType<DocumentApi['lists']['insert']> = doc.lists.insert(input);
if (result.success) {
  const nodeId: string = result.item.nodeId;
  void nodeId;
}
const browserInput: Parameters<BrowserDocumentApi['lists']['insert']>[0] = input;
const browserResult: ReturnType<BrowserDocumentApi['lists']['insert']> = browserDoc.lists.insert(browserInput);
void browserResult;
