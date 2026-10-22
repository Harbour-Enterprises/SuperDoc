import type { BrowserDocumentApi, DocumentApi } from 'superdoc/ui';

declare const doc: DocumentApi;
declare const browserDoc: BrowserDocumentApi;

const target = {
  kind: 'selection',
  start: { kind: 'text', blockId: 'A1', offset: 0 },
  end: { kind: 'text', blockId: 'A1', offset: 4 },
} as const;

async function readFormatting(): Promise<void> {
  const read = await doc.format.readSelection({ target, keys: ['bold', 'fontSize', 'rFonts'], view: 'direct' });
  const collapsed: boolean = read.collapsed;
  const pendingApplied: boolean | undefined = read.pendingApplied;
  const fontSize = read.properties.fontSize;
  if (fontSize?.state === 'uniform') {
    // Uniform values use the format.apply value shape and can be written back.
    const size: number | null | undefined = fontSize.value;
    doc.format.apply({ target, inline: { fontSize: size } });
  }
  const fonts = read.properties.rFonts;
  if (fonts?.state === 'mixed') {
    const eastAsia = fonts.slots?.['eastAsia'];
    void eastAsia?.state;
  }
  const bold = read.properties.bold;
  if (bold?.state === 'unresolvable') {
    const reason: string = bold.reason;
    void reason;
  }
  void [collapsed, pendingApplied];

  const byRef = await doc.format.readSelection({ ref: 'text:abc' });
  void byRef.properties;
}
void readFormatting;

const browserInput: Parameters<BrowserDocumentApi['format']['readSelection']>[0] = {
  selection: 'current',
  keys: ['bold'],
};
void [browserDoc, browserInput];

// @ts-expect-error keys must be format.apply property names.
void doc.format.readSelection({ target, keys: ['notAProperty'] });

// @ts-expect-error view is 'effective' or 'direct'.
void doc.format.readSelection({ target, view: 'computed' });
