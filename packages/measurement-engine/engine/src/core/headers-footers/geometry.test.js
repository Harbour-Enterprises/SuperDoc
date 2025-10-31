// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  createHiddenMeasurementContainer,
  getDocumentTypography,
  getPageContentWidthPx,
  inchesToPixels,
  normalizeInchesToPx,
} from './geometry.js';

const createEditorStub = (overrides = {}) => ({
  converter: overrides.converter ?? {
    pageStyles: {
      pageSize: { width: 8.5 },
      pageMargins: { left: 1, right: 1 },
    },
    getDocumentDefaultStyles: () => ({
      fontFamilyCss: 'Cambria',
      fontSizePt: 12,
      lineHeightPx: 24,
    }),
  },
  view: overrides.view ?? { dom: { clientWidth: 480 } },
});

describe('geometry utilities', () => {
  it('derives typography from converter defaults', () => {
    const typography = getDocumentTypography(createEditorStub());
    expect(typography.fontFamily).toBe('Cambria');
    expect(typography.fontSizePx).toBeCloseTo(16);
    expect(typography.lineHeightPx).toBe(24);
  });

  it('creates a hidden measurement container with applied typography', () => {
    const container = createHiddenMeasurementContainer({
      doc: document,
      widthPx: 320,
      typography: { fontFamily: 'Inter', fontSizePx: 18, lineHeightPx: 27 },
    });

    expect(container.className).toBe('measurement-engine-section-surface');
    expect(container.style.position).toBe('absolute');
    expect(container.style.fontFamily).toBe('Inter');
    expect(container.style.width).toBe('320px');
  });

  it('normalizes inch values to pixels', () => {
    const result = normalizeInchesToPx({ top: 1, bottom: 0.5, ignore: 'nope' });
    expect(result.top).toBe(96);
    expect(result.bottom).toBe(48);
    expect(result).not.toHaveProperty('ignore');
  });

  it('converts inches to pixels', () => {
    expect(inchesToPixels(0.25)).toBe(24);
    expect(inchesToPixels(NaN)).toBeNull();
  });

  it('computes page content width in pixels', () => {
    const editor = createEditorStub();
    const contentWidth = getPageContentWidthPx(editor);
    expect(contentWidth).toBeCloseTo((8.5 - 2) * 96);
  });

  it('falls back to view width when page styles missing', () => {
    const editor = createEditorStub({
      converter: { pageStyles: {} },
      view: { dom: { clientWidth: 600 } },
    });
    expect(getPageContentWidthPx(editor)).toBe(600);
  });
});
