import { beforeAll, describe, expect, it } from 'vitest';
import { loadTestDataForEditorTests, initTestEditor } from '@tests/helpers/helpers.js';
import { carbonCopy } from '@core/utilities/carbonCopy.js';
import { importCommentData } from '@converter/v2/importer/documentCommentsImporter.js';

const extractNodeText = (node) => {
  if (!node) return '';
  if (typeof node.text === 'string') return node.text;
  const content = Array.isArray(node.content) ? node.content : [];
  return content.map((child) => extractNodeText(child)).join('');
};

/**
 * Find all commentRangeStart and commentRangeEnd elements in document.xml
 */
const findCommentRangeNodes = (documentXml) => {
  const ranges = { starts: [], ends: [] };

  const traverse = (elements) => {
    if (!Array.isArray(elements)) return;
    for (const el of elements) {
      if (el.name === 'w:commentRangeStart') {
        ranges.starts.push(el.attributes?.['w:id']);
      }
      if (el.name === 'w:commentRangeEnd') {
        ranges.ends.push(el.attributes?.['w:id']);
      }
      if (el.elements) traverse(el.elements);
    }
  };

  traverse(documentXml?.elements || []);
  return ranges;
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

describe('Resolved comments round-trip', () => {
  const filename = 'basic-resolved-comment.docx';
  let docx;
  let media;
  let mediaFiles;
  let fonts;

  beforeAll(async () => {
    ({ docx, media, mediaFiles, fonts } = await loadTestDataForEditorTests(filename));
  });

  it('preserves resolved comment status and range markers on export', async () => {
    const { editor } = initTestEditor({ content: docx, media, mediaFiles, fonts });

    try {
      // Verify we have both resolved and unresolved comments
      expect(editor.converter.comments).toHaveLength(2);
      const resolvedComment = editor.converter.comments.find((c) => c.isDone === true);
      const unresolvedComment = editor.converter.comments.find((c) => c.isDone === false);
      expect(resolvedComment).toBeDefined();
      expect(unresolvedComment).toBeDefined();

      const commentsForExport = editor.converter.comments.map((comment) => ({
        ...comment,
        commentJSON: comment.textJson,
      }));

      await editor.exportDocx({
        comments: commentsForExport,
        commentsType: 'external',
      });

      const exportedXml = editor.converter.convertedXml;

      // Verify commentsExtended.xml has correct done status
      const commentsExtendedXml = exportedXml['word/commentsExtended.xml'];
      const extendedDefinitions = commentsExtendedXml?.elements?.[0]?.elements ?? [];
      expect(extendedDefinitions).toHaveLength(2);

      const doneValues = extendedDefinitions.map((def) => def.attributes['w15:done']);
      expect(doneValues).toContain('0'); // unresolved
      expect(doneValues).toContain('1'); // resolved

      // Verify document.xml has commentRangeStart/End for BOTH comments
      const documentXml = exportedXml['word/document.xml'];
      const rangeNodes = findCommentRangeNodes(documentXml);

      // Both comments should have range markers (this is the key regression test)
      expect(rangeNodes.starts).toHaveLength(2);
      expect(rangeNodes.ends).toHaveLength(2);
      expect(rangeNodes.starts.sort()).toEqual(['0', '1']);
      expect(rangeNodes.ends.sort()).toEqual(['0', '1']);
    } finally {
      editor.destroy();
    }
  });

  it('preserves resolved status through full round-trip (import -> export -> reimport)', async () => {
    const { editor } = initTestEditor({ content: docx, media, mediaFiles, fonts });

    try {
      const commentsForExport = editor.converter.comments.map((comment) => ({
        ...comment,
        commentJSON: comment.textJson,
      }));

      await editor.exportDocx({
        comments: commentsForExport,
        commentsType: 'external',
      });

      const exportedXml = carbonCopy(editor.converter.convertedXml);
      const reimportedComments = importCommentData({ docx: exportedXml }) ?? [];

      expect(reimportedComments).toHaveLength(2);

      const reimportedResolved = reimportedComments.find((c) => c.isDone === true);
      const reimportedUnresolved = reimportedComments.find((c) => c.isDone === false);

      expect(reimportedResolved).toBeDefined();
      expect(reimportedUnresolved).toBeDefined();
    } finally {
      editor.destroy();
    }
  });
});
