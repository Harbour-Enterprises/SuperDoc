import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initTestEditor, loadTestDataForEditorTests } from '../../tests/helpers/helpers.js';

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
    const node = editor.state.doc.content.content[0];
    expect(node.type.name).toBe('paragraph');
    expect(node.attrs.paragraphProperties?.styleId).toBe('Heading1');

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
        type: 'element',
        attributes: {},
        elements: [
          {
            name: 'w:pStyle',
            attributes: {
              'w:val': 'Heading1',
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
          },
        ],
      },
    ]);
    const run = paragraph.elements.find((el) => el.name === 'w:r');
    expect(run).toBeDefined();
    const textNode = run.elements.find((el) => el.name === 'w:t');
    expect(textNode?.elements?.[0]?.text).toBe('Test Heading');
  });

  it('inserting plain text creates a simple paragraph', async () => {
    editor.commands.insertContent('This is a test paragraph.');
    expect(editor.state.doc.content.content[0].type.name).toBe('paragraph');
    expect(editor.state.doc.content.content[0].attrs.paragraphProperties?.styleId).toBeUndefined();
    const result = await editor.exportDocx({
      exportJsonOnly: true,
    });

    const body = result.elements[0];

    expect(body.elements).toHaveLength(2);
    expect(body.elements.map((el) => el.name)).toEqual(['w:p', 'w:sectPr']);
    const paragraph = body.elements[0];
    expect(paragraph.name).toBe('w:p');

    const run = paragraph.elements.find((el) => el.name === 'w:r');
    expect(run).toBeDefined();
    const textNode = run.elements.find((el) => el.name === 'w:t');
    expect(textNode).toBeDefined();
    const textValue = textNode.elements.find((child) => typeof child.text === 'string')?.text;
    expect(textValue).toBe('This is a test paragraph.');
  });
});
