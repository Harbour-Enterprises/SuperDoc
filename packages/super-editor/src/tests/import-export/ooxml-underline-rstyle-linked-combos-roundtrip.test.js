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
      const wU = find(rPr, 'w:u');
      const textEl = find(child, 'w:t');
      const text = textEl?.elements?.find((e) => e.type === 'text')?.text;
      if (!text) return;
      let underline = false;
      if (wU) {
        const raw = wU.attributes?.['w:val'];
        const val = raw == null || raw === '' ? 'single' : String(raw);
        underline = !(val.toLowerCase() === 'none' || val === '0');
      }
      runs.push({ text, underline });
    });
  });
  return runs;
};

const collectUnderlineFromExport = (doc) => {
  const body = doc.elements?.find((el) => el.name === 'w:body');
  const paragraphs = body?.elements?.filter((n) => n.name === 'w:p') || [];
  const runs = [];
  paragraphs.forEach((p) => {
    (p.elements || []).forEach((child) => {
      if (child.name !== 'w:r') return;
      const rPr = find(child, 'w:rPr');
      const wU = find(rPr, 'w:u');
      const textEl = find(child, 'w:t');
      const text = textEl?.elements?.find((e) => e.type === 'text')?.text;
      if (!text) return;
      runs.push({ text, underline: !!wU && (wU.attributes?.['w:val'] || '') !== 'none' });
    });
  });
  return runs;
};

describe('OOXML underline + rStyle + linked combinations round-trip', async () => {
  const fileName = 'ooxml-underline-rstyle-linked-combos-demo.docx';
  const sourceXmlMap = await getTestDataByFileName(fileName);
  const sourceRuns = collectExpectedFromSource(sourceXmlMap['word/document.xml']);

  const exported = await getExportedResult(fileName);
  const exportedRuns = collectUnderlineFromExport(exported);

  it('maintains underline presence from inline w:u across import/export', () => {
    const n = Math.min(sourceRuns.length, exportedRuns.length);
    for (let i = 0; i < n; i++) {
      expect(Boolean(exportedRuns[i].text)).toBe(true);
      expect(exportedRuns[i].underline).toBe(sourceRuns[i].underline);
    }
  });
});
