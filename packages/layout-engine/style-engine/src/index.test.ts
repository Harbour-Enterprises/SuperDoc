import { describe, expect, it, beforeEach } from 'vitest';
import {
  resolveNumbering,
  resolveStyle,
  resolveTableCellStyle,
  StyleContext,
  StyleNode,
  resolveSdtMetadata,
  clearSdtMetadataCache,
} from './index.js';

const baseContext: StyleContext = {
  defaults: {
    paragraphFont: 'Calibri',
    fontSize: 11,
  },
};

describe('style-engine resolveStyle', () => {
  it('returns defaults when no style info is provided', () => {
    const result = resolveStyle({}, baseContext);
    expect(result.paragraph.spacing).toEqual({
      before: 0,
      after: 0,
      line: 12,
      lineRule: 'auto',
    });
    expect(result.character.font?.family).toBe('Calibri, sans-serif');
    expect(result.paragraph.tabs).toEqual([]);
  });

  it('applies style chain inheritance', () => {
    const context: StyleContext = {
      ...baseContext,
      styles: {
        Normal: {
          id: 'Normal',
          paragraph: { spacing: { before: 6 } },
        },
        Heading1: {
          id: 'Heading1',
          basedOn: 'Normal',
          paragraph: { spacing: { before: 12 }, indent: { left: 18 } },
        },
      },
    };

    const node: StyleNode = { styleId: 'Heading1' };
    const result = resolveStyle(node, context);
    expect(result.paragraph.spacing?.before).toBe(12);
    expect(result.paragraph.indent?.left).toBe(18);
  });

  it('applies fallback font families from defaults', () => {
    const context: StyleContext = {
      defaults: {
        paragraphFont: 'Cambria',
        paragraphFontFallback: 'Georgia, serif',
      },
    };
    const result = resolveStyle({}, context);
    expect(result.character.font?.family).toBe('Cambria, Georgia, serif');
  });

  it('handles basedOn cycles without infinite loops', () => {
    const context: StyleContext = {
      ...baseContext,
      styles: {
        Normal: {
          id: 'Normal',
          basedOn: 'Heading1',
          paragraph: { indent: { left: 24 } },
        },
        Heading1: {
          id: 'Heading1',
          basedOn: 'Normal',
          paragraph: { spacing: { before: 8 } },
        },
      },
    };

    const result = resolveStyle({ styleId: 'Heading1' }, context);
    expect(result.paragraph.indent?.left).toBe(24);
    expect(result.paragraph.spacing?.before).toBe(8);
  });

  it('prefers node numbering overrides over style chain numbering', () => {
    const context: StyleContext = {
      ...baseContext,
      styles: {
        ListParagraph: {
          id: 'ListParagraph',
          numbering: { numId: 'num1', level: 0 },
        },
      },
      numbering: {
        num1: {
          levels: [
            {
              level: 0,
              format: 'decimal',
              indent: { left: 36, hanging: 18 },
            },
          ],
        },
        num2: {
          levels: [
            {
              level: 0,
              format: 'upperLetter',
              indent: { left: 48, hanging: 24 },
            },
          ],
        },
      },
    };

    const node: StyleNode = {
      styleId: 'ListParagraph',
      numbering: { numId: 'num2', level: 0 },
    };
    const result = resolveStyle(node, context);
    expect(result.numbering?.numId).toBe('num2');
    expect(result.numbering?.format).toBe('upperLetter');
  });

  it('overrides style tabs when direct formatting supplies explicit tabs', () => {
    const context: StyleContext = {
      ...baseContext,
      styles: {
        Tabbable: {
          id: 'Tabbable',
          paragraph: {
            tabs: [{ pos: 36, align: 'left' }],
          },
        },
      },
    };

    const node: StyleNode = {
      styleId: 'Tabbable',
      paragraphProps: { tabs: [] },
    };
    const result = resolveStyle(node, context);
    expect(result.paragraph.tabs).toEqual([]);
  });

  it('merges character formatting between styles and direct props', () => {
    const context: StyleContext = {
      ...baseContext,
      styles: {
        Emphasis: {
          id: 'Emphasis',
          character: { font: { weight: 700 }, color: '#222222' },
        },
      },
    };

    const node: StyleNode = {
      styleId: 'Emphasis',
      characterProps: {
        font: { italic: true },
        underline: { style: 'dotted' },
      },
    };
    const result = resolveStyle(node, context);
    expect(result.character.font?.weight).toBe(700);
    expect(result.character.font?.italic).toBe(true);
    expect(result.character.underline?.style).toBe('dotted');
    expect(result.character.color).toBe('#222222');
  });

  it('merges shading values from style chain and direct formatting', () => {
    const context: StyleContext = {
      ...baseContext,
      styles: {
        Shaded: {
          id: 'Shaded',
          paragraph: { shading: { fill: '#eeeeee' } },
        },
      },
    };

    const node: StyleNode = {
      styleId: 'Shaded',
      paragraphProps: { shading: { pattern: 'clear' } },
    };

    const result = resolveStyle(node, context);
    expect(result.paragraph.shading).toEqual({ pattern: 'clear' });
  });

  it('merges paragraph borders without clobbering unspecified sides', () => {
    const context: StyleContext = {
      ...baseContext,
      styles: {
        Bordered: {
          id: 'Bordered',
          paragraph: {
            borders: {
              top: { style: 'solid', width: 1 },
            },
          },
        },
      },
    };

    const node: StyleNode = {
      styleId: 'Bordered',
      paragraphProps: {
        borders: {
          bottom: { style: 'dotted', width: 2 },
        },
      },
    };

    const result = resolveStyle(node, context);
    expect(result.paragraph.borders?.top).toEqual({ style: 'solid', width: 1 });
    expect(result.paragraph.borders?.bottom).toEqual({ style: 'dotted', width: 2 });
  });

  it('applies character overrides even when no style definitions exist', () => {
    const node: StyleNode = {
      characterProps: { font: { weight: 600 }, color: '#123456' },
    };
    const result = resolveStyle(node, baseContext);
    expect(result.character.font?.weight).toBe(600);
    expect(result.character.color).toBe('#123456');
  });

  it('leaves numbering undefined when referenced definition is missing', () => {
    const context: StyleContext = {
      ...baseContext,
      styles: {
        ListParagraph: {
          id: 'ListParagraph',
          numbering: { numId: 'missing', level: 0 },
        },
      },
    };

    const result = resolveStyle({ styleId: 'ListParagraph' }, context);
    expect(result.numbering).toBeUndefined();
  });

  it('applies numbering indent from style chain when definition exists', () => {
    const context: StyleContext = {
      ...baseContext,
      styles: {
        ListParagraph: {
          id: 'ListParagraph',
          numbering: { numId: 'num1', level: 0 },
        },
      },
      numbering: {
        num1: {
          levels: [
            {
              level: 0,
              indent: { left: 54, hanging: 18 },
            },
          ],
        },
      },
    };

    const result = resolveStyle({ styleId: 'ListParagraph' }, context);
    expect(result.numbering?.indent).toEqual({ left: 54, hanging: 18 });
  });

  it('merges direct formatting over styles', () => {
    const context: StyleContext = {
      ...baseContext,
      styles: {
        Normal: {
          id: 'Normal',
          paragraph: { indent: { left: 12 } },
        },
      },
    };

    const node: StyleNode = {
      styleId: 'Normal',
      paragraphProps: { indent: { left: 24, right: 6 } },
    };
    const result = resolveStyle(node, context);
    expect(result.paragraph.indent?.left).toBe(24);
    expect(result.paragraph.indent?.right).toBe(6);
  });

  it('resolves numbering from style chain and node overrides', () => {
    const context: StyleContext = {
      ...baseContext,
      styles: {
        ListParagraph: {
          id: 'ListParagraph',
          numbering: { numId: 'num1', level: 0 },
        },
      },
      numbering: {
        num1: {
          levels: [
            {
              level: 0,
              format: 'decimal',
              text: '%1.',
              start: 1,
              indent: { left: 36, hanging: 18 },
            },
          ],
        },
      },
    };

    const node: StyleNode = { styleId: 'ListParagraph' };
    const styleResult = resolveStyle(node, context);
    expect(styleResult.numbering).toEqual({
      numId: 'num1',
      level: 0,
      indent: { left: 36, hanging: 18 },
      format: 'decimal',
      text: '%1.',
      start: 1,
    });

    const overrideNode: StyleNode = {
      numbering: { numId: 'num1', level: 0 },
    };
    const overrideResult = resolveStyle(overrideNode, context);
    expect(overrideResult.numbering?.numId).toBe('num1');
  });

  it('attaches SDT metadata when provided via options', () => {
    const result = resolveStyle({}, baseContext, {
      sdt: {
        nodeType: 'documentSection',
        attrs: { id: '10', title: 'Intro', description: 'Overview', isLocked: true },
      },
    });

    expect(result.sdt).toEqual({
      type: 'documentSection',
      id: '10',
      title: 'Intro',
      description: 'Overview',
      sectionType: null,
      isLocked: true,
      sdBlockId: null,
    });
  });
});

