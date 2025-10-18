import { describe, it, expect } from 'vitest';
import { isLineBreakOnlyRun, generateParagraphProperties, processOutputMarks } from '@converter/exporter.js';

describe('isLineBreakOnlyRun', () => {
  it('returns true for a run containing only line break nodes', () => {
    const runNode = {
      type: 'run',
      content: [
        { type: 'lineBreak', attrs: {} },
        { type: 'hardBreak', attrs: {} },
      ],
    };

    expect(isLineBreakOnlyRun(runNode)).toBe(true);
  });

  it('returns false when run contains non-break content', () => {
    const runNode = {
      type: 'run',
      content: [
        { type: 'lineBreak', attrs: {} },
        { type: 'text', text: 'content' },
      ],
    };

    expect(isLineBreakOnlyRun(runNode)).toBe(false);
  });

  it('returns false for empty runs', () => {
    expect(isLineBreakOnlyRun({ type: 'run', content: [] })).toBe(false);
  });
});

describe('processOutputMarks', () => {
  it('maps inherit color to auto to negate style colors', () => {
    const marks = [{ type: 'textStyle', attrs: { color: 'inherit' } }];

    const result = processOutputMarks(marks);

    expect(result).toEqual([
      {
        name: 'w:color',
        attributes: { 'w:val': 'auto' },
      },
    ]);
  });
});

describe('generateParagraphProperties', () => {
  it('includes zero-value indents when explicitly provided', () => {
    const node = {
      type: 'paragraph',
      attrs: {
        indent: {
          left: 0,
          right: 0,
          firstLine: 0,
          hanging: 0,
          explicitLeft: true,
          explicitRight: true,
          explicitFirstLine: true,
          explicitHanging: true,
        },
      },
    };

    const result = generateParagraphProperties({ node });
    const indentElement = result.elements.find((el) => el.name === 'w:ind');

    expect(indentElement).toBeDefined();
    expect(indentElement.attributes['w:left']).toBe('0');
    expect(indentElement.attributes['w:right']).toBe('0');
    expect(indentElement.attributes['w:firstLine']).toBe('0');
    expect(indentElement.attributes['w:hanging']).toBe('0');
  });
});
