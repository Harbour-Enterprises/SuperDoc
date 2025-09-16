import { describe, it, expect } from 'vitest';
import { getTestDataByFileName } from '../../../../../../tests/helpers/helpers.js';
import { defaultNodeListHandler } from '../../../../v2/importer/docxImporter.js';
import { translator as r_translator } from './r-translator.js';

const find = (el, name) => (el?.elements || []).find((e) => e.name === name);

describe('r-translator underline import (inline w:u vs rStyle)', async () => {
  const fileName = 'ooxml-underline-rstyle-linked-combos-demo.docx';
  const xmlMap = await getTestDataByFileName(fileName);
  const documentXml = xmlMap['word/document.xml'];
  const body = documentXml.elements[0].elements.find((el) => el.name === 'w:body');
  const paragraphs = body?.elements?.filter((n) => n.name === 'w:p') || [];

  it('applies underline marks for inline w:u and leaves rStyle-only to decorations', () => {
    const handler = defaultNodeListHandler();
    const runs = [];
    paragraphs.forEach((p) => {
      (p.elements || []).forEach((child) => {
        if (child.name !== 'w:r') return;
        const rPr = find(child, 'w:rPr');
        const wU = find(rPr, 'w:u');
        const rStyle = find(rPr, 'w:rStyle');
        const textEl = find(child, 'w:t');
        const text = textEl?.elements?.find((e) => e.type === 'text')?.text || '';
        runs.push({ node: child, wU, rStyle, text });
      });
    });

    runs.forEach(({ node, wU, rStyle }) => {
      const encoded = r_translator.encode({ nodes: [node], nodeListHandler: handler, docx: xmlMap });
      if (!encoded) return;
      const marks = encoded.marks || [];
      const underlineMarks = marks.filter((m) => m.type === 'underline');

      if (wU) {
        const raw = wU.attributes?.['w:val'];
        const val = raw == null || raw === '' ? 'single' : String(raw);
        if (val.toLowerCase() === 'none' || val === '0') {
          expect(underlineMarks.some((m) => m.attrs?.underlineType === 'none')).toBe(true);
        } else {
          expect(underlineMarks.some((m) => m.attrs?.underlineType === val)).toBe(true);
        }
      } else if (rStyle) {
        // No inline w:u: underline should NOT be injected as a mark; decorations handle style
        expect(underlineMarks.length === 0 || underlineMarks.every((m) => m.attrs?.underlineType === 'none')).toBe(
          true,
        );
      }
    });
  });
});