describe('style-engine resolveNumbering', () => {
  it('returns undefined when numbering definition missing', () => {
    const result = resolveNumbering('missing', 0, baseContext);
    expect(result).toBeUndefined();
  });

  it('returns level definition when available', () => {
    const context: StyleContext = {
      numbering: {
        num2: {
          levels: [
            {
              level: 0,
              format: 'upperLetter',
              text: '%1)',
              start: 5,
              indent: { left: 40, hanging: 20 },
            },
          ],
        },
      },
    };

    const result = resolveNumbering('num2', 0, context);
    expect(result).toEqual({
      numId: 'num2',
      level: 0,
      indent: { left: 40, hanging: 20 },
      format: 'upperLetter',
      text: '%1)',
      start: 5,
    });
  });

  it('falls back to positional level when explicit level entry is missing', () => {
    const context: StyleContext = {
      numbering: {
        num3: {
          levels: [
            {
              level: 0,
              format: 'decimal',
              indent: { left: 32, hanging: 16 },
            },
            {
              level: 2,
              format: 'lowerLetter',
              indent: { left: 48, hanging: 24 },
            },
          ],
        },
      },
    };

    const result = resolveNumbering('num3', 1, context);
    expect(result).toEqual({
      numId: 'num3',
      level: 1,
      indent: { left: 48, hanging: 24 },
      format: 'lowerLetter',
      text: '%1.',
      start: 1,
    });
  });

  it('defaults text and start values when level omits them', () => {
    const context: StyleContext = {
      numbering: {
        num4: {
          levels: [
            {
              level: 0,
              format: 'decimal',
            },
          ],
        },
      },
    };

    const result = resolveNumbering('num4', 0, context);
    expect(result?.text).toBe('%1.');
    expect(result?.start).toBe(1);
  });

  it('returns undefined when level index exceeds available definitions', () => {
    const context: StyleContext = {
      numbering: {
        num5: {
          levels: [
            {
              level: 0,
              format: 'decimal',
            },
          ],
        },
      },
    };

    const result = resolveNumbering('num5', 5, context);
    expect(result).toBeUndefined();
  });
});

