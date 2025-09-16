import { describe, it, expect } from 'vitest';
import { getTestDataByFileName } from '../../../../../../tests/helpers/helpers.js';
import { translator as w_b_translator } from './b-translator.js';

// Helper: map raw w:val to expected boolean per OOXML conventions
const expectedFromRaw = (raw) => {
  if (raw === undefined || raw === null) return true; // presence without value => true
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw !== 0;
  const v = String(raw).trim().toLowerCase();
  if (v === '0' || v === 'false' || v === 'off') return false;
  if (v === '1' || v === 'true' || v === 'on') return true;
  // Unknown → treat as presence => true
  return true;
};

describe('w:b translator integration (import/export across all w:val forms)', async () => {
  const fileName = 'ooxml-bold-vals-demo.docx';
  const xmlMap = await getTestDataByFileName(fileName);
  const doc = xmlMap['word/document.xml'];
  const body = doc.elements[0].elements.find((el) => el.name === 'w:body');
  const paragraphs = body?.elements?.filter((n) => n.name === 'w:p') || [];

  // Collect all w:b occurrences in document order
  const boldNodes = [];
  paragraphs.forEach((p) => {
    (p.elements || []).forEach((child) => {
      if (child.name !== 'w:r') return;
      const rPr = (child.elements || []).find((el) => el.name === 'w:rPr');
      const wB = rPr?.elements?.find((el) => el.name === 'w:b');
      if (wB) boldNodes.push(wB);
    });
  });

  it('finds all <w:b> (truthy) variants in the demo file', () => {
    // This demo includes 4 truthy forms (omitted w:val, true, 1, on). False forms have no <w:b> element.
    expect(boldNodes.length).toBe(4);
  });

  it('imports each variant to the correct boolean via translator.encode', () => {
    const encoded = boldNodes.map((node) => w_b_translator.encode({ nodes: [node] }));
    const encodedAsBool = encoded.map((attr) => expectedFromRaw(attr?.attributes?.['w:val']));
    const expected = boldNodes.map((node) => expectedFromRaw(node.attributes?.['w:val']));
    expect(encodedAsBool).toEqual(expected);
  });

  it('exports each boolean back to <w:b> or omission via translator.decode', () => {
    const expected = boldNodes.map((node) => expectedFromRaw(node.attributes?.['w:val']));
    const decoded = expected.map((val) => w_b_translator.decode({ node: { attrs: { bold: val } } }));

    // True booleans should produce an element; false should be omitted (undefined)
    decoded.forEach((el, idx) => {
      if (expected[idx] === true) {
        expect(el?.name).toBe('w:b');
      } else {
        expect(el).toBeUndefined();
      }
    });
  });
});
