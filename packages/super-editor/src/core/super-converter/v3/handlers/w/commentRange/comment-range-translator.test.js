import { commentRangeStartTranslator, commentRangeEndTranslator } from './comment-range-translator';

describe('w:commentRangeStart and w:commentRangeEnd', () => {
  // The `decode` describe block uses commentRangeStartTranslator only, but it could as well be the commentRangeEndTranslator
  // They share the same behavior, except for one specific case, and hence we have two separate describe blocks for that.
  describe('decode', () => {
    test('returns if node is not given', () => {
      expect(commentRangeStartTranslator.decode({ node: undefined })).toBe(undefined);
    });

    test('returns if comments are not given', () => {
      expect(commentRangeStartTranslator.decode({ node: {}, comments: undefined })).toBe(undefined);
    });

    test('returns if exportedCommentDefs is empty', () => {
      expect(commentRangeStartTranslator.decode({ node: {}, comments: [{}], exportedCommentDefs: [] })).toBe(undefined);
    });

    test('returns if commentsExportType is "clean"', () => {
      expect(
        commentRangeStartTranslator.decode({
          node: {},
          comments: [],
          exportedCommentDefs: [{}],
          commentsExportType: 'clean',
        }),
      ).toBe(undefined);
    });

    test('returns if the original comment is not found', () => {
      expect(
        commentRangeStartTranslator.decode({
          node: { attrs: { 'w:id': 'id1' } },
          comments: [{ commentId: 'id2' }],
          exportedCommentDefs: [{}],
          commentsExportType: 'external',
        }),
      ).toBe(undefined);
    });

    test('returns if commentsExportType is external and comment is internal', () => {
      expect(
        commentRangeStartTranslator.decode({
          node: { attrs: { 'w:id': 'id1' } },
          comments: [{ commentId: 'id1', isInternal: true }],
          exportedCommentDefs: [{}],
          commentsExportType: 'external',
        }),
      ).toBe(undefined);
    });

    test('returns if commentsExportType is external and parent comment is internal', () => {
      expect(
        commentRangeStartTranslator.decode({
          node: { attrs: { 'w:id': 'id2' } },
          comments: [
            { commentId: 'id1', isInternal: true },
            { commentId: 'id2', parentCommentId: 'id1' },
          ],
          exportedCommentDefs: [{}],
          commentsExportType: 'external',
        }),
      ).toBe(undefined);
    });

    test('returns if comment is resolved', () => {
      expect(
        commentRangeStartTranslator.decode({
          node: { attrs: { 'w:id': 'id1' } },
          comments: [{ commentId: 'id1', resolvedTime: Date.now() }],
          exportedCommentDefs: [{}],
          commentsExportType: 'external',
        }),
      ).toBe(undefined);
    });

    test('returns if node type is not commentRangeStart or commentRangeEnd', () => {
      expect(
        commentRangeStartTranslator.decode({
          node: { attrs: { 'w:id': 'id1', type: 'randomNode' } },
          comments: [{ commentId: 'id1' }],
          exportedCommentDefs: [{}],
          commentsExportType: 'external',
        }),
      ).toBe(undefined);
    });
  });

  describe('decode:commentRangeStartTranslator', () => {
    test('returns comment schema', () => {
      expect(
        commentRangeStartTranslator.decode({
          node: { type: 'commentRangeStart', attrs: { 'w:id': 'id1' } },
          comments: [{ commentId: 'id1' }],
          exportedCommentDefs: [{}],
          commentsExportType: 'external',
        }),
      ).toStrictEqual({ attributes: { 'w:id': '0' }, name: 'w:commentRangeStart' });
    });
  });

  describe('decode:commentRangeEndTranslator', () => {
    test('returns comment schema', () => {
      expect(
        commentRangeEndTranslator.decode({
          node: { type: 'commentRangeEnd', attrs: { 'w:id': 'id1' } },
          comments: [{ commentId: 'id1' }],
          exportedCommentDefs: [{}],
          commentsExportType: 'external',
        }),
      ).toStrictEqual([
        { attributes: { 'w:id': '0' }, name: 'w:commentRangeEnd' },
        {
          elements: [
            {
              attributes: {
                'w:id': '0',
              },
              name: 'w:commentReference',
            },
          ],
          name: 'w:r',
        },
      ]);
    });
  });
});
