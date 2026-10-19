import type { BrowserDocumentApi, DocumentApi } from 'superdoc/ui';
declare const doc: BrowserDocumentApi;
const plan: Parameters<DocumentApi['mutations']['apply']>[0] = {
  atomic: true,
  changeMode: 'direct',
  expectedRevision: 'revision',
  steps: [
    {
      id: 'move',
      op: 'comments.patch',
      args: { commentId: 'root', target: { kind: 'text', blockId: 'paragraph', range: { start: 0, end: 0 } } },
    },
    {
      id: 'decide',
      op: 'trackChanges.decide',
      args: { decision: 'reject', target: { kind: 'ids', ids: ['revision-id'] } },
    },
  ],
};
void Promise.resolve(doc.mutations.preview(plan)).then((preview) => {
  const destination = preview.steps[0]?.review?.target;
  const revision: string = preview.evaluatedRevision;
  void destination;
  void revision;
});
void Promise.resolve(doc.mutations.apply(plan)).then((receipt) => {
  const transaction: string | undefined = receipt.txId;
  const affected = receipt.affectedStories;
  const step = receipt.steps[0];
  if (step?.data.domain === 'review') {
    const ids: string[] | undefined = step.data.commentIds;
    void ids;
  }
  void transaction;
  void affected;
});
