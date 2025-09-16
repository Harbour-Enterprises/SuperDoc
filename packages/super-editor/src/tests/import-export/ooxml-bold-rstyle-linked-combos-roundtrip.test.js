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
      runs.push({ text, bold });
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
      const hasB = !!find(rPr, 'w:b');
      const textEl = find(child, 'w:t');
      const text = textEl?.elements?.find((e) => e.type === 'text')?.text;
      if (!text) return;
      runs.push({ text, bold: hasB });
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
    const n = Math.min(sourceRuns.length, exportedRuns.length);
    for (let i = 0; i < n; i++) {
      if (exportedRuns[i].bold !== sourceRuns[i].bold) {
        // Debug output to help locate mismatches
        // eslint-disable-next-line no-console
        console.warn(
          `Mismatch at run ${i}: text="${exportedRuns[i].text}" expected=${sourceRuns[i].bold} actual=${exportedRuns[i].bold}`,
        );
      }
      expect(Boolean(exportedRuns[i].text)).toBe(true);
      expect(exportedRuns[i].bold).toBe(sourceRuns[i].bold);
    }
  });
});
