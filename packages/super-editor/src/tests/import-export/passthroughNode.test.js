import { describe, it, expect } from 'vitest';
import { defaultNodeListHandler } from '../../core/super-converter/v2/importer/docxImporter.js';
import { exportSchemaToJson } from '../../core/super-converter/exporter.js';

describe('docx passthrough nodes', () => {
  it('preserves unknown block nodes through import/export', () => {
    const nodeListHandler = defaultNodeListHandler();
    const xmlNode = { name: 'w:unknownBlock', attributes: { foo: 'bar' } };
    const result = nodeListHandler.handler({
      nodes: [xmlNode],
      docx: {},
      converter: null,
      editor: null,
      isBlock: true,
    });
    expect(result).toHaveLength(1);
    const passthrough = result[0];
    expect(passthrough.type).toBe('docxPassthroughBlock');
    expect(passthrough.attrs.originalXml).toEqual(xmlNode);
    const exported = exportSchemaToJson({ node: passthrough });
    expect(exported).toEqual(xmlNode);
  });

  it('preserves unknown inline nodes through import/export', () => {
    const nodeListHandler = defaultNodeListHandler();
    const xmlNode = { name: 'w:unknownInline', attributes: { foo: 'baz' } };
    const result = nodeListHandler.handler({
      nodes: [xmlNode],
      docx: {},
      converter: null,
      editor: null,
      isBlock: false,
    });
    expect(result).toHaveLength(1);
    const passthrough = result[0];
    expect(passthrough.type).toBe('docxPassthroughInline');
    expect(passthrough.attrs.originalXml).toEqual(xmlNode);
    const exported = exportSchemaToJson({ node: passthrough });
    expect(exported).toEqual(xmlNode);
  });
});
