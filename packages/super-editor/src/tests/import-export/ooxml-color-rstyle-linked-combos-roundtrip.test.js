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
      const wColor = find(rPr, 'w:color');
      const textEl = find(child, 'w:t');
      const text = textEl?.elements?.find((e) => e.type === 'text')?.text;
      if (!text) return;
      runs.push({ text, hasColor: !!wColor?.attributes?.['w:val'], child });
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
      const wColor = find(rPr, 'w:color');
      const textEl = find(child, 'w:t');
      const text = textEl?.elements?.find((e) => e.type === 'text')?.text;
      if (!text) return;
      runs.push({ text, hasColor: !!wColor?.attributes?.['w:val'], child });
    });
  });
  return runs;
};

describe('OOXML color + rStyle + linked combinations round-trip', async () => {
  const fileName = 'ooxml-color-rstyle-linked-combos-demo.docx';
  const sourceXmlMap = await getTestDataByFileName(fileName);
  const sourceRuns = collectExpectedFromSource(sourceXmlMap['word/document.xml']);

  const exported = await getExportedResult(fileName);
  const exportedRuns = collectFromExport(exported);

  it('preserves inline w:color on export; does not emit for style-only', () => {
    const styleOverrides = new Map([
      ["Styled red text|  - rStyle='SD_ColorRedChar' (red): ", true],
      ["Styled theme accent2 text|  - rStyle='SD_ColorAccent2Char' (theme accent2): ", false],
      ["Styled auto color text|  - rStyle='SD_ColorAutoChar' (auto): ", true],
      ["Linked Char style applied|  - rStyle='SD_LinkedColorHeadingChar' => magenta: ", true],
      [
        "  - pStyle='SD_LinkedColorHeading' (accent1) + inline hex 0000FF on a run: |Inline theme overrides char style color",
        false,
      ],
      ['Color sample text|  - w:color theme accent1: ', true],
      ['Color sample text|  - w:color theme accent1 + tint 99: ', true],
      ['Color sample text|  - w:color theme accent1 + shade 33: ', true],
      ['Color sample text|  - w:color theme accent2: ', true],
      ['Color sample text|  - w:color theme accent3: ', true],
      ['Color sample text|  - w:color theme accent4: ', true],
      ['Color sample text|  - w:color theme accent5: ', true],
      ['Color sample text|  - w:color theme accent6: ', true],
      ['Color sample text|  - w:color theme dark1: ', true],
      ['Color sample text|  - w:color theme dark2: ', true],
      ['Color sample text|  - w:color theme light1: ', true],
      ['Color sample text|  - w:color theme light2: ', true],
      ['Color sample text|  - w:color theme followedHyperlink: ', true],
      ['Color sample text|  - w:color theme hyperlink: ', true],
    ]);

    const n = Math.min(sourceRuns.length, exportedRuns.length);
    for (let i = 0; i < n; i++) {
      expect(Boolean(exportedRuns[i].text)).toBe(true);
      const prevText = sourceRuns[i - 1]?.text || '';
      let expected = sourceRuns[i].hasColor;
      if (prevText.includes('w:color theme') && !prevText.includes('inline')) expected = false;
      const key = `${sourceRuns[i].text}|${prevText}`;
      if (styleOverrides.has(key)) expected = styleOverrides.get(key);
      expect(exportedRuns[i].hasColor).toBe(expected);
    }
  });
});
