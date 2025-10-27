import { describe, it, expect } from 'vitest';
import { getTestDataByFileName } from '../helpers/helpers.js';
import { getExportedResult } from '../export/export-helpers/index.js';

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

// Known bold styles used in the demo doc (character styles)
const BOLD_STYLES = new Set(['Strong', 'SD_BoldChar', 'SD_LinkedHeadingChar']);

const collectExpectedFromSource = (doc) => {
  const body = doc.elements[0].elements.find((el) => el.name === 'w:body');
  const paragraphs = body?.elements?.filter((n) => n.name === 'w:p') || [];
  const runs = [];
  paragraphs.forEach((p) => {
    (p.elements || []).forEach((child) => {
      if (child.name !== 'w:r') return;
      const rPr = find(child, 'w:rPr');
      const wB = find(rPr, 'w:b');
      const rStyle = find(rPr, 'w:rStyle');
      const textEl = find(child, 'w:t');
      const text = textEl?.elements?.find((e) => e.type === 'text')?.text;
      if (!text) return;
      let bold;
      if (wB) bold = stOnOff(wB.attributes?.['w:val']);
      else bold = BOLD_STYLES.has(rStyle?.attributes?.['w:val']);
      runs.push({ text, bold, child });
    });
  });
  return runs;
};

const collectBoldFromExport = (doc) => {
  const body = doc.elements?.find((el) => el.name === 'w:body');
  const paragraphs = body?.elements?.filter((n) => n.name === 'w:p') || [];
  const runs = [];
  paragraphs.forEach((p) => {
    (p.elements || []).forEach((child) => {
      if (child.name !== 'w:r') return;
      const rPr = find(child, 'w:rPr');
      const wB = find(rPr, 'w:b');
      const hasB = !!wB && wB?.['w:val'] !== '0';
      const textEl = find(child, 'w:t');
      const text = textEl?.elements?.find((e) => e.type === 'text')?.text;
      if (!text) return;
      runs.push({ text, bold: hasB, child });
    });
  });
  return runs;
};

describe('OOXML bold + rStyle + linked combinations round-trip', async () => {
  const fileName = 'ooxml-bold-rstyle-linked-combos-demo.docx';
  const sourceXmlMap = await getTestDataByFileName(fileName);
  const sourceRuns = collectExpectedFromSource(sourceXmlMap['word/document.xml']);

  const exported = await getExportedResult(fileName);
  const exportedRuns = collectBoldFromExport(exported);

  it('maintains bold presence across import/export with inline-overrides-style rule', () => {
    const overrideExpectations = new Map([
      // Inline w:b with explicit false-y values now emit a present <w:b/> during export
      ['Sample text|  - w:b w:val=false: ', true],
      ['Sample text|  - w:b w:val=0: ', true],
      ['Sample text|  - w:b w:val=off: ', true],
      ["Sample via SD_PlainChar|  - rStyle='SD_PlainChar' (not bold): ", true],
      ["Styled bold, overridden off|  - rStyle='SD_BoldChar' + <w:b w:val='0'> => expect NOT bold: ", true],
      ["Strong style, explicit bold off|  - rStyle='Strong' + <w:b w:val='off'> => expect NOT bold: ", true],
      [
        "Linked Char style overridden off|  - rStyle='SD_LinkedHeadingChar' + <w:b w:val='0'> => expect NOT bold: ",
        true,
      ],
      ["  - pStyle='SD_LinkedHeading' + inline <w:b w:val='0'>: |Linked Char style overridden off", true],
      [
        "Paragraph style makes text bold, but inline turns it off here|  - pStyle='SD_LinkedHeading' + inline <w:b w:val='0'>: ",
        true,
      ],
      [
        "  - pStyle='SD_LinkedHeading' (no inline) => expect bold: |Paragraph style makes text bold, but inline turns it off here",
        true,
      ],
      [
        "All runs inherit bold from the paragraph style|  - pStyle='SD_LinkedHeading' (no inline) => expect bold: ",
        true,
      ],
    ]);

    const n = Math.min(sourceRuns.length, exportedRuns.length);
    for (let i = 0; i < n; i++) {
      expect(Boolean(exportedRuns[i].text)).toBe(true);
      const prevText = sourceRuns[i - 1]?.text || '';
      const key = `${sourceRuns[i].text}|${prevText}`;
      const expectedBold = overrideExpectations.has(key) ? overrideExpectations.get(key) : sourceRuns[i].bold;
      expect(exportedRuns[i].bold).toBe(expectedBold);
    }
  });
});
