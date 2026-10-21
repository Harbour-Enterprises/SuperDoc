import type { BrowserDocumentApi, DocumentApi } from 'superdoc/ui';
type PasteFragment = NonNullable<Parameters<DocumentApi['clipboard']['insert']>[0]['fragment']>;
type PasteParagraph = Extract<PasteFragment['blocks'][number], { kind: 'paragraph' }>;
type SDPasteBlockSdt = NonNullable<PasteParagraph['blockSdts']>[number];
type SDPasteInline = NonNullable<PasteParagraph['inlines']>[number];

const blockControl: SDPasteBlockSdt = { sourceId: '1', controlType: 'richText', tag: 'section', lockMode: 'sdtLocked' };
const inlineControl: SDPasteInline = {
  kind: 'sdt',
  controlType: 'text',
  tag: 'answer',
  multiline: true,
  inlines: [{ kind: 'text', text: 'value' }],
};
const blockControlId: string = blockControl.sourceId;
const inlineControlChildren: readonly SDPasteInline[] | undefined =
  inlineControl.kind === 'sdt' ? inlineControl.inlines : undefined;
const copiedControlField = (copy: ReturnType<DocumentApi['clipboard']['serializeSelection']>) => {
  const block = copy.plan.fragment.blocks[0];
  if (block?.kind === 'paragraph') {
    const lockMode: SDPasteBlockSdt['lockMode'] = block.blockSdts?.[0]?.lockMode;
    const firstInline = block.inlines?.[0];
    const multiline: boolean | undefined = firstInline?.kind === 'sdt' ? firstInline.multiline : undefined;
    void [lockMode, multiline];
  }
};
void [blockControlId, inlineControlChildren, copiedControlField];

declare const doc: DocumentApi;
declare const browserDoc: BrowserDocumentApi;

const compactHtml: string = doc.getHtml({});
const compactMarkdown: string = doc.getMarkdown({});
const invokedCompactHtml: string = doc.invoke({ operationId: 'getHtml', input: {} });
const invokedCompactMarkdown: string = doc.invoke({ operationId: 'getMarkdown', input: {} });
void [compactHtml, compactMarkdown, invokedCompactHtml, invokedCompactMarkdown];

const selection = {
  kind: 'selection' as const,
  start: { kind: 'text' as const, blockId: 'paragraph-1', offset: 0 },
  end: { kind: 'text' as const, blockId: 'paragraph-1', offset: 4 },
};
const paragraph = {
  kind: 'block' as const,
  nodeType: 'paragraph' as const,
  nodeId: 'paragraph-1',
};
const fragment = {
  kind: 'paragraph' as const,
  paragraph: {
    inlines: [{ kind: 'run' as const, run: { text: 'Canonical content' } }],
  },
};

// Parameter and return proofs for the synchronous public Document API.
const htmlInput: Parameters<DocumentApi['htmlToFragment']>[0] = { html: '<p>Canonical content</p>' };
const markdownInput: Parameters<DocumentApi['markdownToFragment']>[0] = { markdown: 'Canonical content' };
const htmlResult: ReturnType<DocumentApi['htmlToFragment']> = doc.htmlToFragment(htmlInput);
const wordHighlightResult: ReturnType<DocumentApi['htmlToFragment']> = doc.htmlToFragment({
  html: '<span style="background:silver;mso-highlight:silver">Word highlight</span>',
});
const namedHighlightFragment: ReturnType<DocumentApi['htmlToFragment']>['fragment'] = {
  kind: 'paragraph',
  paragraph: { inlines: [{ kind: 'run', run: { text: 'Word highlight', props: { highlight: 'lightGray' } } }] },
};
const namedHighlightInsert: ReturnType<DocumentApi['insert']> = doc.insert({ content: namedHighlightFragment });
void [wordHighlightResult, namedHighlightInsert];
const markdownResult: ReturnType<DocumentApi['markdownToFragment']> = doc.markdownToFragment(markdownInput);

