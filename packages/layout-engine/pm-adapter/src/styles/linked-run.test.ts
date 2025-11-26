import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { applyLinkedStyleToRun, createLinkedStyleResolver } from './linked-run.js';
import type { TextRun } from '@superdoc/contracts';

describe('linked-run style resolver', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applies inherited styles to runs when defaults are present', () => {
    const resolver = createLinkedStyleResolver([
      { id: 'Base', definition: { styles: { 'font-family': 'Calibri', bold: true } } },
      {
        id: 'Hyperlink',
        definition: { attrs: { basedOn: 'Base' }, styles: { color: '#0066CC', underline: 'single' } },
      },
    ]);
    expect(resolver).not.toBeNull();
    const run: TextRun = {
      text: 'link',
      fontFamily: 'Default',
      fontSize: 16,
    };
    applyLinkedStyleToRun(run, {
      resolver: resolver!,
      paragraphStyleId: null,
      inlineStyleId: null,
      runStyleId: 'Hyperlink',
      defaultFont: 'Default',
      defaultSize: 16,
    });
    expect(run.fontFamily).toBe('Calibri');
    expect(run.bold).toBe(true);
    expect(run.color).toBe('#0066CC');
    expect(run.underline?.style).toBe('single');
  });

  it('respects paragraph style precedence for inline style IDs', () => {
    const resolver = createLinkedStyleResolver([
      { id: 'BodyText', definition: { styles: { 'font-family': 'Body', 'font-size': '12pt' } } },
      { id: 'Inline', definition: { styles: { 'font-size': '18pt' } } },
    ]);
    const run: TextRun = {
      text: 'sample',
      fontFamily: 'Default',
      fontSize: 16,
    };
    applyLinkedStyleToRun(run, {
      resolver: resolver!,
      paragraphStyleId: 'BodyText',
      inlineStyleId: 'Inline',
      defaultFont: 'Default',
      defaultSize: 16,
    });
    // Paragraph style should set font family, inline style should override size
    expect(run.fontFamily).toBe('Body');
    expect(run.fontSize).toBeCloseTo((18 * 96) / 72);
  });

  it('skips inline styles for TOC paragraphs', () => {
    const resolver = createLinkedStyleResolver([
      { id: 'TOC1', definition: { styles: { color: '#111111' } } },
      { id: 'CharacterStyle', definition: { styles: { color: '#FF0000' } } },
    ]);
    const run: TextRun = {
      text: 'entry',
      fontFamily: 'Default',
      fontSize: 16,
    };
    applyLinkedStyleToRun(run, {
      resolver: resolver!,
      paragraphStyleId: 'TOC1',
      inlineStyleId: 'CharacterStyle',
      defaultFont: 'Default',
      defaultSize: 16,
    });
    expect(run.color).toBe('#111111');
  });
});
