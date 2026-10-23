import type { BrowserDocumentApi, DocumentApi } from 'superdoc/ui';

declare const doc: DocumentApi;
declare const browserDoc: BrowserDocumentApi;
declare const operations: Parameters<DocumentApi['mutations']['beginTemporary']>[0]['operations'];

async function editablePreview() {
  const preview = await browserDoc.mutations.beginTemporary({ tag: 'review', onNativeEdit: 'preserve', operations });
  const policy: 'cancel' | 'preserve' | undefined = preview.temporary.onNativeEdit;
  await browserDoc.mutations.replaceTemporary({
    tag: 'review',
    previewId: preview.temporary.id,
    onNativeEdit: 'preserve',
    operations,
  });
  await browserDoc.mutations.rollbackTemporary({ previewId: preview.temporary.id });
  const native = await doc.mutations.beginTemporary({ tag: 'review', onNativeEdit: 'preserve', operations });
  await doc.mutations.commitTemporary({ previewId: native.temporary.id });
  return policy;
}

void editablePreview;
