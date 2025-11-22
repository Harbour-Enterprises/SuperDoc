import { describe, it, expect } from 'vitest';
import { generateParagraphProperties } from './generate-paragraph-properties.js';

describe('generateParagraphProperties indent', () => {
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

describe('generateParagraphProperties', () => {
  it('updates changed attrs, merges run props and keeps original paragraph properties untouched', () => {
    const originalParagraphProperties = {
      styleId: 'Body',
      indent: { left: 100 },
      runProperties: { color: { val: '111111' } },
    };
    const params = {
      node: {
        type: 'paragraph',
        attrs: {
          styleId: 'Heading1',
          textAlign: 'center',
          indent: { left: 240 },
          marksAttrs: [
            { type: 'textStyle', attrs: { color: '#FF0000' } },
            { type: 'italic', attrs: { value: true } },
          ],
          paragraphProperties: originalParagraphProperties,
        },
      },
    };
    const result = generateParagraphProperties(params);
    const getElement = (name) => result.elements.find((el) => el.name === name);

    const styleElement = getElement('w:pStyle');
    expect(styleElement?.attributes?.['w:val']).toBe('Heading1');

    const justificationElement = getElement('w:jc');
    expect(justificationElement?.attributes?.['w:val']).toBe('center');

    const indentElement = getElement('w:ind');
    expect(indentElement?.attributes?.['w:left']).toBe('240');

    const runPropertiesElement = getElement('w:rPr');
    expect(runPropertiesElement).toBeDefined();
    const colorElement = runPropertiesElement.elements.find((el) => el.name === 'w:color');
    expect(colorElement?.attributes?.['w:val']).toBe('FF0000');
    const italicElement = runPropertiesElement.elements.find((el) => el.name === 'w:i');
    expect(italicElement?.attributes).toEqual({});

    expect(originalParagraphProperties).toEqual({
      styleId: 'Body',
      indent: { left: 100 },
      runProperties: { color: { val: '111111' } },
    });
  });

  it('transforms dropcap to framePr and appends sectPr to decoded elements', () => {
    const sectPr = { name: 'w:sectPr', type: 'element', attributes: { id: 'sect-1' }, elements: [] };

    const params = {
      node: {
        type: 'paragraph',
        attrs: {
          dropcap: { type: 'drop', lines: 2 },
          paragraphProperties: {
            framePr: { wrap: 'around' },
            sectPr,
          },
        },
      },
    };

    const result = generateParagraphProperties(params);

    const framePrElement = result.elements.find((el) => el.name === 'w:framePr');
    expect(framePrElement?.attributes?.['w:dropCap']).toBe('drop');
    expect(framePrElement?.attributes?.['w:lines']).toBe('2');
    expect(result.elements[result.elements.length - 1]).toBe(sectPr);
  });
});
