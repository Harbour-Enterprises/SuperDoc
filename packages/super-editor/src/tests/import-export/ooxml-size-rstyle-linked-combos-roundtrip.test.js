import { describe, it, expect, beforeAll } from 'vitest';
import { getTestDataByFileName, loadTestDataForEditorTests, initTestEditor } from '../helpers/helpers.js';
import { getExportedResult } from '../export/export-helpers/index.js';

const find = (el, name) => (el?.elements || []).find((e) => e.name === name);

const halfPointToPt = (value) => {
  if (value === undefined || value === null) return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  const pts = num / 2;
  return Number.isInteger(pts) ? `${pts}pt` : `${pts}pt`;
};

const buildSizeStyleResolver = (stylesDoc) => {
  const stylesRoot = stylesDoc?.elements?.find((el) => el.name === 'w:styles');
  const styleElements = stylesRoot?.elements?.filter((el) => el.name === 'w:style') || [];

  const styleMap = new Map();
  styleElements.forEach((styleEl) => {
    const styleId = styleEl.attributes?.['w:styleId'];
    if (!styleId) return;
    const rPr = find(styleEl, 'w:rPr');
    const szEl = find(rPr, 'w:sz');
    const basedOn = find(styleEl, 'w:basedOn')?.attributes?.['w:val'];
    styleMap.set(styleId.toLowerCase(), {
      size: halfPointToPt(szEl?.attributes?.['w:val']),
      basedOn: basedOn ? basedOn.toLowerCase() : null,
    });
  });

  const resolvedCache = new Map();

  const resolve = (styleId) => {
    if (!styleId) return null;
    const key = styleId.toLowerCase();
    if (resolvedCache.has(key)) return resolvedCache.get(key);

    const styleConfig = styleMap.get(key);
    if (!styleConfig) {
      resolvedCache.set(key, null);
      return null;
    }

    let resolved = null;
    if (styleConfig.basedOn) {
      resolved = resolve(styleConfig.basedOn);
    }
    if (styleConfig.size) resolved = styleConfig.size;

    resolvedCache.set(key, resolved);
    return resolved;
  };

  return resolve;
};

const collectExpectedRunsFromImport = async (fileName) => {
  const { docx, media, mediaFiles, fonts } = await loadTestDataForEditorTests(fileName);
  const { editor } = initTestEditor({ content: docx, media, mediaFiles, fonts });
  const runs = [];
  editor.state.doc.descendants((node) => {
    if (!node.isText || !node.text) return;
    let size = null;
    node.marks?.forEach((mark) => {
      const typeName = mark.type?.name || mark.type;
      if (typeName === 'textStyle' && mark.attrs?.fontSize) size = mark.attrs.fontSize;
    });
    runs.push({ text: node.text, size });
  });
  editor.destroy();
  return runs;
};

const collectSizesFromExport = (doc, resolveStyleSize) => {
  const runs = [];

  const processParagraph = (paragraph) => {
    const pStyle = find(find(paragraph, 'w:pPr'), 'w:pStyle')?.attributes?.['w:val'];
    const paragraphSize = resolveStyleSize(pStyle);

    (paragraph.elements || []).forEach((child) => {
      if (child.name !== 'w:r') return;
      const rPr = find(child, 'w:rPr');
      const rStyle = find(rPr, 'w:rStyle')?.attributes?.['w:val'];

      let size = paragraphSize || null;
      const runStyleSize = resolveStyleSize(rStyle);
      if (runStyleSize) size = runStyleSize;

      const inlineSz = find(rPr, 'w:sz');
      const inlineSize = halfPointToPt(inlineSz?.attributes?.['w:val']);
      if (inlineSize) size = inlineSize;

      const textEl = find(child, 'w:t');
      const text = textEl?.elements?.find((e) => e.type === 'text')?.text;
      if (!text) return;
      runs.push({ text, size });
    });
  };

  const walk = (node) => {
    (node?.elements || []).forEach((child) => {
      if (child.name === 'w:p') processParagraph(child);
      else if (child.elements) walk(child);
    });
  };

  walk(doc);
  return runs;
};

describe('OOXML size + rStyle + linked combinations round-trip', () => {
  const fileName = 'ooxml-size-rstyle-linked-combos-demo.docx';
  let sourceRuns = [];
  let exportedRuns = [];

  beforeAll(async () => {
    const sourceXmlMap = await getTestDataByFileName(fileName);
    const resolveStyleSize = buildSizeStyleResolver(sourceXmlMap['word/styles.xml']);
    sourceRuns = await collectExpectedRunsFromImport(fileName);

    const exported = await getExportedResult(fileName);
    exportedRuns = collectSizesFromExport(exported, resolveStyleSize);
  });

  it('preserves font size across import/export, including style-driven and inline overrides', () => {
    expect(exportedRuns.length).toBe(sourceRuns.length);

    const n = sourceRuns.length;
    for (let i = 0; i < n; i++) {
      expect(Boolean(exportedRuns[i].text)).toBe(true);
      expect(exportedRuns[i].size).toBe(sourceRuns[i].size);
    }
  });
});
