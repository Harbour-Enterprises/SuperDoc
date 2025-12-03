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

  it('always applies fontSize from linked styles regardless of default value', () => {
    const resolver = createLinkedStyleResolver([
      { id: 'CustomStyle', definition: { styles: { 'font-size': '14pt' } } },
    ]);
    const run: TextRun = {
      text: 'test',
      fontFamily: 'Default',
      fontSize: 16, // Default size
    };
    applyLinkedStyleToRun(run, {
      resolver: resolver!,
      paragraphStyleId: null,
      inlineStyleId: null,
      runStyleId: 'CustomStyle',
      defaultFont: 'Default',
      defaultSize: 16,
    });
    // Should apply 14pt converted to pixels, even if run currently has default size
    const expectedPx = (14 * 96) / 72;
    expect(run.fontSize).toBeCloseTo(expectedPx);
  });

  it('applies fontSize from linked styles when run has non-default size', () => {
    const resolver = createLinkedStyleResolver([
      { id: 'CustomStyle', definition: { styles: { 'font-size': '20pt' } } },
    ]);
    const run: TextRun = {
      text: 'test',
      fontFamily: 'Default',
      fontSize: 18, // Non-default size
    };
    applyLinkedStyleToRun(run, {
      resolver: resolver!,
      paragraphStyleId: null,
      inlineStyleId: null,
      runStyleId: 'CustomStyle',
      defaultFont: 'Default',
      defaultSize: 16,
    });
    // Should apply 20pt converted to pixels
    const expectedPx = (20 * 96) / 72;
    expect(run.fontSize).toBeCloseTo(expectedPx);
  });

  it('allows marks applied after to override linked style fontSize', () => {
    const resolver = createLinkedStyleResolver([
      { id: 'CustomStyle', definition: { styles: { 'font-size': '14pt', color: '#0000FF' } } },
    ]);
    const run: TextRun = {
      text: 'test',
      fontFamily: 'Default',
      fontSize: 16,
    };

    // First apply linked styles
    applyLinkedStyleToRun(run, {
      resolver: resolver!,
      paragraphStyleId: null,
      inlineStyleId: null,
      runStyleId: 'CustomStyle',
      defaultFont: 'Default',
      defaultSize: 16,
    });

    // Verify linked styles were applied
    const linkedFontSizePx = (14 * 96) / 72;
    expect(run.fontSize).toBeCloseTo(linkedFontSizePx);
    expect(run.color).toBe('#0000FF');

    // Simulate marks being applied after (which should override)
    run.fontSize = 24; // Override from mark
    run.color = '#FF0000'; // Override from mark

    // Verify marks override linked styles
    expect(run.fontSize).toBe(24);
    expect(run.color).toBe('#FF0000');
  });

  it('applies all style properties from linked styles when present', () => {
    const resolver = createLinkedStyleResolver([
      {
        id: 'RichStyle',
        definition: {
          styles: {
            'font-size': '18pt',
            'font-family': 'Georgia',
            color: '#333333',
            bold: true,
            italic: true,
            underline: 'double',
            'letter-spacing': '2pt',
          },
        },
      },
    ]);
    const run: TextRun = {
      text: 'test',
      fontFamily: 'Default',
      fontSize: 16,
    };
    applyLinkedStyleToRun(run, {
      resolver: resolver!,
      paragraphStyleId: null,
      inlineStyleId: null,
      runStyleId: 'RichStyle',
      defaultFont: 'Default',
      defaultSize: 16,
    });

    expect(run.fontSize).toBeCloseTo((18 * 96) / 72);
    expect(run.fontFamily).toBe('Georgia');
    expect(run.color).toBe('#333333');
    expect(run.bold).toBe(true);
    expect(run.italic).toBe(true);
    expect(run.underline?.style).toBe('double');
    expect(run.letterSpacing).toBeCloseTo((2 * 96) / 72);
  });
});
