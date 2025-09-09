import { defaultNodeListHandler } from '@converter/v2/importer/docxImporter.js';

describe('ignored nodes during import', () => {
  it('drops nodes defined in the ignore list', () => {
    const nodeListHandler = defaultNodeListHandler();
    const result = nodeListHandler.handler({
      nodes: [{ name: 'w:proofErr' }],
      docx: {},
      converter: {},
      editor: {},
      nodeListHandler,
      lists: {},
    });
    expect(result).toEqual([]);
  });
});