const mutationInput: Parameters<DocumentApi['mutations']['apply']>[0] = {
  atomic: true,
  changeMode: 'direct',
  steps: [
    {
      id: 'rewrite-selection',
      op: 'text.rewrite',
      where: { by: 'target', target: selection },
      args: { replacement: { text: 'Updated content' } },
    },
  ],
};
const mutationResult: ReturnType<DocumentApi['mutations']['apply']> = doc.mutations.apply(mutationInput);
const inspectMutationResult = async () => {
  const result = await mutationResult;
  const invalidatedRefs = result.invalidatedRefs;
  const planMode: 'direct' | 'tracked' | undefined = result.appliedChangeMode;
  const stepMode: 'direct' | 'tracked' | undefined = result.steps[0]?.appliedChangeMode;
  void [invalidatedRefs, planMode, stepMode];
};
void inspectMutationResult;

for (const diagnostic of htmlResult.diagnostics) {
  const format: 'html' | 'markdown' = diagnostic.source.format;
  const disposition: 'preserved' | 'normalized' | 'downgraded' | 'dropped' | 'rejected' = diagnostic.disposition;
  const construct: string = diagnostic.construct;
  void [format, disposition, construct, diagnostic.source.range, diagnostic.path];
}
for (const diagnostic of markdownResult.diagnostics) {
  const baseCode: string = diagnostic.code;
  const baseSeverity: 'info' | 'warning' | 'error' = diagnostic.severity;
  void [baseCode, baseSeverity, diagnostic.message];
}

const richInsert = doc.insert(
  { type: 'html', value: '<p>Tracked insertion</p>', target: paragraph, placement: 'after' },
  { changeMode: 'tracked' },
);
const markdownInsert = doc.insert(
  { type: 'markdown', value: '**At the caret**', target: selection },
  { changeMode: 'direct' },
);
const fragmentInsert = doc.insert({ content: fragment, target: paragraph, placement: 'before' });
const appendInsert = doc.insert({ type: 'html', value: '<p>Append</p>' });

const richReplace = doc.replace(
  { type: 'markdown', value: '**Replacement**', target: selection, nestingPolicy: { tables: 'forbid' } },
  { changeMode: 'tracked' },
);
const fragmentReplace = doc.replace({ content: fragment, target: paragraph });
const refReplace = doc.replace({ type: 'html', value: '<p>Ref replacement</p>', ref: 'v2-text:opaque' });

// Every phase-1 result shape exposes the effective mode without requiring it.
const modeOf = (result: { appliedChangeMode?: 'direct' | 'tracked' }) => result.appliedChangeMode;
const deleteReceipt = doc.delete({ target: selection });
const formatReceipt = doc.format.apply({ target: selection, inline: { bold: true } });
const clearReceipt = doc.clearContent({});
const clipboardReceipt = doc.clipboard.insert({
  payload: { source: 'api', items: [{ type: 'text/plain', kind: 'string', data: 'text' }] },
});
const paragraphReceipt = doc.create.paragraph({});
const headingReceipt = doc.create.heading({ level: 1 });
const splitReceipt = doc.blocks.split({ target: paragraph, offset: 1 });
const mergeReceipt = doc.blocks.merge({ first: paragraph, second: paragraph });
const moveReceipt = doc.blocks.move({ source: paragraph, destination: paragraph, placement: 'after' });
void [
  modeOf(richInsert),
  modeOf(richReplace),
  modeOf(doc.blocks.delete({ target: paragraph })),
  modeOf(doc.blocks.deleteRange({ start: paragraph, end: paragraph })),
  deleteReceipt.success && modeOf(deleteReceipt),
  formatReceipt.success && modeOf(formatReceipt),
  clearReceipt.success && modeOf(clearReceipt),
  clipboardReceipt.success && modeOf(clipboardReceipt),
  paragraphReceipt.success && modeOf(paragraphReceipt),
  headingReceipt.success && modeOf(headingReceipt),
  splitReceipt.success && modeOf(splitReceipt),
  mergeReceipt.success && modeOf(mergeReceipt),
  moveReceipt.success && modeOf(moveReceipt),
];

const invokedHtml: ReturnType<DocumentApi['invoke']> = doc.invoke({
  operationId: 'htmlToFragment',
  input: htmlInput,
});
const invokedTrackedInsert: ReturnType<DocumentApi['invoke']> = doc.invoke({
  operationId: 'insert',
  input: { type: 'markdown', value: 'Invoked' },
  options: { changeMode: 'tracked' },
});

