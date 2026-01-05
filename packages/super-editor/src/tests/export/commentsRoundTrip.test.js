import { beforeAll, describe, expect, it } from 'vitest';
import { loadTestDataForEditorTests, initTestEditor } from '@tests/helpers/helpers.js';
import { carbonCopy } from '@core/utilities/carbonCopy.js';
import { importCommentData } from '@converter/v2/importer/documentCommentsImporter.js';
import { Editor, getRichTextExtensions } from '@harbour-enterprises/super-editor';

const extractNodeText = (node) => {
  if (!node) return '';
  if (typeof node.text === 'string') return node.text;
  const content = Array.isArray(node.content) ? node.content : [];
  return content.map((child) => extractNodeText(child)).join('');
};

describe('Google Docs comments import/export round trip', () => {
  const filename = 'gdocs-comments-export.docx';
  let docx;
  let media;
  let mediaFiles;
  let fonts;

  beforeAll(async () => {
    ({ docx, media, mediaFiles, fonts } = await loadTestDataForEditorTests(filename));
  });

  it('keeps both comments intact through export and re-import', async () => {
    const { editor } = initTestEditor({ content: docx, media, mediaFiles, fonts });

    try {
      expect(editor.converter.comments).toHaveLength(2);

      const commentsForExport = editor.converter.comments.map((comment) => ({
        ...comment,
        commentJSON: comment.textJson,
      }));

      await editor.exportDocx({
        comments: commentsForExport,
        commentsType: 'external',
      });

      const exportedXml = editor.converter.convertedXml;
      const commentsXml = exportedXml['word/comments.xml'];
      const exportedComments = commentsXml?.elements?.[0]?.elements ?? [];
      expect(exportedComments).toHaveLength(2);

      const exportedIds = exportedComments.map((comment) => comment.attributes['w:id']).sort();
      expect(exportedIds).toEqual(['0', '1']);

      const exportedCommentTexts = exportedComments.map((comment) => {
        const paragraphs = comment.elements?.filter((el) => el.name === 'w:p') ?? [];
        const collected = [];
        paragraphs.forEach((paragraph) => {
          paragraph.elements?.forEach((child) => {
            if (child.name !== 'w:r') return;
            const textElement = child.elements?.find((el) => el.name === 'w:t');
            const textNode = textElement?.elements?.find((el) => el.type === 'text');
            if (textNode?.text) collected.push(textNode.text.trim());
          });
        });
        return collected.join('').trim();
      });

      expect(exportedCommentTexts.filter((text) => text.length)).toEqual(
        expect.arrayContaining(['comment on text', 'BLANK']),
      );

      const commentsExtendedXml = exportedXml['word/commentsExtended.xml'];
      const extendedDefinitions = commentsExtendedXml?.elements?.[0]?.elements ?? [];
      expect(extendedDefinitions).toHaveLength(2);
      extendedDefinitions.forEach((definition) => {
        expect(definition.attributes['w15:done']).toBe('0');
      });

      const exportedDocx = carbonCopy(exportedXml);
      const reimportedComments = importCommentData({ docx: exportedDocx }) ?? [];

      expect(reimportedComments).toHaveLength(2);
      const roundTripTexts = reimportedComments
        .map((comment) => extractNodeText(comment.textJson).trim())
        .filter((text) => text.length);
      expect(roundTripTexts).toEqual(expect.arrayContaining(['comment on text', 'BLANK']));
      reimportedComments.forEach((comment) => {
        expect(comment.isDone).toBe(false);
      });
    } finally {
      editor.destroy();
    }
  });
});

describe('New comment HTML to schema conversion', () => {
  /**
   * Regression test for issue where new comments lost their text content
   * during export. The bug was in convertHtmlToSchema passing a DOM element
   * to Editor instead of the HTML string directly.
   */
  it('preserves text content when converting comment HTML to schema', () => {
    const commentHTML = '<p>test comment</p>';

    const editor = new Editor({
      mode: 'text',
      isHeadless: true,
      content: commentHTML,
      extensions: getRichTextExtensions(),
    });

    const result = editor.getJSON();
    const paragraph = result.content[0];

    expect(paragraph).toBeDefined();
    expect(paragraph.type).toBe('paragraph');
    expect(paragraph.content).toBeDefined();
    expect(paragraph.content.length).toBeGreaterThan(0);

    const textContent = extractNodeText(paragraph);
    expect(textContent).toBe('test comment');
  });

  it('preserves formatted text content', () => {
    const commentHTML = '<p><strong>bold</strong> and <em>italic</em></p>';

    const editor = new Editor({
      mode: 'text',
      isHeadless: true,
      content: commentHTML,
      extensions: getRichTextExtensions(),
    });

    const result = editor.getJSON();
    const paragraph = result.content[0];

    const textContent = extractNodeText(paragraph);
    expect(textContent).toBe('bold and italic');
  });
});
