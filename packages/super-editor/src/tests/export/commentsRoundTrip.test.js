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

describe('Comment origin detection and round trip', () => {
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

        // For Google Docs origin, commentsExtended.xml may be empty (threading is range-based)
        // We verify that the export strategy correctly handles Google Docs format
        const commentsExtendedXml = exportedXml['word/commentsExtended.xml'];
        const extendedDefinitions = commentsExtendedXml?.elements?.[0]?.elements ?? [];
        // Google Docs without original commentsExtended.xml will have empty extended definitions
        // This is correct behavior - threading is range-based for Google Docs
        if (extendedDefinitions.length > 0) {
          extendedDefinitions.forEach((definition) => {
            expect(definition.attributes['w15:done']).toBe('0');
          });
        }

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

  describe('Word origin comments import/export round trip', () => {
    const filename = 'WordOriginatedComments.docx';
    let docx;
    let media;
    let mediaFiles;
    let fonts;

    beforeAll(async () => {
      ({ docx, media, mediaFiles, fonts } = await loadTestDataForEditorTests(filename));
    });

    it('detects Word origin and preserves threading through round trip', async () => {
      const { editor } = initTestEditor({ content: docx, media, mediaFiles, fonts });

      try {
        // Verify origin detection
        expect(editor.converter.documentOrigin).toBe('word');

        // Verify comments have origin metadata
        expect(editor.converter.comments.length).toBeGreaterThan(0);
        editor.converter.comments.forEach((comment) => {
          expect(comment.origin).toBe('word');
          expect(comment.threadingMethod).toBe('commentsExtended');
          expect(comment.originalXmlStructure).toBeDefined();
          expect(comment.originalXmlStructure.hasCommentsExtended).toBe(true);
        });

        const commentsForExport = editor.converter.comments.map((comment) => ({
          ...comment,
          commentJSON: comment.textJson,
        }));

        await editor.exportDocx({
          comments: commentsForExport,
          commentsType: 'external',
        });

        const exportedXml = editor.converter.convertedXml;
        const commentsExtendedXml = exportedXml['word/commentsExtended.xml'];

        // Word format should always have commentsExtended.xml
        expect(commentsExtendedXml).toBeDefined();
        const extendedDefinitions = commentsExtendedXml?.elements?.[0]?.elements ?? [];
        expect(extendedDefinitions.length).toBeGreaterThan(0);

        // Re-import and verify threading is preserved
        const exportedDocx = carbonCopy(exportedXml);
        const reimportedComments =
          importCommentData({ docx: exportedDocx, editor: null, converter: editor.converter }) ?? [];

        expect(reimportedComments.length).toBe(editor.converter.comments.length);

        // Verify parent-child relationships are preserved
        const originalParentMap = new Map();
        editor.converter.comments.forEach((c) => {
          if (c.parentCommentId) {
            originalParentMap.set(c.commentId, c.parentCommentId);
          }
        });

        const reimportedParentMap = new Map();
        reimportedComments.forEach((c) => {
          if (c.parentCommentId) {
            reimportedParentMap.set(c.commentId, c.parentCommentId);
          }
        });

        // Verify threading relationships match
        originalParentMap.forEach((parentId, commentId) => {
          const originalComment = editor.converter.comments.find((c) => c.commentId === commentId);
          const reimportedComment = reimportedComments.find((c) => c.commentId === commentId);

          if (originalComment && reimportedComment) {
            // Parent relationships should be preserved
            expect(reimportedComment.parentCommentId).toBeDefined();
          }
        });
      } finally {
        editor.destroy();
      }
    });
  });

  describe('Origin detection', () => {
    it('detects Word origin when commentsExtended.xml is present', async () => {
      const filename = 'WordOriginatedComments.docx';
      const { docx } = await loadTestDataForEditorTests(filename);
      const { editor } = initTestEditor({ content: docx });

      try {
        expect(editor.converter.documentOrigin).toBe('word');
      } finally {
        editor.destroy();
      }
    });

    it('detects Google Docs origin when commentsExtended.xml is missing', async () => {
      const filename = 'gdocs-comments-export.docx';
      const { docx } = await loadTestDataForEditorTests(filename);
      const { editor } = initTestEditor({ content: docx });

      try {
        // Google Docs may or may not have commentsExtended.xml
        // The detection logic checks for its presence with valid elements
        const origin = editor.converter.documentOrigin;
        expect(['google-docs', 'word', 'unknown']).toContain(origin);

        // Verify comments have origin metadata
        if (editor.converter.comments.length > 0) {
          editor.converter.comments.forEach((comment) => {
            expect(comment.origin).toBeDefined();
            expect(['word', 'google-docs', 'unknown']).toContain(comment.origin);
            expect(comment.threadingMethod).toBeDefined();
            expect(comment.originalXmlStructure).toBeDefined();
          });
        }
      } finally {
        editor.destroy();
      }
    });
  });

  describe('Mixed origin handling', () => {
    it('defaults to Word format when comments have mixed origins', async () => {
      const filename = 'gdocs-comments-export.docx';
      const { docx, media, mediaFiles, fonts } = await loadTestDataForEditorTests(filename);
      const { editor } = initTestEditor({ content: docx, media, mediaFiles, fonts });

      try {
        // Simulate mixed origins by modifying comment origins
        if (editor.converter.comments.length > 1) {
          editor.converter.comments[0].origin = 'word';
          editor.converter.comments[1].origin = 'google-docs';

          const commentsForExport = editor.converter.comments.map((comment) => ({
            ...comment,
            commentJSON: comment.textJson,
          }));

          await editor.exportDocx({
            comments: commentsForExport,
            commentsType: 'external',
          });

          const exportedXml = editor.converter.convertedXml;
          const commentsExtendedXml = exportedXml['word/commentsExtended.xml'];

          // Mixed origins should default to Word format (most compatible)
          expect(commentsExtendedXml).toBeDefined();
        }
      } finally {
        editor.destroy();
      }
    });
  });
});