// A parsed rich clipboard fragment is a reusable transport value, including
// every block and inline shape emitted by the shared HTML converter.
const parsedClipboard = doc.clipboard.parse({
  source: 'api',
  items: [
    { type: 'text/html', kind: 'string', data: '<h2>Title</h2><p><a href="https://example.com">Link</a><br></p><hr>' },
  ],
});
if (parsedClipboard.success) {
  doc.clipboard.insert({ fragment: parsedClipboard.plan.fragment });
  for (const block of parsedClipboard.plan.fragment.blocks) {
    if (block.kind === 'heading') {
      const level: 1 | 2 | 3 | 4 | 5 | 6 = block.level;
      void level;
    } else if (block.kind === 'horizontalRule') {
      void block.sourcePath;
    } else if (block.kind === 'paragraph') {
      for (const run of block.runs) {
        const commentIds: readonly string[] | undefined = run.commentIds;
        const trackedInsertion: boolean | undefined = run.trackedInsertion;
        const complexScriptMarks: [boolean | undefined, boolean | undefined, number | undefined] = [
          run.marks?.boldCs,
          run.marks?.italicCs,
          run.marks?.fontSizeCsPt,
        ];
        const textTransformMarks: [boolean | undefined, boolean | undefined] = [run.marks?.caps, run.marks?.smallCaps];
        void [commentIds, trackedInsertion, complexScriptMarks, textTransformMarks];
      }
      for (const inline of block.inlines ?? []) {
        if (inline.kind === 'hyperlink') void inline.target;
        if (inline.kind === 'lineBreak') void inline.sourcePath;
        if (inline.kind === 'text') {
          const commentIds: readonly string[] | undefined = inline.commentIds;
          const trackedInsertion: boolean | undefined = inline.trackedInsertion;
          void [commentIds, trackedInsertion];
        }
      }
    }
  }
  const comments: typeof parsedClipboard.plan.fragment.comments = parsedClipboard.plan.fragment.comments;
  void comments;
}

for (const receipt of [
  richInsert,
  markdownInsert,
  fragmentInsert,
  appendInsert,
  richReplace,
  fragmentReplace,
  refReplace,
]) {
  if (!receipt.success) {
    const failureCode: string | undefined = receipt.failure?.code;
    void [failureCode, receipt.conversion?.diagnostics];
    continue;
  }
  const txId: string | undefined = receipt.txId;
  const entityId: string | undefined = receipt.inserted?.[0]?.entityId;
  const sourcePath: ReadonlyArray<string | number> | undefined =
    receipt.effects?.insertedBlocks?.[0]?.sourcePath ?? receipt.effects?.insertedText?.[0]?.sourcePath;
  const conversionFormat: 'html' | 'markdown' | undefined = receipt.conversion?.format;
  void [txId, entityId, sourcePath, conversionFormat, receipt.affectedStories, receipt.textRangeShifts];
}

// BrowserDocumentApi recursively maps the same calls and result shapes to MaybePromise leaves.
const browserHtml: ReturnType<BrowserDocumentApi['htmlToFragment']> = browserDoc.htmlToFragment(htmlInput);
const browserMarkdown: ReturnType<BrowserDocumentApi['markdownToFragment']> =
  browserDoc.markdownToFragment(markdownInput);
const browserInsert: ReturnType<BrowserDocumentApi['insert']> = browserDoc.insert(
  { type: 'html', value: '<p>Browser</p>' },
  { changeMode: 'tracked' },
);
const browserReplace: ReturnType<BrowserDocumentApi['replace']> = browserDoc.replace(
  { type: 'markdown', value: 'Browser replacement', target: selection },
  { dryRun: true },
);
const browserInvoke: ReturnType<BrowserDocumentApi['invoke']> = browserDoc.invoke({
  operationId: 'htmlToFragment',
  input: htmlInput,
});
const browserHtmlPromise: Promise<Awaited<ReturnType<DocumentApi['htmlToFragment']>>> = Promise.resolve(browserHtml);
const browserInsertPromise: Promise<Awaited<ReturnType<DocumentApi['insert']>>> = Promise.resolve(browserInsert);

