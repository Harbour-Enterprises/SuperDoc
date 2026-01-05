import { describe, it, expect } from 'vitest';
import { getTestDataByFileName, loadTestDataForEditorTests, initTestEditor } from '../helpers/helpers.js';
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

const buildItalicStyleSet = (stylesDoc) => {
  const italicStyles = new Set();
  const stylesRoot = stylesDoc?.elements?.find((el) => el.name === 'w:styles');
  const styleElements = stylesRoot?.elements?.filter((el) => el.name === 'w:style') || [];
  styleElements.forEach((styleEl) => {
    const styleId = styleEl.attributes?.['w:styleId'];
    if (!styleId) return;
    const rPr = find(styleEl, 'w:rPr');
    if (!rPr) return;
    const italicEl = find(rPr, 'w:i');
    if (!italicEl) return;
    const val = italicEl.attributes?.['w:val'];
    if (stOnOff(val)) italicStyles.add(styleId.toLowerCase());
  });
  return italicStyles;
};

const collectExpectedRunsFromImport = async (fileName) => {
  const { docx, media, mediaFiles, fonts } = await loadTestDataForEditorTests(fileName);
  const { editor } = initTestEditor({ content: docx, media, mediaFiles, fonts });
  const runs = [];
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const runNode = editor.state.doc.nodeAt(pos - 1);
    const italic = runNode.attrs.runProperties.italic;
    runs.push({ text: node.text, italic });
  });
  editor.destroy();
  return runs;
};

const collectItalicFromExport = (doc, italicStyleSet) => {
  const body = doc.elements?.find((el) => el.name === 'w:body');
  const paragraphs = body?.elements?.filter((n) => n.name === 'w:p') || [];
  const runs = [];
  paragraphs.forEach((p) => {
    (p.elements || []).forEach((child) => {
      if (child.name !== 'w:r') return;
      const rPr = find(child, 'w:rPr');
      const wI = find(rPr, 'w:i');
      let italic;
      if (wI) italic = stOnOff(wI.attributes?.['w:val']);
      // else {
      //   const rStyle = find(rPr, 'w:rStyle');
      //   const styleId = rStyle?.attributes?.['w:val'];
      //   italic = styleId ? italicStyleSet.has(styleId.toLowerCase()) : false;
      // }
      const textEl = find(child, 'w:t');
      const text = textEl?.elements?.find((e) => e.type === 'text')?.text;
      if (!text) return;
      runs.push({ text, italic });
    });
  });
  return runs;
};

describe('OOXML italic + rStyle combinations round-trip', async () => {
  const fileName = 'ooxml-italic-rstyle-combos-demo.docx';
  const sourceXmlMap = await getTestDataByFileName(fileName);
  const italicStyleSet = buildItalicStyleSet(sourceXmlMap['word/styles.xml']);
  const sourceRuns = await collectExpectedRunsFromImport(fileName);

  const exported = await getExportedResult(fileName);
  const exportedRuns = collectItalicFromExport(exported, italicStyleSet);

  it('maintains italic presence across import/export according to inline-overrides-style rule', () => {
    const n = Math.min(sourceRuns.length, exportedRuns.length);
    for (let i = 0; i < n; i++) {
      console.log(
        `Run ${i}: source italic=${sourceRuns[i].italic}, exported italic=${exportedRuns[i].italic} (text="${exportedRuns[i].text}")`,
      );
      expect(Boolean(exportedRuns[i].text)).toBe(true);
      expect(exportedRuns[i].italic).toBe(sourceRuns[i].italic);
    }
  });
});
