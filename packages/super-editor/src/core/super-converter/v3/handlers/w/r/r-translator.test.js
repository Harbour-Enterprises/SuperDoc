import { describe, it, expect, vi } from 'vitest';
import { translator, config } from './r-translator.js';

describe('w:r r-translator (node)', () => {
  it('exposes correct metadata', () => {
    expect(config.xmlName).toBe('w:r');
    expect(config.sdNodeOrKeyName).toBe('run');
  });

  it('offers attribute translators for all valid w:r attributes', () => {
    const xmlNames = config.attributes.map((attr) => attr.xmlName);
    expect(xmlNames).toEqual(['w:rsidR', 'w:rsidRPr', 'w:rsidDel']);
  });

  it('encodes a run node wrapping translated children', () => {
    const fakeChild = { type: 'text', text: 'Hello', marks: [] };
    const runNode = { name: 'w:r', elements: [{ name: 'w:t', elements: [{ type: 'text', text: 'Hello' }] }] };

    const params = {
      nodes: [runNode],
      nodeListHandler: { handler: vi.fn(() => [fakeChild]) },
      docx: {},
    };
    const out = translator.encode(params);

    expect(out?.type).toBe('run');
    expect(Array.isArray(out.content)).toBe(true);
    expect(out.content[0]).toMatchObject({ type: 'text', text: 'Hello' });
  });

  it('converts w:b run property into a bold mark', () => {
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
      docx: {},
    };

    const node = translator.encode(params);
    expect(node.type).toBe('run');
    const child = node.content[0];
    expect(child.marks?.some((mark) => mark.type === 'bold')).toBe(true);
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
      docx: {},
    };

    const node = translator.encode(params);
    const textNode = node.content[0];
    const textStyleMark = textNode.marks?.find((mark) => mark.type === 'textStyle');
    expect(textStyleMark).toBeDefined();
    expect(textStyleMark.attrs).toMatchObject({ fontFamily: 'Arial, sans-serif', fontSize: '16pt' });
  });

  it('returns a run node containing multiple items such as tabs', () => {
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
      docx: {},
    };

    const result = translator.encode(params);

    expect(result.type).toBe('run');
    expect(result.content).toHaveLength(3);
    expect(result.content[0].type).toBe('text');
    expect(result.content[1]).toMatchObject({ type: 'tab', attrs: { val: 'start' } });
    expect(result.content[2].type).toBe('text');
  });
});
