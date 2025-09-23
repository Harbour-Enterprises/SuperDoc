import { addDefaultStylesIfMissing, createDocumentJson } from '@core/super-converter/v2/importer/docxImporter';
import { DEFAULT_LINKED_STYLES } from '../../core/super-converter/exporter-docx-defs';
import { parseXmlToJson } from '@converter/v2/docxHelper.js';

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
});
