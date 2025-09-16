import { describe, it, expect } from 'vitest';
import { getTestDataByFileName } from '../../../../../../tests/helpers/helpers.js';
import { defaultNodeListHandler } from '../../../../v2/importer/docxImporter.js';
import { translator as r_translator } from './r-translator.js';

const find = (el, name) => (el?.elements || []).find((e) => e.name === name);

describe('r-translator highlight import (inline w:highlight/w:shd vs rStyle)', async () => {
  const fileName = 'ooxml-highlight-rstyle-linked-combos-demo.docx';
  const xmlMap = await getTestDataByFileName(fileName);
  const documentXml = xmlMap['word/document.xml'];
  const body = documentXml.elements[0].elements.find((el) => el.name === 'w:body');
  const paragraphs = body?.elements?.filter((n) => n.name === 'w:p') || [];

  it('applies highlight marks for inline w:highlight/w:shd and leaves rStyle-only to decorations', () => {
    const handler = defaultNodeListHandler();
    const runs = [];
    paragraphs.forEach((p) => {
      (p.elements || []).forEach((child) => {
        if (child.name !== 'w:r') return;
        const rPr = find(child, 'w:rPr');
        const wHl = find(rPr, 'w:highlight');
        const wShd = find(rPr, 'w:shd');
        const rStyle = find(rPr, 'w:rStyle');
        const textEl = find(child, 'w:t');
        const text = textEl?.elements?.find((e) => e.type === 'text')?.text || '';
        runs.push({ node: child, wHl, wShd, rStyle, text });
      });
    });

    runs.forEach(({ node, wHl, wShd, rStyle }) => {
      const encoded = r_translator.encode({ nodes: [node], nodeListHandler: handler, docx: xmlMap });
      if (!encoded) return;
      const marks = encoded.marks || [];
      const hl = marks.find((m) => m.type === 'highlight');

      if (wHl || wShd) {
        expect(!!hl).toBe(true);
        expect(hl?.attrs?.color).toBeTruthy();
      } else if (rStyle) {
        expect(!!hl).toBe(false);
      }
    });
  });
});
