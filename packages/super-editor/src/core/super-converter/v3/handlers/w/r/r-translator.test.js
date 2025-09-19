import { describe, it, expect, vi } from 'vitest';
import { translator, config } from './r-translator.js';

describe('w:r r-translator (mark)', () => {
  it('exposes correct metadata', () => {
    expect(config.xmlName).toBe('w:r');
    expect(config.sdNodeOrKeyName).toBe('run');
  });

  it('offers attribute translators for all valid w:r attributes', () => {
    const xmlNames = config.attributes.map((attr) => attr.xmlName);
    expect(xmlNames).toEqual(['w:rsidR', 'w:rsidRPr', 'w:rsidDel']);
  });

  it('encode applies a run mark to child content', () => {
    const fakeChild = { type: 'text', text: 'Hello', marks: [] };
    const runNode = { name: 'w:r', elements: [{ name: 'w:t', elements: [{ type: 'text', text: 'Hello' }] }] };

    const params = {
      nodes: [runNode],
      nodeListHandler: { handler: vi.fn(() => [fakeChild]) },
    };
    const out = translator.encode(params);
    const target = Array.isArray(out?.content) ? out.content[0] : out;
    expect(target?.marks?.some((m) => m.type === 'run')).toBe(true);
  });

  it('converts w:b run property into a bold mark and drops it from runProperties', () => {
    const boldRun = {
      name: 'w:r',
      elements: [
        { name: 'w:rPr', elements: [{ name: 'w:b', attributes: {} }] },
        { name: 'w:t', elements: [{ type: 'text', text: 'Bold' }] },
      ],
    };

    const params = {
      nodes: [boldRun],
      nodeListHandler: {
        handler: vi.fn(({ nodes }) =>
          nodes
            .map((node) => {
              if (node.name === 'w:t') return { type: 'text', text: node.elements?.[0]?.text ?? '', marks: [] };
              if (node.name === 'w:b') return { type: 'attr', xmlName: 'w:b', attributes: {} };
              return null;
            })
            .filter(Boolean),
        ),
      },
    };

    const node = translator.encode(params);
    expect(node.marks?.some((mark) => mark.type === 'bold')).toBe(true);
    const runMark = node.marks?.find((mark) => mark.type === 'run');
    expect(Array.isArray(runMark?.attrs?.runProperties)).toBe(false);
  });

  it('collects font and size info into a textStyle mark', () => {
    const styledRun = {
      name: 'w:r',
      elements: [
        {
          name: 'w:rPr',
          elements: [
            { name: 'w:rFonts', attributes: { 'w:ascii': 'Arial' } },
            { name: 'w:sz', attributes: { 'w:val': '32' } },
          ],
        },
        { name: 'w:t', elements: [{ type: 'text', text: 'Styled' }] },
      ],
    };

    const params = {
      nodes: [styledRun],
      nodeListHandler: {
        handler: vi.fn(({ nodes }) =>
          nodes
            .map((node) => {
              if (node.name === 'w:t') return { type: 'text', text: node.elements?.[0]?.text ?? '', marks: [] };
              return null;
            })
            .filter(Boolean),
        ),
      },
    };

    const node = translator.encode(params);
    const textStyleMark = node.marks?.find((mark) => mark.type === 'textStyle');
    expect(textStyleMark).toBeDefined();
    expect(textStyleMark.attrs).toMatchObject({ fontFamily: 'Arial', fontSize: '16pt' });
  });

  it('returns all child nodes when the run contains multiple items such as tabs', () => {
    const run = {
      name: 'w:r',
      elements: [
        { name: 'w:t', elements: [{ text: 'Left', type: 'text' }] },
        { name: 'w:tab' },
        { name: 'w:t', elements: [{ text: 'Right', type: 'text' }] },
      ],
    };

    const params = {
      nodes: [run],
      nodeListHandler: {
        handler: vi.fn(() => [
          { type: 'text', text: 'Left', marks: [] },
          { type: 'tab', attrs: { val: 'start' } },
          { type: 'text', text: 'Right', marks: [] },
        ]),
      },
    };

    const result = translator.encode(params);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(3);
    expect(result[0].type).toBe('text');
    expect(result[1]).toMatchObject({ type: 'tab', attrs: { val: 'start' } });
    const tabMarks = result[1].marks || [];
    expect(tabMarks.some((mark) => mark.type === 'run')).toBe(true);
    expect(tabMarks.some((mark) => mark.type === 'textStyle')).toBe(false);
    expect(result[2].type).toBe('text');
  });
});
