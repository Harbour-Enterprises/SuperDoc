import { expect } from 'vitest';
import { translateTableRow } from '../../core/super-converter/exporter.js';

// minimal editor mock
const createMockEditor = () => ({
  extensions: { find: () => null },
  schema: { marks: {} },
});

describe('Table Row Exporter cantSplit', () => {
  it('exports <w:cantSplit/> when attrs.cantSplit is true', () => {
    const mockEditor = createMockEditor();
    const rowNode = {
      type: 'tableRow',
      attrs: { cantSplit: true },
      content: [],
    };

    const result = translateTableRow({ editor: mockEditor, node: rowNode });

    expect(result.name).toBe('w:tr');
    const trPr = result.elements.find((el) => el.name === 'w:trPr');
    expect(trPr).toBeDefined();
    const cantSplit = trPr.elements.find((el) => el.name === 'w:cantSplit');
    expect(cantSplit).toBeDefined();
  });
});
