import type { BrowserDocumentApi, DocumentApi } from 'superdoc/ui';

declare const doc: DocumentApi;
declare const browserDoc: BrowserDocumentApi;

// SD-4787: styles.getTheme() returns the document theme, its part status and diagnostics.
const input: Parameters<DocumentApi['styles']['getTheme']>[0] = {};
const result: ReturnType<DocumentApi['styles']['getTheme']> = doc.styles.getTheme(input);
doc.styles.getTheme();

const themeSource: 'document' | 'fallback' = result.theme.source;
const accent1: string = result.theme.colorScheme.accent1;
const background2: string | undefined = result.theme.colorSchemeMapping?.bg2;
const majorFont: string | undefined = result.theme.fontScheme?.major?.latin;
const themePart: 'present' | 'missing' | 'malformed' = result.sourceStatus.theme;
const settingsPart: 'present' | 'missing' | 'malformed' = result.sourceStatus.settings;
const diagnosticCode: string | undefined = result.diagnostics[0]?.code;
void [themeSource, accent1, background2, majorFont, themePart, settingsPart, diagnosticCode];

const browserResult: Awaited<ReturnType<BrowserDocumentApi['styles']['getTheme']>> = await browserDoc.styles.getTheme();
const browserThemeSource: 'document' | 'fallback' = browserResult.theme.source;
void browserThemeSource;

// @ts-expect-error styles.getTheme takes no options.
doc.styles.getTheme({ includeResolved: true });
