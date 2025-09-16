import { describe, it, expect } from 'vitest';
import { getTestDataByFileName } from '../../../../../../tests/helpers/helpers.js';
import { defaultNodeListHandler } from '../../../../v2/importer/docxImporter.js';
import { translator as r_translator } from './r-translator.js';

const stOnOff = (raw) => {
  if (raw === undefined || raw === null) return true;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw !== 0;
  const v = String(raw).trim().toLowerCase();
  if (v === '0' || v === 'false' || v === 'off') return false;
  if (v === '1' || v === 'true' || v === 'on') return true;
  return true;
};

const find = (el, name) => (el?.elements || []).find((e) => e.name === name);

describe('r-translator italic import (inline w:i vs rStyle)', async () => {
  const fileName = 'ooxml-italic-rstyle-combos-demo.docx';
  const xmlMap = await getTestDataByFileName(fileName);
  const documentXml = xmlMap['word/document.xml'];
  const body = documentXml.elements[0].elements.find((el) => el.name === 'w:body');
  const paragraphs = body?.elements?.filter((n) => n.name === 'w:p') || [];

  it('applies italic marks for inline w:i (on/off) and leaves rStyle-only to decorations', () => {
    const handler = defaultNodeListHandler();
    const runs = [];
    paragraphs.forEach((p) => {
      (p.elements || []).forEach((child) => {
        if (child.name !== 'w:r') return;
        const rPr = find(child, 'w:rPr');
        const wI = find(rPr, 'w:i');
        const rStyle = find(rPr, 'w:rStyle');
        const textEl = find(child, 'w:t');
        const text = textEl?.elements?.find((e) => e.type === 'text')?.text || '';
        runs.push({ node: child, wI, rStyle, text });
      });
    });

    runs.forEach(({ node, wI, rStyle }) => {
      const encoded = r_translator.encode({ nodes: [node], nodeListHandler: handler, docx: xmlMap });
      if (!encoded) return;
      const marks = encoded.marks || [];
      const italicMarks = marks.filter((m) => m.type === 'italic');

      if (wI) {
        const val = stOnOff(wI.attributes?.['w:val']);
        if (val) {
          expect(italicMarks.some((m) => !m.attrs?.value)).toBe(true);
        } else {
          expect(italicMarks.some((m) => m.attrs?.value === '0')).toBe(true);
        }
      } else if (rStyle) {
        // No inline w:i: italic should NOT be injected as a mark; decorations will handle style
        expect(italicMarks.length === 0 || italicMarks.every((m) => m.attrs?.value === '0')).toBe(true);
      }
    });
  });
});
