
import { it } from 'vitest';

import { handleAnnotationNode } from '@converter/v2/importer/annotationImporter.js';
import { defaultNodeListHandler } from '@converter/v2/importer/docxImporter.js';
import { getTestDataByFileName } from '@tests/helpers/helpers.js';



describe('handleAnnotationNode', () => {
  const mockEditor = {
    options: {}
  };

  describe('basic annotation node handling', () => {
    it('should return empty result for empty nodes', () => {
      const result = handleAnnotationNode({
        nodes: [],
        docx: {},
        nodeListHandler: defaultNodeListHandler(),
        editor: mockEditor,
      });
      expect(result).toEqual({ nodes: [], consumed: 0 });
    });

    it('should return empty result for non sdt node', () => {
      const result = handleAnnotationNode({
        nodes: [{ name: 'w:p' }],
        docx: {},
        nodeListHandler: defaultNodeListHandler(),
        editor: mockEditor,
      });
      expect(result).toEqual({ nodes: [], consumed: 0 });
    });

    it('should return fieldAnnotation type when annotations is true', async () => {
      const mockEditorWithAnnotations = {
        options: {
          annotations: true
        }
      };

      const docx = await getTestDataByFileName('annotations_import_2.docx');
      const documentXml = docx['word/document.xml'];
      const doc = documentXml.elements[0];
      const body = doc.elements[0];
      const content = body.elements;
      // Get the first annotation node - "Enter your full name" field
      const paragraphWithField = content[4];
      const result = handleAnnotationNode({
        nodes: [paragraphWithField.elements[1]],
        docx,
        nodeListHandler: defaultNodeListHandler(),
        editor: mockEditorWithAnnotations,
      });

      expect(result.nodes[0].type).toBe('fieldAnnotation');
      expect(result.nodes[0].attrs.fieldId).toBe('agreementinput-1741026604177-450029465509');
      expect(result.nodes[0].attrs.displayLabel).toBe('Enter your full name');
      expect(result.nodes[0].attrs.type).toBe('text');
      expect(result.nodes[0].attrs.fieldType).toBe('NAMETEXTINPUT');
      expect(result.nodes[0].attrs.fieldColor).toBe('#6943d0');
    });

    it('should return text type when annotations is false', async () => {
      const mockEditorWithoutAnnotations = {
        options: {
          annotations: false
        }
      };

      const docx = await getTestDataByFileName('annotations_import_2.docx');
      const documentXml = docx['word/document.xml'];
      const doc = documentXml.elements[0];
      const body = doc.elements[0];
      const content = body.elements;
      // Get the second annotation node - "Enter company name" field
      const paragraphWithField = content[5];

      const result = handleAnnotationNode({
        nodes: [paragraphWithField.elements[1]],
        docx,
        nodeListHandler: defaultNodeListHandler(),
        editor: mockEditorWithoutAnnotations,
      });

      expect(result.nodes[0].type).toBe('text');
      expect(result.nodes[0].text).toBe('{{Enter company name}}');
      expect(result.nodes[0].attrs.fieldId).toBe('agreementinput-1741026607449-98007837804');
      expect(result.nodes[0].attrs.displayLabel).toBe('Enter company name');
      expect(result.nodes[0].attrs.type).toBe('text');
      expect(result.nodes[0].attrs.fieldType).toBe('COMPANYNAMETEXTINPUT');
      expect(result.nodes[0].attrs.fieldColor).toBe('#6943d0');
    });
  });

  describe('annotation marks parsing', () => {
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
  
});
