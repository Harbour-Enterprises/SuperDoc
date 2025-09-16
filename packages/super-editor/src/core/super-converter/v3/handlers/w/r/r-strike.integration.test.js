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

describe('r-translator strike import (inline w:strike vs rStyle)', async () => {
  const fileName = 'ooxml-strike-rstyle-linked-combos-demo.docx';
  const xmlMap = await getTestDataByFileName(fileName);
  const documentXml = xmlMap['word/document.xml'];
  const body = documentXml.elements[0].elements.find((el) => el.name === 'w:body');
  const paragraphs = body?.elements?.filter((n) => n.name === 'w:p') || [];

  it('applies strike marks for inline w:strike (on) and leaves rStyle-only to decorations', () => {
    const handler = defaultNodeListHandler();
    const runs = [];
    paragraphs.forEach((p) => {
      (p.elements || []).forEach((child) => {
        if (child.name !== 'w:r') return;
        const rPr = find(child, 'w:rPr');
        const wStrike = find(rPr, 'w:strike');
        const rStyle = find(rPr, 'w:rStyle');
        const textEl = find(child, 'w:t');
        const text = textEl?.elements?.find((e) => e.type === 'text')?.text || '';
        runs.push({ node: child, wStrike, rStyle, text });
      });
    });

    runs.forEach(({ node, wStrike, rStyle }) => {
      const encoded = r_translator.encode({ nodes: [node], nodeListHandler: handler, docx: xmlMap });
      if (!encoded) return;
      const marks = encoded.marks || [];
      const strike = marks.find((m) => m.type === 'strike');

      if (wStrike) {
        const on = stOnOff(wStrike.attributes?.['w:val']);
        if (on) expect(!!strike).toBe(true);
        else expect(!!strike).toBe(false);
      } else if (rStyle) {
        // No inline strike: do not inject strike mark; decorations handle style
        expect(!!strike).toBe(false);
      }
    });
  });
});
