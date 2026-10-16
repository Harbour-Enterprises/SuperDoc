import type { BrowserDocumentApi, DocumentApi } from 'superdoc/ui';

declare const doc: DocumentApi;
declare const browserDoc: BrowserDocumentApi;

// SD-4788: catalog previews say whether their font and color came from the theme.
const result: ReturnType<DocumentApi['styles']['getCatalog']> = doc.styles.getCatalog({ includePreview: true });
const preview = result.items[0]?.preview;

const fontSource = preview?.sources?.fontFamily;
if (fontSource?.origin === 'theme') {
  const themeFont: 'majorHAnsi' | 'minorHAnsi' | string = fontSource.themeFont;
  const fontFallback: true | undefined = fontSource.fallback;
  void [themeFont, fontFallback];
}

const colorSource = preview?.sources?.color;
if (colorSource?.origin === 'theme') {
  const themeColor: string = colorSource.themeColor;
  const tint: number | undefined = colorSource.tint;
  const shade: number | undefined = colorSource.shade;
  void [themeColor, tint, shade];
} else if (colorSource) {
  // @ts-expect-error a literal color has no theme reference.
  void colorSource.themeColor;
}

const themePart: 'present' | 'missing' | 'malformed' | undefined = result.sourceStatus.theme;
void themePart;

const browserResult: Awaited<ReturnType<BrowserDocumentApi['styles']['getCatalog']>> =
  await browserDoc.styles.getCatalog({
    includePreview: true,
  });
const browserOrigin: 'literal' | 'theme' | 'default' | undefined =
  browserResult.items[0]?.preview?.sources?.color?.origin;
void browserOrigin;
