import { loadTestDataForEditorTests, initTestEditor } from '@tests/helpers/helpers.js';
import { getListItemStyleDefinitions } from '@extensions/list-item/list-item.js';
import { expect } from 'vitest';

describe(' test getListItemStyleDefinitions', () => {

  const filename = 'base-custom.docx';
  let docx, media, mediaFiles, fonts, editor;
  beforeAll(async () => ({ docx, media, mediaFiles, fonts } = await loadTestDataForEditorTests(filename)));
  beforeEach(() => ({ editor } = initTestEditor({ content: docx, media, mediaFiles, fonts })));

  it('can import the list item style definitions', () => {
    const numId = 1;
    const level = 1;
    const { styleDefinition } = getListItemStyleDefinitions({ styleId: 'ListParagraph', numId, level, editor });
    expect(styleDefinition).toBeDefined();

    const { elements } = styleDefinition;
    expect(elements.length).toBe(6);

    const pPr = elements.find((el) => el.name === 'w:pPr');
    expect(pPr).toBeDefined();

    const indentTag = pPr.elements.find((el) => el.name === 'w:ind');
    expect(indentTag).toBeDefined();
    const indentLeft = indentTag.attributes['w:left'];
    expect(indentLeft).toBe("720");
  });

});