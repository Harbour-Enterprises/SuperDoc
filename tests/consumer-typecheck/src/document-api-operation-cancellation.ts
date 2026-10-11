import type { BrowserDocumentApi, DocumentApi } from 'superdoc/ui';

declare const doc: DocumentApi;
declare const browserDoc: BrowserDocumentApi;

const controller = new AbortController();
const cancellation = { signal: controller.signal, timeoutMs: 50 };

const inserted: ReturnType<DocumentApi['insert']> = doc.insert(
  { value: 'SD4996', type: 'text' },
  { changeMode: 'tracked', ...cancellation },
);
void inserted;

const extracted: ReturnType<DocumentApi['extract']> = doc.extract({}, cancellation);
void extracted;

const plan: Parameters<DocumentApi['mutations']['apply']>[0] = {
  atomic: true,
  changeMode: 'tracked',
  steps: [
    {
      id: 'rewrite',
      op: 'text.rewrite',
      where: { by: 'select', select: { type: 'text', pattern: 'hello' }, require: 'first' },
      args: { replacement: { text: 'hi' } },
    },
  ],
};
const applied: ReturnType<DocumentApi['mutations']['apply']> = doc.mutations.apply(plan, cancellation);
void applied;

const browserInserted: ReturnType<BrowserDocumentApi['insert']> = browserDoc.insert(
  { value: 'SD4996', type: 'text' },
  { changeMode: 'tracked', signal: controller.signal, timeoutMs: 50 },
);
void browserInserted;

void browserDoc.extract({}, cancellation);
void browserDoc.mutations.apply(plan, cancellation);

// @ts-expect-error signal must be an AbortSignal
doc.extract({}, { signal: 'nope' });