// Existing plain-text and named Markdown calls remain source-compatible.
const oldInsert = doc.insert({ value: 'Plain text' });
const oldReplace = doc.replace({ target: selection, text: 'Plain replacement' });
const oldMarkdown = doc.markdownToFragment({ markdown: '# Existing call' });

void [
  invokedHtml,
  invokedTrackedInsert,
  browserHtml,
  browserMarkdown,
  browserInsert,
  browserReplace,
  browserInvoke,
  browserHtmlPromise,
  browserInsertPromise,
  oldInsert,
  oldReplace,
  oldMarkdown,
  parsedClipboard,
];

const alignmentResult = doc.format.paragraph.setAlignment(
  { target: paragraph, alignment: 'center' },
  { changeMode: 'tracked' },
);
if (alignmentResult.success) {
  const alignmentMode: 'direct' | 'tracked' | undefined = alignmentResult.appliedChangeMode;
  // Existing callers can still construct a successful result without the additive field.
  const oldAlignmentResult: typeof alignmentResult = {
    success: true,
    target: paragraph,
    resolution: { target: paragraph },
  };
  void [alignmentMode, oldAlignmentResult];
}

const sectionTarget = { kind: 'section', sectionId: 'section-1' } as const;
const sectionResult = doc.sections.setPageMargins({ target: sectionTarget, top: 1.5 }, { changeMode: 'tracked' });
if (sectionResult.success) {
  const sectionMode: 'direct' | 'tracked' | undefined = sectionResult.appliedChangeMode;
  const oldSectionResult: typeof sectionResult = { success: true, section: sectionTarget };
  void [sectionMode, oldSectionResult];
}

const hyperlinkReceipt = doc.hyperlinks.insert(
  { text: 'Link', link: { destination: { href: 'https://example.com' } } },
  { changeMode: 'tracked' },
);
if (hyperlinkReceipt.success) {
  const hyperlinkMode: 'direct' | 'tracked' | undefined = hyperlinkReceipt.appliedChangeMode;
  void hyperlinkMode;
}

// Every success-family interface supports additive mode reads through emitted public declarations.
type SuccessMode<T> = 'appliedChangeMode' extends keyof Extract<Awaited<T>, { success: true }> ? true : false;
const additionalModeTypes: [
  SuccessMode<ReturnType<DocumentApi['bookmarks']['insert']>>,
  SuccessMode<ReturnType<DocumentApi['fields']['insert']>>,
  SuccessMode<ReturnType<DocumentApi['footnotes']['insert']>>,
  SuccessMode<ReturnType<DocumentApi['lists']['create']>>,
  SuccessMode<ReturnType<DocumentApi['create']['table']>>,
  SuccessMode<ReturnType<DocumentApi['create']['image']>>,
  SuccessMode<ReturnType<DocumentApi['create']['contentControl']>>,
  SuccessMode<ReturnType<DocumentApi['create']['tableOfContents']>>,
  SuccessMode<ReturnType<DocumentApi['index']['insert']>>,
  SuccessMode<ReturnType<DocumentApi['authorities']['insert']>>,
  SuccessMode<ReturnType<DocumentApi['crossRefs']['insert']>>,
  SuccessMode<ReturnType<DocumentApi['captions']['insert']>>,
  SuccessMode<ReturnType<DocumentApi['citations']['insert']>>,
  SuccessMode<ReturnType<DocumentApi['citations']['bibliography']['insert']>>,
] = [true, true, true, true, true, true, true, true, true, true, true, true, true, true];
void additionalModeTypes;

// A row covered entirely by a vertical merge has no new source cells.
const verticallyMergedFragment: Parameters<DocumentApi['insert']>[0] = {
  target: paragraph,
  content: {
    kind: 'table',
    table: { rows: [{ cells: [{ rowSpan: 2, colSpan: 2, content: [fragment] }] }, { cells: [] }] },
  },
};
const verticallyMergedReceipt: ReturnType<DocumentApi['insert']> = doc.insert(verticallyMergedFragment);
void verticallyMergedReceipt;
