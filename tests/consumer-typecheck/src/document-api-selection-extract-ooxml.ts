import type { BrowserDocumentApi, DocumentApi } from 'superdoc/ui';

declare const doc: DocumentApi;
declare const browserDoc: BrowserDocumentApi;

const capture = doc.selection.extractOoxml({
  at: {
    kind: 'selection',
    start: { kind: 'text', blockId: 'A1', offset: 0 },
    end: { kind: 'text', blockId: 'A1', offset: 4 },
  },
});

const placement: 'inline' | 'blocks' | 'table' = capture.fragment.placement;
const formatVersion: 1 = capture.formatVersion;
const xml: string = capture.fragment.xml;
const namespaceUri: string = capture.fragment.namespaces['w'];
const revision: string = capture.evaluatedRevision;
const sourcePart: string = capture.source.partUri;
const context: string[] = capture.context.xml;
const dependencies = capture.dependencies.map((dependency) => dependency.target);
void [formatVersion, placement, xml, namespaceUri, revision, sourcePart, context, dependencies];

const tableCapture = doc.selection.extractOoxml({
  at: {
    kind: 'tableCells',
    tableId: 'table-1',
    start: { rowIndex: 0, columnIndex: 0 },
    end: { rowIndex: 1, columnIndex: 1 },
  },
});
void tableCapture.fragment;

const browserInput: Parameters<BrowserDocumentApi['selection']['extractOoxml']>[0] = {
  selection: 'current',
};
const browserCapture: Awaited<ReturnType<BrowserDocumentApi['selection']['extractOoxml']>> = {} as Awaited<
  ReturnType<BrowserDocumentApi['selection']['extractOoxml']>
>;
const browserXml: string = browserCapture.fragment.xml;
void [browserDoc, browserInput, browserXml];

// @ts-expect-error A text address is not a selection envelope.
doc.selection.extractOoxml({ at: { kind: 'text' } });

// @ts-expect-error A document-wide revision is not an extraction precondition.
doc.selection.extractOoxml({ at: capture.at, expectedRevision: revision });

const selectionReadInput: Parameters<BrowserDocumentApi['selection']['current']>[0] = { includeText: true };
const rangeDecisionSupported: boolean | undefined = (
  {} as Awaited<ReturnType<BrowserDocumentApi['selection']['current']>>
).trackedChangeRangeDecisionSupported;
const changesWhollySelected: boolean | undefined = (
  {} as Awaited<ReturnType<BrowserDocumentApi['selection']['current']>>
).trackedChangesWhollySelected;
void [selectionReadInput, rangeDecisionSupported, changesWhollySelected];
