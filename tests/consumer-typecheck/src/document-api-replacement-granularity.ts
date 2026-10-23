import type { DocumentApi, BrowserDocumentApi } from 'superdoc/ui';

declare const doc: DocumentApi;
declare const browserDoc: BrowserDocumentApi;
const target = {
  kind: 'selection',
  start: { kind: 'text', blockId: 'clause', offset: 0 },
  end: { kind: 'text', blockId: 'clause', offset: 40 },
} as const;

const receipt = doc.replace(
  { target, text: 'Revised sentence.', replacementGranularity: 'range' },
  { changeMode: 'tracked' },
);
const success: boolean = receipt.success;
void success;

browserDoc.mutations.beginTemporary({
  tag: 'phrase-preview',
  operations: [
    {
      operation: 'replace',
      input: { target, text: 'Revised wording.', replacementGranularity: 'phrase' },
      options: { changeMode: 'tracked' },
    },
  ],
});

// @ts-expect-error Granularity is an explicit enumeration.
doc.replace({ target, text: 'Revised wording.', replacementGranularity: 'character' }, { changeMode: 'tracked' });
