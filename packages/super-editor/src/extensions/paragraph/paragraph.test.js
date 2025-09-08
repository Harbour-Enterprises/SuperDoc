import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initTestEditor, loadTestDataForEditorTests } from '../../tests/helpers/helpers.js';
import { exportSchemaToJson } from '../../core/super-converter/exporter.js';

describe('Paragraph Node', () => {
  let docx, media, mediaFiles, fonts, editor, tr;
  beforeAll(async () => {
    ({ docx, media, mediaFiles, fonts } = await loadTestDataForEditorTests('blank-doc.docx'));
  });

  beforeEach(() => {
    ({ editor } = initTestEditor({ content: docx, media, mediaFiles, fonts }));
    tr = editor.state.tr;
    vi.clearAllMocks();
  });

  it('inserting html with <h1> tag adds paragraph styled as heading', async () => {
    editor.commands.insertContent('<h1>Test Heading</h1>');
    expect(editor.state.doc.content.content[0].type.name).toBe('paragraph');
    expect(editor.state.doc.content.content[0].attrs.styleId).toBe('Heading1');

    const result = await editor.exportDocx({
      exportJsonOnly: true,
    });

    const body = result.elements[0];

    expect(body.elements).toHaveLength(2);
    expect(body.elements.map((el) => el.name)).toEqual(['w:p', 'w:sectPr']);
    const paragraph = body.elements[0];
    expect(paragraph.name).toBe('w:p');
    expect(paragraph.elements).toEqual([
      {
        name: 'w:pPr',
        elements: [
          {
            name: 'w:pStyle',
            attributes: {
              'w:val': 'Heading1',
            },
          },
          {
            name: 'w:spacing',
            attributes: {
              'w:before': 0,
              'w:after': 0,
              'w:lineRule': 'auto',
            },
          },
        ],
      },
      {
        name: 'w:r',
        elements: [
          {
            name: 'w:t',
            elements: [
              {
                text: 'Test Heading',
                type: 'text',
              },
            ],
            attributes: null,
          },
        ],
      },
    ]);
  });
});
