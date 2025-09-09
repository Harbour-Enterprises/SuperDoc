import { expect } from 'vitest';
import { defaultNodeListHandler } from '@converter/v2/importer/docxImporter.js';
import { getTestDataByFileName } from '@tests/helpers/helpers.js';
import { getExportedResult } from '../../export/export-helpers/index';
import { loadTestDataForEditorTests, initTestEditor } from '@tests/helpers/helpers.js';

describe('[sdt-node-comment.docx] Test basic text SDT tag from gdocs', async () => {
  const fileName = 'sdt-node-comment.docx';
  let docx, media, mediaFiles, fonts, editor, dispatch;
  let doc;
  let exported, body;

  beforeAll(async () => {
    ({ docx, media, mediaFiles, fonts } = await loadTestDataForEditorTests(fileName));
    ({ editor, dispatch } = initTestEditor({ content: docx, media, mediaFiles, fonts }));
    doc = editor.getJSON();

    exported = await getExportedResult(fileName);
    body = exported.elements?.find((el) => el.name === 'w:body');
  });

  it('imports the sdt node with content', () => {
    const content = doc.content;
    expect(content.length).toBe(2);

    const p1 = content[0];
    expect(p1.type).toBe('paragraph');
    const p1Content = p1.content.filter((n) => !n.type.startsWith('docxPassthrough'));
    expect(p1Content.length).toBe(2);

    const sdtNode = p1Content[0];
    expect(sdtNode.type).toBe('structuredContent');
    const sdtInner = sdtNode.content.filter((n) => !n.type.startsWith('docxPassthrough'));
    expect(sdtInner.length).toBe(3);
    expect(sdtNode.attrs.sdtPr).toBeDefined();

    const sdtPr = sdtNode.attrs.sdtPr;
    expect(sdtPr.elements.length).toBe(3);
    expect(sdtPr.name).toBe('w:sdtPr');

    const { marks } = sdtNode;
    expect(marks.length).toBe(2);

    const bold = marks.find((mark) => mark.type === 'bold');
    expect(bold).toBeDefined();

    const textStyle = marks.find((mark) => mark.type === 'textStyle');
    expect(textStyle).toBeDefined();

    const textBeforeComment = sdtInner[0];
    expect(textBeforeComment.type).toBe('text');
    expect(textBeforeComment.text).toBe('SDT field with ');

    const commentText = sdtInner[1];
    expect(commentText.type).toBe('text');
    expect(commentText.text).toBe('text and comment');

    const extraTextAfterSdt = p1Content[1];
    expect(extraTextAfterSdt.type).toBe('text');
    expect(extraTextAfterSdt.text).toBe(' text');

    const { marks: extraTextMarks } = extraTextAfterSdt;
    expect(extraTextMarks.length).toBe(2);
    const extraBold = extraTextMarks.find((mark) => mark.type === 'bold');
    expect(extraBold).toBeDefined();

    const extraTextStyle = extraTextMarks.find((mark) => mark.type === 'textStyle');
    expect(extraTextStyle).toBeDefined();
  });

  it('exports the sdt node correctly', () => {
    const p1 = body.elements[0];

    const sdtNode = p1.elements.find((el) => el.name === 'w:sdt');
    expect(sdtNode).toBeDefined();
    const sdtPr = sdtNode.elements.find((el) => el.name === 'w:sdtPr');
    expect(sdtPr.name).toBe('w:sdtPr');
    expect(sdtPr.elements.length).toBe(3);

    const sdtContent = sdtNode.elements.find((el) => el.name === 'w:sdtContent');
    expect(sdtContent.name).toBe('w:sdtContent');
    let sdtParagraphs = sdtContent.elements.filter((el) => el.name === 'w:p');
    if (sdtParagraphs.length === 0) {
      sdtParagraphs = sdtContent.elements.filter((el) => el.name === 'w:r');
    }
    expect(sdtParagraphs.length).toBe(2);

    const getText = (el) => {
      if (el.name === 'w:p') {
        return el.elements.find((c) => c.name === 'w:r')?.elements.find((c) => c.name === 'w:t');
      }
      return el.elements.find((c) => c.name === 'w:t');
    };

    const textBeforeComment = getText(sdtParagraphs[0]);
    expect(textBeforeComment.elements[0].text).toBe('SDT field with ');

    const commentText = getText(sdtParagraphs[1]);
    expect(commentText.elements[0].text).toBe('text and comment');

    const runAfterSdt = p1.elements.slice(p1.elements.indexOf(sdtNode) + 1).find((el) => el.name === 'w:r');
    const extraTextAfterSdt = runAfterSdt?.elements.find((el) => el.name === 'w:t');
    expect(extraTextAfterSdt.elements[0].text).toBe(' text');
  });
});
