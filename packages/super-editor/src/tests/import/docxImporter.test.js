import { describe, expect, it, vi } from 'vitest';
import { addDefaultStylesIfMissing, createDocumentJson } from '@core/super-converter/v2/importer/docxImporter';
import { DEFAULT_LINKED_STYLES } from '../../core/super-converter/exporter-docx-defs';
import { parseXmlToJson } from '@converter/v2/docxHelper.js';
import { getTestDataByFileName } from '@tests/helpers/helpers.js';
import { extractParagraphText } from '@tests/helpers/getParagraphText.js';

describe('addDefaultStylesIfMissing', () => {
  const styles = {
    declaration: {
      attributes: {
        version: '1.0',
        encoding: 'UTF-8',
        standalone: 'yes',
      },
    },
    elements: [
      {
        type: 'element',
        name: 'w:styles',
        attributes: {
          'xmlns:mc': 'http://schemas.openxmlformats.org/markup-compatibility/2006',
          'xmlns:r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
          'xmlns:w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
          'xmlns:w14': 'http://schemas.microsoft.com/office/word/2010/wordml',
          'xmlns:w15': 'http://schemas.microsoft.com/office/word/2012/wordml',
          'xmlns:w16cex': 'http://schemas.microsoft.com/office/word/2018/wordml/cex',
          'xmlns:w16cid': 'http://schemas.microsoft.com/office/word/2016/wordml/cid',
          'xmlns:w16': 'http://schemas.microsoft.com/office/word/2018/wordml',
          'xmlns:w16du': 'http://schemas.microsoft.com/office/word/2023/wordml/word16du',
          'xmlns:w16sdtdh': 'http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash',
          'xmlns:w16sdtfl': 'http://schemas.microsoft.com/office/word/2024/wordml/sdtformatlock',
          'xmlns:w16se': 'http://schemas.microsoft.com/office/word/2015/wordml/symex',
          'mc:Ignorable': 'w14 w15 w16se w16cid w16 w16cex w16sdtdh w16sdtfl w16du',
        },
        // Assuming there's no elements for simplicity, otherwise the mock would be huge
        elements: [],
      },
    ],
  };

  it.each(Object.keys(DEFAULT_LINKED_STYLES))('adds %s as a default style', (styleId) => {
    const result = addDefaultStylesIfMissing(styles);
    const foundStyle = result.elements[0].elements.find((element) => element.attributes?.['w:styleId'] === styleId);
    expect(foundStyle).toEqual(DEFAULT_LINKED_STYLES[styleId]);
  });
});

describe('createDocumentJson', () => {
  it('handles missing document relationships gracefully', () => {
    const simpleDocXml =
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello</w:t></w:r></w:p></w:body></w:document>';

    const docx = {
      'word/document.xml': parseXmlToJson(simpleDocXml),
    };

    const converter = {
      headers: {},
      footers: {},
      headerIds: {},
      footerIds: {},
    };

    const editor = { options: {} };

    const result = createDocumentJson(docx, converter, editor);

    expect(result).toBeTruthy();
    expect(converter.headers).toEqual({});
    expect(converter.footers).toEqual({});
  });

  it('imports alternatecontent_valid sample and preserves choice content', async () => {
    const docx = await getTestDataByFileName('alternateContent_valid.docx');

    const converter = {
      telemetry: {
        trackFileStructure: vi.fn(),
        trackUsage: vi.fn(),
        trackStatistic: vi.fn(),
      },
      docHiglightColors: new Set(),
    };

    const editor = {
      options: {},
      emit: vi.fn(),
    };

    const result = createDocumentJson(docx, converter, editor);
    expect(result).toBeTruthy();

    const paragraphTexts = (result.pmDoc.content || [])
      .filter((node) => node?.type === 'paragraph')
      .map((paragraph) => extractParagraphText(paragraph));

    expect(paragraphTexts[0]).toBe('This document demonstrates valid uses of mc:AlternateContent for testing.');
    expect(paragraphTexts.some((text) => text.includes('Choice run (bold red, Requires=w14)'))).toBe(true);
    expect(paragraphTexts.some((text) => text.includes('Fallback run (plain)'))).toBe(false);
    expect(paragraphTexts.some((text) => text.includes('Choice paragraph at body level (Requires=w14)'))).toBe(true);
    expect(paragraphTexts.some((text) => text.includes('Fallback paragraph at body level'))).toBe(false);
    expect(paragraphTexts.some((text) => text.includes('Choice A: Requires=w15'))).toBe(true);

    const tableNode = result.pmDoc.content.find((node) => node?.type === 'table');
    expect(tableNode).toBeDefined();

    const tableParagraphTexts = (tableNode?.content || [])
      .flatMap((row) => row?.content || [])
      .flatMap((cell) => cell?.content || [])
      .filter((node) => node?.type === 'paragraph')
      .map((paragraph) => extractParagraphText(paragraph));

    expect(tableParagraphTexts).toContain('Cell-level AlternateContent follows:');
    expect(tableParagraphTexts).toContain('Choice paragraph inside table cell (Requires=w14)');
    expect(tableParagraphTexts).not.toContain('Fallback paragraph inside table cell');
  });
});