describe('resolveSdtMetadata', () => {
  beforeEach(() => {
    clearSdtMetadataCache();
  });

  it('normalizes field annotation metadata', () => {
    const metadata = resolveSdtMetadata({
      nodeType: 'fieldAnnotation',
      attrs: {
        type: 'text',
        fieldId: 'field-123',
        displayLabel: 'Customer',
        defaultDisplayLabel: 'Customer',
        alias: 'Customer Name',
        fieldColor: '#ff00ff',
        borderColor: 'None',
        highlighted: 'false',
        fontFamily: 'Calibri',
        fontSize: '12pt',
        textColor: '#333333',
        textHighlight: '#ffff00',
        linkUrl: 'https://example.com',
        imageSrc: null,
        rawHtml: { html: '<p>hello</p>' },
        size: { width: '120', height: 32 },
        extras: { foo: 'bar' },
        multipleImage: 'true',
        hash: 'abc123',
        generatorIndex: '2',
        sdtId: '456',
        hidden: 'false',
        visibility: 'Hidden',
        isLocked: 'true',
        bold: 'true',
        italic: false,
        underline: 'true',
      },
    });

    expect(metadata).toEqual({
      type: 'fieldAnnotation',
      fieldId: 'field-123',
      variant: 'text',
      fieldType: undefined,
      displayLabel: 'Customer',
      defaultDisplayLabel: 'Customer',
      alias: 'Customer Name',
      fieldColor: '#ff00ff',
      borderColor: undefined,
      highlighted: false,
      fontFamily: 'Calibri',
      fontSize: '12pt',
      textColor: '#333333',
      textHighlight: '#ffff00',
      linkUrl: 'https://example.com',
      imageSrc: null,
      rawHtml: { html: '<p>hello</p>' },
      size: { width: 120, height: 32 },
      extras: { foo: 'bar' },
      multipleImage: true,
      hash: 'abc123',
      generatorIndex: 2,
      sdtId: '456',
      hidden: false,
      visibility: 'hidden',
      isLocked: true,
      formatting: { bold: true, underline: true },
      marks: undefined,
    });
  });

  it('supports structured content blocks', () => {
    const metadata = resolveSdtMetadata({
      nodeType: 'structuredContentBlock',
      attrs: { id: '42', tag: 'block', alias: 'Block Alias', sdtPr: { foo: 'bar' } },
    });
    expect(metadata).toEqual({
      type: 'structuredContent',
      scope: 'block',
      id: '42',
      tag: 'block',
      alias: 'Block Alias',
      sdtPr: { foo: 'bar' },
    });
  });

  it('normalizes document section metadata', () => {
    const metadata = resolveSdtMetadata({
      nodeType: 'documentSection',
      attrs: { id: 's1', title: 'Section', description: 'Desc', sectionType: 'legal', isLocked: 'true' },
    });
    expect(metadata).toEqual({
      type: 'documentSection',
      id: 's1',
      title: 'Section',
      description: 'Desc',
      sectionType: 'legal',
      isLocked: true,
      sdBlockId: null,
    });
  });

  it('returns undefined for unsupported node types', () => {
    expect(resolveSdtMetadata({ nodeType: 'unknown', attrs: {} })).toBeUndefined();
  });

  it('uses cache when cache key is provided', () => {
    const attrs: Record<string, unknown> = {
      type: 'text',
      fieldId: 'cache-field',
      displayLabel: 'Cached label',
      hash: 'cache-hash',
    };
    const first = resolveSdtMetadata({ nodeType: 'fieldAnnotation', attrs });
    attrs.displayLabel = 'Mutated label';
    const second = resolveSdtMetadata({ nodeType: 'fieldAnnotation', attrs });
    expect(second).toBe(first);
    expect(second?.displayLabel).toBe('Cached label');
  });

  it('handles field annotation with minimal attrs (only fieldId)', () => {
    const metadata = resolveSdtMetadata({
      nodeType: 'fieldAnnotation',
      attrs: { fieldId: 'MINIMAL_FIELD' },
    });

    expect(metadata).toEqual({
      type: 'fieldAnnotation',
      fieldId: 'MINIMAL_FIELD',
      variant: undefined,
      fieldType: undefined,
      displayLabel: undefined,
      defaultDisplayLabel: undefined,
      alias: undefined,
      fieldColor: undefined,
      borderColor: undefined,
      highlighted: true,
      fontFamily: null,
      fontSize: null,
      textColor: null,
      textHighlight: null,
      linkUrl: null,
      imageSrc: null,
      rawHtml: undefined,
      size: null,
      extras: null,
      multipleImage: false,
      hash: null,
      generatorIndex: null,
      sdtId: null,
      hidden: false,
      visibility: undefined,
      isLocked: false,
      formatting: undefined,
      marks: undefined,
    });
  });

  it('handles field annotation with missing fieldId (defaults to empty string)', () => {
    const metadata = resolveSdtMetadata({
      nodeType: 'fieldAnnotation',
      attrs: {},
    });

    expect(metadata?.fieldId).toBe('');
    expect(metadata?.type).toBe('fieldAnnotation');
  });

  it('supports all field annotation variants', () => {
    const variants = ['text', 'image', 'signature', 'checkbox', 'html', 'link'] as const;

    variants.forEach((variant) => {
      const metadata = resolveSdtMetadata({
        nodeType: 'fieldAnnotation',
        attrs: { type: variant, fieldId: `field-${variant}` },
      });
      expect(metadata?.variant).toBe(variant);
    });
  });

  it('handles docPartObject metadata', () => {
    const metadata = resolveSdtMetadata({
      nodeType: 'docPartObject',
      attrs: {
        docPartGallery: 'Table of Contents',
        id: 'toc-unique-1', // Changed from docPartUnique to id
        alias: 'TOC',
        instruction: 'TOC \\o "1-3"',
      },
    });
    expect(metadata).toEqual({
      type: 'docPartObject',
      gallery: 'Table of Contents',
      uniqueId: 'toc-unique-1',
      alias: 'TOC',
      instruction: 'TOC \\o "1-3"',
    });
  });
});
describe('style-engine resolveTableCellStyle', () => {
  it('reuses resolveStyle defaults for table cells for now', () => {
    const tableContext: StyleContext = {
      defaults: {
        paragraphFont: 'Arial',
        fontSize: 10,
      },
    };

    const cellStyle = resolveTableCellStyle({}, 0, 0, tableContext);
    expect(cellStyle.paragraph.alignment).toBe('left');
    expect(cellStyle.character.font?.family).toBe('Arial, sans-serif');
  });
});
