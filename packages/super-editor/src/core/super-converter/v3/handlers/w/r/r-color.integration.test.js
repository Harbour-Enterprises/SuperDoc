import { describe, it, expect } from 'vitest';
import { getTestDataByFileName } from '../../../../../../tests/helpers/helpers.js';
import { defaultNodeListHandler } from '../../../../v2/importer/docxImporter.js';
import { translator as r_translator } from './r-translator.js';

const find = (el, name) => (el?.elements || []).find((e) => e.name === name);

describe('r-translator color import (inline w:color vs rStyle)', async () => {
  const fileName = 'ooxml-color-rstyle-linked-combos-demo.docx';
  const xmlMap = await getTestDataByFileName(fileName);
  const documentXml = xmlMap['word/document.xml'];
  const body = documentXml.elements[0].elements.find((el) => el.name === 'w:body');
  const paragraphs = body?.elements?.filter((n) => n.name === 'w:p') || [];

  it('applies textStyle color for inline w:color and leaves rStyle-only to decorations', () => {
    const handler = defaultNodeListHandler();
    const runs = [];
    paragraphs.forEach((p) => {
      (p.elements || []).forEach((child) => {
        if (child.name !== 'w:r') return;
        const rPr = find(child, 'w:rPr');
        const wColor = find(rPr, 'w:color');
        const rStyle = find(rPr, 'w:rStyle');
        const textEl = find(child, 'w:t');
        const text = textEl?.elements?.find((e) => e.type === 'text')?.text || '';
        runs.push({ node: child, wColor, rStyle, text });
      });
    });

    runs.forEach(({ node, wColor, rStyle }) => {
      const encoded = r_translator.encode({ nodes: [node], nodeListHandler: handler, docx: xmlMap });
      if (!encoded) return;
      const marks = encoded.marks || [];
      const ts = marks.find((m) => m.type === 'textStyle');

      if (wColor) {
        const raw = wColor.attributes?.['w:val'];
        const hex = raw ? `#${String(raw).toUpperCase()}` : null;
        expect(ts?.attrs?.color).toBe(hex);
      } else if (rStyle) {
        // No inline color: do not inject textStyle color mark; decorations handle rStyle color
        expect(!ts || !ts.attrs?.color).toBe(true);
      }
    });
  });
});
