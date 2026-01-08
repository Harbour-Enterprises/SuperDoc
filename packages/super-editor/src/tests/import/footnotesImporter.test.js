import { describe, expect, it } from 'vitest';
import { createDocumentJson } from '@core/super-converter/v2/importer/docxImporter';
import { parseXmlToJson } from '@converter/v2/docxHelper.js';

const collectNodeTypes = (node, types = []) => {
  if (!node) return types;
  if (typeof node.type === 'string') types.push(node.type);
  const content = Array.isArray(node.content) ? node.content : [];
  content.forEach((child) => collectNodeTypes(child, types));
  return types;
};

describe('footnotes import', () => {
  it('imports w:footnoteReference and loads matching footnotes.xml entry', () => {
    const documentXml =
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body>' +
      '<w:p>' +
      '<w:r><w:t>Hello</w:t></w:r>' +
      '<w:r><w:footnoteReference w:id="1"/></w:r>' +
      '</w:p>' +
      '</w:body>' +
      '</w:document>';

    const footnotesXml =
      '<w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:footnote w:id="-1" w:type="separator"><w:p><w:r><w:separator/></w:r></w:p></w:footnote>' +
      '<w:footnote w:id="1"><w:p><w:r><w:t>Footnote text</w:t></w:r></w:p></w:footnote>' +
      '</w:footnotes>';

    const docx = {
      'word/document.xml': parseXmlToJson(documentXml),
      'word/footnotes.xml': parseXmlToJson(footnotesXml),
    };

    const converter = { headers: {}, footers: {}, headerIds: {}, footerIds: {}, docHiglightColors: new Set() };
    const editor = { options: {}, emit: () => {} };

    const result = createDocumentJson(docx, converter, editor);
    expect(result).toBeTruthy();

    expect(Array.isArray(result.footnotes)).toBe(true);
    expect(result.footnotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: '1',
          text: 'Footnote text',
        }),
      ]),
    );

    const types = collectNodeTypes(result.pmDoc);
    expect(types).toContain('footnoteReference');
  });
});

