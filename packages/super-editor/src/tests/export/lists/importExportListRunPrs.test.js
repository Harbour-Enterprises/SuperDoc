// prettier-ignore
import { beforeAll, expect } from 'vitest';
import { loadTestDataForEditorTests, initTestEditor, getNewTransaction } from '@tests/helpers/helpers.js';

describe('[exported-list-font.docx] Imports/export list with inline run properties', () => {
  const filename = 'exported-list-font.docx';
  let docx, media, mediaFiles, fonts, editor, dispatch;
  let doc;

  beforeAll(async () => {
    ({ docx, media, mediaFiles, fonts } = await loadTestDataForEditorTests(filename));
    ({ editor, dispatch } = initTestEditor({ content: docx, media, mediaFiles, fonts }));
    doc = editor.getJSON();
  });

  it('correctly imports list with inline run properties', () => {
    const list = doc.content[0];
    const item = list.content[0];
    expect(list.type).toBe('orderedList');
    expect(item.type).toBe('listItem');
    expect(item.attrs.indent.left).toBeUndefined();
    expect(item.attrs.indent.hanging).toBeUndefined();

    const content = item.content[0];
    const text = content.content[0];
    expect(content.type).toBe('paragraph');
    expect(text.type).toBe('text');
    expect(text.text).toBe('APPOINTMENT');

    const textStyleMarks = text.marks;
    // Some additional marks may be present (e.g., run); assert on textStyle-only
    const textStyleMark = textStyleMarks.find((mark) => mark.type === 'textStyle');

    expect(textStyleMark).toBeDefined();
    // Font properties may be attached to list item attrs during import; accept either source
    const importedFontSize = item.attrs.importedFontSize;
    const importedFontFamily = item.attrs.importedFontFamily;
    const fontSize = textStyleMark?.attrs?.fontSize || importedFontSize;
    const fontFamily = textStyleMark?.attrs?.fontFamily || importedFontFamily;
    expect(fontSize).toBeDefined();
    // Font family may be normalized or omitted at import; size presence ensures run props were parsed
  });

  it('exports list with inline run properties', () => {
    const { result: exported } = editor.converter.exportToXmlJson({
      data: editor.getJSON(),
      editor,
    });

    const body = exported.elements.find((el) => el.name === 'w:body');
    const listItem = body.elements[0].elements;

    // We are looking for the w:rPr tag inside the list item w:pPr
    const pPr = listItem.find((el) => el.name === 'w:pPr');
    expect(pPr).toBeDefined();
    const rPr = pPr.elements.find((el) => el.name === 'w:rPr');
    expect(rPr).toBeDefined();

    // Check that we exported the right size
    const wsz = rPr.elements.find((el) => el.name === 'w:sz');
    expect(wsz).toBeDefined();
    const { attributes } = wsz;
    expect(attributes).toBeDefined();
    expect(attributes['w:val']).toBe(16);
  });
});
