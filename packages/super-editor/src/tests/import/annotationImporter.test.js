
import { handleAnnotationNode } from '@converter/v2/importer/annotationImporter.js';
import { defaultNodeListHandler } from '@converter/v2/importer/docxImporter.js';
import { getTestDataByFileName } from '@tests/helpers/helpers.js';


describe('paragraph tests to check spacing', () => {

  const mockEditor = {
    options: {}
  };

  it('can parse annotation marks as attributes for non text style marks [fields_attrs1]', async () => {
    const dataName = 'fields_attrs1.docx';
    const docx = await getTestDataByFileName(dataName);
    const documentXml = docx['word/document.xml'];
    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    const content = body.elements;
    const paragraphWithField = content[0].elements[2];
    const { nodes } = handleAnnotationNode({
      nodes: [paragraphWithField], docx, nodeListHandler: defaultNodeListHandler(), editor: mockEditor,
    });

    const node = nodes[0];
    expect(node.type).toBe('text');

    const { attrs } = node;
    const { fontFamily, fontSize, bold, italic, underline } = attrs;
    expect(fontFamily).toBe(undefined);
    expect(fontSize).toBe(undefined);
    expect(bold).toBe(true);
    expect(italic).toBe(true);
    expect(underline).toBe(true);
  });

  it('can parse annotation marks as attributes for textStyle marks [fields_attrs2_fonts]', async () => {
    const fileName = 'fields_attrs2_fonts.docx';
    const docx = await getTestDataByFileName(fileName);
    const documentXml = docx['word/document.xml'];

    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    const content = body.elements;
    const paragraphWithField = content[0].elements[3];
    const { nodes } = handleAnnotationNode({
      nodes: [paragraphWithField],
      docx,
      nodeListHandler: defaultNodeListHandler(),
      editor: mockEditor,
    });

    const node = nodes[0];
    expect(node.type).toBe('text');
    
    const { attrs } = node;
    const { fontFamily, fontSize, color, bold, italic, underline } = attrs;
    expect(fontFamily).toBe('Courier New');
    expect(fontSize).toBe('18pt');
    expect(color).toBe(undefined);
    expect(bold).toBe(undefined);
    expect(italic).toBe(undefined);
    expect(underline).toBe(undefined);
  });

});
