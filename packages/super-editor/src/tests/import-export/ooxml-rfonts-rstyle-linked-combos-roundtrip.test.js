import { describe, it, expect, beforeAll } from 'vitest';
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

const extractFontsFromElement = (rFontsEl) => {
  if (!rFontsEl?.attributes) return null;
  return { ...rFontsEl.attributes };
};

const mergeFonts = (base, extra) => {
  if (!extra) return base;
  if (!base) return { ...extra };
  return { ...base, ...extra };
};

const buildStyleFontResolver = (stylesDoc) => {
  const stylesRoot = stylesDoc?.elements?.find((el) => el.name === 'w:styles');
  const styleElements = stylesRoot?.elements?.filter((el) => el.name === 'w:style') || [];

  const styleMap = new Map();
  styleElements.forEach((styleEl) => {
    const styleId = styleEl.attributes?.['w:styleId'];
    if (!styleId) return;
    const rPr = find(styleEl, 'w:rPr');
    const rFonts = extractFontsFromElement(find(rPr, 'w:rFonts'));
    const basedOn = find(styleEl, 'w:basedOn')?.attributes?.['w:val'];
    styleMap.set(styleId.toLowerCase(), {
      fonts: rFonts,
      basedOn: basedOn ? basedOn.toLowerCase() : null,
    });
  });

  const resolvedCache = new Map();

  const resolve = (styleId) => {
    if (!styleId) return null;
    const key = styleId.toLowerCase();
    if (resolvedCache.has(key)) return resolvedCache.get(key);

    const style = styleMap.get(key);
    if (!style) {
      resolvedCache.set(key, null);
      return null;
    }

    let result = null;
    if (style.basedOn) {
      const baseFonts = resolve(style.basedOn);
      if (baseFonts) result = mergeFonts(result, baseFonts);
    }

    if (style.fonts) result = mergeFonts(result, style.fonts);

    resolvedCache.set(key, result);
    return result;
  };

  return resolve;
};

const normalizeFonts = (fonts) => {
  if (!fonts) return null;
  const normalized = { ...fonts };
  if (normalized['w:eastAsia'] && normalized['w:val'] === undefined) {
    normalized['w:val'] = normalized['w:eastAsia'];
  }
  return Object.keys(normalized).length ? normalized : null;
};

const collectRunsWithFonts = (doc, getStyleFonts) => {
  const runs = [];

  const processParagraph = (paragraph) => {
    const paragraphStyle = find(find(paragraph, 'w:pPr'), 'w:pStyle')?.attributes?.['w:val'];
    const paragraphFonts = normalizeFonts(getStyleFonts(paragraphStyle));

    (paragraph.elements || []).forEach((child) => {
      if (child.name !== 'w:r') return;
      const rPr = find(child, 'w:rPr');
      const runStyle = find(rPr, 'w:rStyle')?.attributes?.['w:val'];

      let fonts = paragraphFonts ? { ...paragraphFonts } : null;
      const runStyleFonts = normalizeFonts(getStyleFonts(runStyle));
      fonts = mergeFonts(fonts, runStyleFonts);

      const inlineFonts = normalizeFonts(extractFontsFromElement(find(rPr, 'w:rFonts')));
      fonts = mergeFonts(fonts, inlineFonts);

      fonts = normalizeFonts(fonts);

      const textEl = find(child, 'w:t');
      const text = textEl?.elements?.find((e) => e.type === 'text')?.text;
      if (!text) return;
      runs.push({ text, fonts });
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

describe('OOXML rFonts + rStyle + linked combinations round-trip', () => {
  const fileName = 'ooxml-rFonts-rstyle-linked-combos-demo.docx';
  let sourceRuns = [];
  let exportedRuns = [];

  beforeAll(async () => {
    const sourceXmlMap = await getTestDataByFileName(fileName);
    const styleFontsResolver = buildStyleFontResolver(sourceXmlMap['word/styles.xml']);
    sourceRuns = collectRunsWithFonts(sourceXmlMap['word/document.xml'], styleFontsResolver);

    const exported = await getExportedResult(fileName);
    exportedRuns = collectRunsWithFonts(exported, styleFontsResolver);
  });

  it('preserves rFonts attributes across import/export, including style-driven and inline overrides', () => {
    expect(exportedRuns.length).toBe(sourceRuns.length);

    const n = sourceRuns.length;
    for (let i = 0; i < n; i++) {
      expect(Boolean(exportedRuns[i].text)).toBe(true);
      const expectedFonts = sourceRuns[i].fonts;
      const actualFonts = exportedRuns[i].fonts;

      if (!expectedFonts) {
        expect(actualFonts ?? null).toEqual({
          'w:ascii': 'Cambria',
          'w:eastAsia': 'Cambria',
          'w:hAnsi': 'Cambria',
          'w:cs': 'Cambria',
          'w:val': 'Cambria',
        });
        continue;
      }

      const expectedKeys = Object.keys(expectedFonts);
      const requiredKeys = expectedKeys.filter((key) => ['w:ascii', 'w:hAnsi'].includes(key));

      if (!actualFonts) {
        expect(requiredKeys.length).toBe(0);
        continue;
      }

      requiredKeys.forEach((key) => {
        expect(actualFonts?.[key]).toBe(expectedFonts[key]);
      });
    }
  });
});
