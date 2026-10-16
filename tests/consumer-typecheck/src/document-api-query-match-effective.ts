import type { BrowserDocumentApi, DocumentApi } from 'superdoc/ui';

declare const doc: DocumentApi;
declare const browserDoc: BrowserDocumentApi;

// SD-4789: query.match reports cascade-resolved values under `effective`, with their origin.
const result: ReturnType<DocumentApi['query']['match']> = doc.query.match({
  select: { type: 'text', pattern: 'Agreement' },
});
const resolved: boolean = result.meta.effectiveResolved;
const diagnosticCodes: string[] | undefined = result.meta.diagnostics?.map((d) => d.code);
void [resolved, diagnosticCodes];

const item = result.items[0];
if (item?.matchKind === 'text') {
  const effective = item.blocks[0]?.runs[0]?.styles.effective;
  const bold: boolean | undefined = effective?.bold;
  const fontFamily: string | undefined = effective?.fontFamily;
  const color: string | undefined = effective?.color;
  const fontSizePt: number | undefined = effective?.fontSizePt;
  const highlight: string | undefined = effective?.highlight;
  void [bold, fontFamily, color, fontSizePt, highlight];

  const colorSource = effective?.sources?.color;
  if (colorSource?.origin === 'theme') {
    const themeColor: string = colorSource.themeColor;
    const fallback: true | undefined = colorSource.fallback;
    void [themeColor, fallback];
  } else if (colorSource) {
    // @ts-expect-error a literal color has no theme reference.
    void colorSource.themeColor;
  }
}

const browserResult: Awaited<ReturnType<BrowserDocumentApi['query']['match']>> = await browserDoc.query.match({
  select: { type: 'text', pattern: 'Agreement' },
});
const browserResolved: boolean = browserResult.meta.effectiveResolved;
void browserResolved;
