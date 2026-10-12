import type { DocumentApi, BrowserDocumentApi } from 'superdoc/ui';

declare const doc: DocumentApi;
declare const browserDoc: BrowserDocumentApi;

const author = { name: 'Automated Reviewer' };
const inserted = doc.insert({ value: 'Review', type: 'text' }, { changeMode: 'tracked', author });
const replaced = doc.replace({ ref: 'found-text', text: 'Review' }, { changeMode: 'tracked', author });
const deleted = doc.delete({ ref: 'found-text' }, { changeMode: 'tracked', author });
void [inserted, replaced, deleted];
void browserDoc.insert({ value: 'Review' }, { changeMode: 'tracked', author });
void doc.insert(
  { value: 'Review' },
  { changeMode: 'tracked', author, signal: new AbortController().signal, timeoutMs: 1_000 },
);
void browserDoc.insert(
  { value: 'Review' },
  { changeMode: 'tracked', author, signal: new AbortController().signal, timeoutMs: 1_000 },
);

const invokedInsert = doc.invoke({
  operationId: 'insert',
  input: { value: 'Review' },
  options: { changeMode: 'tracked', author },
});
const invokedReplace = doc.invoke({
  operationId: 'replace',
  input: { ref: 'found-text', text: 'Review' },
  options: { changeMode: 'tracked', author },
});
const invokedDelete = doc.invoke({
  operationId: 'delete',
  input: { ref: 'found-text' },
  options: { changeMode: 'tracked', author },
});
const typedInsertRequest: Parameters<typeof doc.invoke<'insert'>>[0] = {
  operationId: 'insert',
  input: { value: 'Review' },
  options: { changeMode: 'tracked', author },
};
const typedReplaceRequest: Parameters<typeof doc.invoke<'replace'>>[0] = {
  operationId: 'replace',
  input: { ref: 'found-text', text: 'Review' },
  options: { changeMode: 'tracked', author },
};
const invokedSuccesses: boolean[] = [invokedInsert.success, invokedReplace.success, invokedDelete.success];
void [typedInsertRequest, typedReplaceRequest, invokedSuccesses];

async function browserInvokeReceipts() {
  const insert = await browserDoc.invoke({
    operationId: 'insert',
    input: { value: 'Review' },
    options: { changeMode: 'tracked', author },
  });
  const replace = await browserDoc.invoke({
    operationId: 'replace',
    input: { ref: 'found-text', text: 'Review' },
    options: { changeMode: 'tracked', author },
  });
  const deletion = await browserDoc.invoke({
    operationId: 'delete',
    input: { ref: 'found-text' },
    options: { changeMode: 'tracked', author },
  });
  const text: string = await browserDoc.invoke({ operationId: 'getText', input: {} });
  const successes: boolean[] = [insert.success, replace.success, deletion.success];
  void [successes, text];
}
void browserInvokeReceipts;

// Explicit typed requests exclude the intentional unknown-input dynamic fallback.
// @ts-expect-error An authored typed invocation cannot insert HTML.
doc.invoke<'insert'>({
  operationId: 'insert',
  input: { value: '<p>Review</p>', type: 'html' },
  options: { changeMode: 'tracked', author },
});
const structuralInput: Parameters<DocumentApi['insert']>[0] = {
  content: { kind: 'paragraph', paragraph: { inlines: [] } },
};
void doc.invoke<'insert'>({ operationId: 'insert', input: structuralInput });
const authoredStructuralRequest = {
  operationId: 'insert' as const,
  input: structuralInput,
  options: { changeMode: 'tracked' as const, author },
};
// @ts-expect-error A valid structural input cannot receive an authored typed invocation.
doc.invoke<'insert'>(authoredStructuralRequest);
// @ts-expect-error An authored typed invocation cannot replace the complete body.
doc.invoke<'replace'>({
  operationId: 'replace',
  input: { target: { kind: 'story', storyType: 'body' }, text: 'Review' },
  options: { changeMode: 'tracked', author },
});
// @ts-expect-error An authored typed invocation cannot insert in direct mode.
doc.invoke<'insert'>({ operationId: 'insert', input: { value: 'Review' }, options: { changeMode: 'direct', author } });
const listInput: Parameters<DocumentApi['lists']['apply']>[0] = {
  target: { kind: 'block', nodeType: 'paragraph', nodeId: 'p1' },
  seed: 'bullet',
};
void doc.invoke<'lists.apply'>({ operationId: 'lists.apply', input: listInput, options: { changeMode: 'tracked' } });
doc.invoke<'lists.apply'>({
  operationId: 'lists.apply',
  input: listInput,
  options: {
    changeMode: 'tracked',
    // @ts-expect-error A valid list input cannot receive an authored typed invocation.
    author,
  },
});
// @ts-expect-error Browser typed invocation preserves the unsupported HTML restriction.
browserDoc.invoke<'insert'>({
  operationId: 'insert',
  input: { value: '<p>Review</p>', type: 'html' },
  options: { changeMode: 'tracked', author },
});

// @ts-expect-error A direct insertion cannot claim a per-call tracked author.
doc.insert({ value: 'Review' }, { changeMode: 'direct', author });
// @ts-expect-error Per-call author is not supported for HTML.
doc.insert({ value: '<p>Review</p>', type: 'html' }, { changeMode: 'tracked', author });
// @ts-expect-error Per-call author is not supported for structural content.
doc.insert(structuralInput, { changeMode: 'tracked', author });
// @ts-expect-error Per-call author is not supported on mutation plans.
doc.mutations.apply({ atomic: true, changeMode: 'tracked', steps: [], author });
