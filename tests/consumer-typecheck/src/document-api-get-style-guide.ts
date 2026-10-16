import type { BrowserDocumentApi, DocumentApi } from 'superdoc/ui';

declare const doc: DocumentApi;
declare const browserDoc: BrowserDocumentApi;

// SD-4786: doc.get() carries the document's style guide and diagnostics.
const input: Parameters<DocumentApi['get']>[0] = { options: { includeResolved: true, includeProvenance: true } };
const document: ReturnType<DocumentApi['get']> = doc.get(input);

const themeSource: 'document' | 'fallback' | undefined = document.theme?.source;
const accent1: string | undefined = document.theme?.colorScheme.accent1;
const background2: string | undefined = document.theme?.colorSchemeMapping?.bg2;
const majorFont: string | undefined = document.theme?.fontScheme?.major?.latin;
void [themeSource, accent1, background2, majorFont];

const heading1 = document.styles?.paragraph?.['Heading1'];
const headingFontRef: string | undefined = heading1?.runProps?.fonts?.asciiTheme;
const headingFontFamily: string | undefined = heading1?.resolvedRun?.fontFamily;
const headingSizeSource: string | undefined = heading1?.runProvenance?.fontSize?.source;
void [headingFontRef, headingFontFamily, headingSizeSource];

const table = document.styles?.table?.['LighthouseTable'];
const topBorderWidth: number | undefined = table?.props?.borders?.top?.width;
const headerRowRepeats: boolean | undefined = table?.conditional?.firstRow?.row?.repeatHeader;
const bandShading = table?.conditional?.band1Horz?.cell?.shading;
const rowBandSize: number | undefined = table?.rowBandSize;
void [topBorderWidth, headerRowRepeats, bandShading, rowBandSize];

// Style-guide borders are structured without changing existing document table border inputs.
type DocumentTable = Extract<(typeof document.body)[number], { kind: 'table' }>;
const existingTableProps: NonNullable<DocumentTable['table']['props']> = {
  borders: { top: 'single 1pt #000000', insideH: 'none' },
};
void existingTableProps;

const defaultFontSize: number | undefined = document.docDefaults?.run?.fontSize;
const resolvedDefaultFont: string | undefined = document.docDefaults?.resolvedRun?.fontFamily;
const diagnosticCode: string | undefined = document.diagnostics?.[0]?.code;
void [defaultFontSize, resolvedDefaultFont, diagnosticCode];

const browserDocument: Awaited<ReturnType<BrowserDocumentApi['get']>> = await browserDoc.get(input);
const browserThemeSource: 'document' | 'fallback' | undefined = browserDocument.theme?.source;
void browserThemeSource;

// @ts-expect-error A theme source is either the document's own theme or the labeled fallback.
const invalidSource: NonNullable<typeof document.theme>['source'] = 'office';
void invalidSource;
