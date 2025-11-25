import { describe, it, expect } from 'vitest';
import { getTestDataByFileName } from '../../../../../../tests/helpers/helpers.js';
import { defaultNodeListHandler } from '../../../../v2/importer/docxImporter.js';
import { collectRunProperties, collectStyleMarks, mergeTextStyleAttrs } from './helpers/helpers.js';
import { splitRunProperties } from './helpers/split-run-properties.js';
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
  typeof t === 'string' &&
  (t.includes('Sample text') || t.includes('Omitted (bold)') || t.includes("val='off'") || t.includes("val='1'"));

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
      expect(encoded?.type).toBe('run');

      const textChild = encoded.content?.find((child) => child?.type === 'text');
      expect(textChild).toBeTruthy();

      const marks = textChild?.marks || [];
      const hasBold = marks.some((m) => m.type === 'bold');
      expect(hasBold).toBe(boldExpected);

      // runProperties should not contain w:b (we store only non-bold rPr entries)
      const runProps = Array.isArray(encoded.attrs?.runProperties) ? encoded.attrs.runProperties : [];
      const hasWBInRunProps = runProps.some((e) => e.xmlName === 'w:b');
      expect(hasWBInRunProps).toBe(false);

      // Now decode and ensure w:b appears only when expected
      const decoded = r_translator.decode({ node: encoded });
      expect(decoded?.name).toBe('w:r');
      const rPrOut = decoded.elements?.find((el) => el.name === 'w:rPr');
      const wBOut = rPrOut?.elements?.find((el) => el.name === 'w:b');
      if (boldExpected) expect(wBOut).toBeTruthy();
      else expect(wBOut).toBeUndefined();
    });
  });
});

describe('r-translator prefers paragraph latin font over eastAsia run overrides', async () => {
  const fileName = 'heading-font.docx';
  const xmlMap = await getTestDataByFileName(fileName);
  const documentXml = xmlMap['word/document.xml'];
  const body = documentXml.elements[0].elements.find((el) => el.name === 'w:body');
  const paragraphs = body?.elements?.filter((n) => n.name === 'w:p') || [];

  const targetRun = (() => {
    for (const p of paragraphs) {
      const runs = p.elements?.filter((el) => el.name === 'w:r') || [];
      for (const run of runs) {
        const textNode = run.elements?.find((el) => el.name === 'w:t');
        const textContent = textNode?.elements?.find((el) => el.type === 'text')?.text?.trim();
        if (textContent === 'CONFIDENTIALITY AND NON-DISCLOSURE AGREEMENT') return run;
      }
    }
    return null;
  })();

  it('encodes Helvetica for latin heading text even when w:eastAsia is Times New Roman', () => {
    expect(targetRun).toBeTruthy();

    const handler = defaultNodeListHandler();
    const styleMarks = collectStyleMarks('Heading1', xmlMap);
    expect(styleMarks.textStyleAttrs?.fontFamily).toBe('Helvetica, sans-serif');

    const rPrNode = targetRun.elements?.find((el) => el.name === 'w:rPr');
    const { entries } = collectRunProperties({ nodes: [targetRun], docx: xmlMap }, rPrNode);
    const { textStyleAttrs, runStyleId } = splitRunProperties(entries, xmlMap);
    expect(textStyleAttrs).toEqual({ eastAsiaFontFamily: 'Times New Roman, serif' });

    const mergedTextStyleAttrs = mergeTextStyleAttrs(styleMarks.textStyleAttrs, textStyleAttrs);
    expect(mergedTextStyleAttrs).toEqual({
      fontSize: '24pt',
      fontFamily: 'Helvetica, sans-serif',
      eastAsiaFontFamily: 'Times New Roman, serif',
    });
    expect(runStyleId).toBe('Strong');

    const encoded = r_translator.encode({
      nodes: [targetRun],
      nodeListHandler: handler,
      docx: xmlMap,
      parentStyleId: 'Heading1',
    });

    expect(encoded?.type).toBe('run');

    const textChild = encoded.content?.find((child) => child?.type === 'text');
    expect(textChild).toBeTruthy();

    const textStyle = textChild?.marks?.find((mark) => mark.type === 'textStyle');
    expect(textStyle?.attrs?.fontFamily).toBe('Helvetica, sans-serif');
    expect(textStyle?.attrs?.styleId).toBe('Strong');

    const runProps = Array.isArray(encoded.attrs?.runProperties) ? encoded.attrs.runProperties : [];
    const hasRunFontEntries = runProps.some((entry) => entry?.xmlName === 'w:rFonts');
    expect(hasRunFontEntries).toBe(false);

    const decoded = r_translator.decode({ node: encoded });
    expect(decoded?.name).toBe('w:r');
    const rPrOut = decoded.elements?.find((el) => el.name === 'w:rPr');
    const rFontsOut = rPrOut?.elements?.find((el) => el.name === 'w:rFonts');
    expect(rFontsOut).toBeTruthy();
    expect(rFontsOut.attributes?.['w:ascii']).toBe('Helvetica');
    expect(rFontsOut.attributes?.['w:eastAsia']).toBe('Helvetica');
  });
});
