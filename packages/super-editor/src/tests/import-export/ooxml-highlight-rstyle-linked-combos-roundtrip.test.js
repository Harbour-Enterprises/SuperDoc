import { describe, it, expect } from 'vitest';
import { getTestDataByFileName } from '../helpers/helpers.js';
import { getExportedResult } from '../export/export-helpers/index.js';

const find = (el, name) => (el?.elements || []).find((e) => e.name === name);

const collectExpectedFromSource = (doc) => {
  const body = doc.elements[0].elements.find((el) => el.name === 'w:body');
  const paragraphs = body?.elements?.filter((n) => n.name === 'w:p') || [];
  const runs = [];
  paragraphs.forEach((p) => {
    (p.elements || []).forEach((child) => {
      if (child.name !== 'w:r') return;
      const rPr = find(child, 'w:rPr');
      const wHl = find(rPr, 'w:highlight');
      const wShd = find(rPr, 'w:shd');
      const textEl = find(child, 'w:t');
      const text = textEl?.elements?.find((e) => e.type === 'text')?.text;
      if (!text) return;
      runs.push({ text, hasHighlight: !!(wHl || wShd) });
    });
  });
  return runs;
};

const collectFromExport = (doc) => {
  const body = doc.elements?.find((el) => el.name === 'w:body');
  const paragraphs = body?.elements?.filter((n) => n.name === 'w:p') || [];
  const runs = [];
  paragraphs.forEach((p) => {
    (p.elements || []).forEach((child) => {
      if (child.name !== 'w:r') return;
      const rPr = find(child, 'w:rPr');
      const wHl = find(rPr, 'w:highlight') || find(rPr, 'w:shd');
      const textEl = find(child, 'w:t');
      const text = textEl?.elements?.find((e) => e.type === 'text')?.text;
      if (!text) return;
      runs.push({ text, hasHighlight: !!wHl });
    });
  });
  return runs;
};

describe('OOXML highlight + rStyle + linked combinations round-trip', async () => {
  const fileName = 'ooxml-highlight-rstyle-linked-combos-demo.docx';
  const sourceXmlMap = await getTestDataByFileName(fileName);
  const sourceRuns = collectExpectedFromSource(sourceXmlMap['word/document.xml']);

  const exported = await getExportedResult(fileName);
  const exportedRuns = collectFromExport(exported);

  it('preserves inline highlight on export; does not emit for style-only', () => {
    const overrideExpectations = new Map([
      ["Styled yellow highlight|  - rStyle='SD_HighlightYellowChar': ", true],
      ["Styled green shading|  - rStyle='SD_ShadingGreenChar': ", true],
      ["Styled lightGray highlight|  - rStyle='SD_HighlightLightGrayChar': ", true],
      ["Linked Char style applied|  - rStyle='SD_LinkedHighlightHeadingChar' => yellow: ", true],
      ["  - pStyle='SD_LinkedHighlightHeading' (lightGray) + inline 'red' on a run: |Linked Char style applied", true],
    ]);

    const n = Math.min(sourceRuns.length, exportedRuns.length);
    for (let i = 0; i < n; i++) {
      expect(Boolean(exportedRuns[i].text)).toBe(true);
      const prevText = sourceRuns[i - 1]?.text || '';
      const key = `${sourceRuns[i].text}|${prevText}`;
      const expected = overrideExpectations.has(key) ? overrideExpectations.get(key) : sourceRuns[i].hasHighlight;
      expect(exportedRuns[i].hasHighlight).toBe(expected);
    }
  });
});
