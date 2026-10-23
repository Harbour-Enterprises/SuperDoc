import type { DocumentApi, BrowserDocumentApi } from 'superdoc/ui';

declare const doc: DocumentApi;
declare const browserDoc: BrowserDocumentApi;
const target = {
  kind: 'selection',
  start: { kind: 'text', blockId: 'clause', offset: 0 },
  end: { kind: 'text', blockId: 'clause', offset: 6 },
} as const;
async function temporaryReview() {
  const receipt = await doc.mutations.beginTemporary({
    tag: 'preview',
    onNativeEdit: 'cancel',
    operations: [
      { operation: 'replace', input: { target, text: 'Option' }, options: { changeMode: 'direct' } },
      { operation: 'insert', input: { value: 'Appendix', type: 'text' }, options: { changeMode: 'direct' } },
      {
        operation: 'trackChanges.decide',
        input: { decision: 'reject', target: { kind: 'id', id: 'revision' }, commentRetention: 'point' },
      },
      { operation: 'comments.create', input: { target, text: 'Explanation' } },
    ],
  });
  const id: string = receipt.temporary.id;
  const tag: string = receipt.temporary.tag;
  const nativeEditPolicy: 'cancel' | 'preserve' | undefined = receipt.temporary.onNativeEdit;
  const cancellation: 'native-edit' | undefined = receipt.temporary.cancelledBy;
  void nativeEditPolicy;
  void cancellation;
  const revision: string = receipt.revision.after;
  await browserDoc.mutations.replaceTemporary({
    previewId: id,
    tag,
    onNativeEdit: 'cancel',
    expectedRevision: revision,
    operations: [{ operation: 'replace', input: { target, text: 'Second' }, options: { changeMode: 'tracked' } }],
  });
  await doc.mutations.rollbackTemporary({ previewId: id });
  await browserDoc.mutations.commitTemporary({ previewId: id });
  doc.mutations.beginTemporary({
    tag: 'invalid-policy',
    // @ts-expect-error Native interaction cannot silently commit a temporary choice.
    onNativeEdit: 'commit',
    operations: [{ operation: 'replace', input: { target, text: 'Option' } }],
  });
  doc.trackChanges.decide({
    decision: 'accept',
    target: { kind: 'ids', ids: ['revision'] },
    commentRetention: 'point',
  });
  // @ts-expect-error Native deletion remains the omission default; arbitrary retention policies are rejected.
  doc.trackChanges.decide({ decision: 'accept', target: { kind: 'id', id: 'revision' }, commentRetention: 'discard' });
}
void temporaryReview;
