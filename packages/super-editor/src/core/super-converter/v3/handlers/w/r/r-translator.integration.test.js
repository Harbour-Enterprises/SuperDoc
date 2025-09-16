import { describe, it, expect } from 'vitest';
import { getTestDataByFileName } from '../../../../../../tests/helpers/helpers.js';
import { defaultNodeListHandler } from '../../../../v2/importer/docxImporter.js';
import { translator as r_translator } from './r-translator.js';

const isBoldVal = (raw) => {
  if (raw === undefined || raw === null) return true;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw !== 0;
  const v = String(raw).trim().toLowerCase();
  if (v === '0' || v === 'false' || v === 'off') return false;
  if (v === '1' || v === 'true' || v === 'on') return true;
  return true;
};

const relevantText = (t) =>
  typeof t === 'string' && (t.includes('Sample text') || t.includes("Omitted (bold)") || t.includes("val='off'") || t.includes("val='1'"));

describe('r-translator integration with w:b (marks-only import, bold inline)', async () => {
  const fileName = 'ooxml-bold-vals-demo.docx';
  const xmlMap = await getTestDataByFileName(fileName);
  const documentXml = xmlMap['word/document.xml'];
  const body = documentXml.elements[0].elements.find((el) => el.name === 'w:body');
  const paragraphs = body?.elements?.filter((n) => n.name === 'w:p') || [];

  it('encodes bold as a mark and excludes w:b from runProperties; decodes back to w:b', () => {
    const handler = defaultNodeListHandler();
    const runs = [];
    paragraphs.forEach((p) => {
      (p.elements || []).forEach((child) => {
        if (child.name !== 'w:r') return;
        const textEl = (child.elements || []).find((el) => el.name === 'w:t');
        const rawText = textEl?.elements?.find((e) => e.type === 'text')?.text;
        if (!relevantText(rawText)) return;
        const rPr = (child.elements || []).find((el) => el.name === 'w:rPr');
        const wB = rPr?.elements?.find((el) => el.name === 'w:b');
        const boldExpected = wB ? isBoldVal(wB.attributes?.['w:val']) : false;
        runs.push({ node: child, boldExpected, text: rawText });
      });
    });

    expect(runs.length).toBeGreaterThan(0);

    runs.forEach(({ node, boldExpected }) => {
      const encoded = r_translator.encode({ nodes: [node], nodeListHandler: handler, docx: xmlMap });
      expect(encoded).toBeTruthy();
      // Encoded output is a text node with marks
      const marks = encoded.marks || [];
      const hasRun = marks.some((m) => m.type === 'run');
      expect(hasRun).toBe(true);

      const hasBold = marks.some((m) => m.type === 'bold');
      expect(hasBold).toBe(boldExpected);

      // runProperties should not contain w:b (we store only non-bold rPr entries)
      const runMark = marks.find((m) => m.type === 'run');
      const runProps = Array.isArray(runMark?.attrs?.runProperties) ? runMark.attrs.runProperties : [];
      const hasWBInRunProps = runProps.some((e) => e.xmlName === 'w:b');
      expect(hasWBInRunProps).toBe(false);

      // Now decode and ensure w:b appears only when expected
      const decoded = r_translator.decode({ node: encoded });
      const runNode = decoded?.name === 'w:r' ? decoded : (decoded?.elements || []).find((el) => el.name === 'w:r');
      expect(runNode).toBeTruthy();
      const rPrOut = runNode.elements?.find((el) => el.name === 'w:rPr');
      const wBOut = rPrOut?.elements?.find((el) => el.name === 'w:b');
      if (boldExpected) expect(wBOut).toBeTruthy();
      else expect(wBOut).toBeUndefined();
    });
  });
});

