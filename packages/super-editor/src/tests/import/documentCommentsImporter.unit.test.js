import { beforeEach, describe, expect, it, vi } from 'vitest';

const handlerMock = vi.fn(({ nodes }) =>
  nodes.map((node) => ({
    type: 'paragraph',
    attrs: { 'w14:paraId': node.fakeParaId ?? 'PARA-DEFAULT' },
    content: [],
  })),
);

let uuidCounter = 0;

vi.mock('@converter/v2/importer/docxImporter.js', () => ({
  defaultNodeListHandler: () => ({
    handler: handlerMock,
    handlerEntities: [],
  }),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => {
    uuidCounter += 1;
    return `00000000-0000-4000-8000-00000000000${uuidCounter}`;
  }),
}));

import { importCommentData } from '@converter/v2/importer/documentCommentsImporter.js';
import { v4 as uuidv4 } from 'uuid';

const buildDocx = ({ comments = [], extended = [], documentRanges = [] } = {}) => {
  const commentsElements = comments.map((comment) => ({
    name: 'w:comment',
    attributes: {
      'w:id': String(comment.id),
      'w:author': comment.author ?? 'Author Name',
      'w:email': comment.email,
      'w:initials': comment.initials,
      'w:date': comment.date ?? '2024-01-01T00:00:00Z',
      'custom:internalId': comment.internalId,
      'custom:trackedChange': comment.trackedChange,
      'custom:trackedChangeText': comment.trackedChangeText,
      'custom:trackedChangeType': comment.trackedChangeType,
      'custom:trackedDeletedText': comment.trackedDeletedText,
    },
    elements: comment.elements ?? [{ fakeParaId: comment.paraId ?? `para-${comment.id}` }],
  }));

  const docx = {
    'word/comments.xml': {
      elements: [
        {
          elements: commentsElements,
        },
      ],
    },
  };

  if (!comments.length) {
    docx['word/comments.xml'] = { elements: [{ elements: [] }] };
  }

  if (extended.length) {
    docx['word/commentsExtended.xml'] = {
      elements: [
        {
          elements: extended.map((item) => ({
            name: 'w15:commentEx',
            attributes: {
              'w15:paraId': item.paraId,
              ...(item.done != null ? { 'w15:done': item.done } : {}),
              ...(item.parent ? { 'w15:paraIdParent': item.parent } : {}),
            },
          })),
        },
      ],
    };
  }

  if (documentRanges.length > 0) {
    docx['word/document.xml'] = {
      elements: [
        {
          name: 'w:body',
          elements: documentRanges,
        },
      ],
    };
  }

  return docx;
};

beforeEach(() => {
  handlerMock.mockClear();
  uuidv4.mockClear();
  uuidCounter = 0;
});

describe('importCommentData edge cases', () => {
  it('returns undefined when comments.xml is missing', () => {
    const result = importCommentData({ docx: {} });
    expect(result).toBeUndefined();
    expect(handlerMock).not.toHaveBeenCalled();
  });

  it('returns undefined when comments.xml contains no elements', () => {
    const docx = { 'word/comments.xml': { elements: [] } };
    const result = importCommentData({ docx });
    expect(result).toBeUndefined();
    expect(handlerMock).not.toHaveBeenCalled();
  });

  it('returns an empty array when comments.xml has no comment entries', () => {
    const docx = buildDocx({ comments: [] });
    const result = importCommentData({ docx });
    expect(result).toEqual([]);
    expect(handlerMock).not.toHaveBeenCalled();
  });
});

describe('importCommentData metadata parsing', () => {
  it('uses generated UUID when custom internal id is absent', () => {
    const docx = buildDocx({
      comments: [
        {
          id: 1,
          author: 'Casey Commenter',
          date: '2024-02-10T12:30:00Z',
        },
      ],
    });

    const [comment] = importCommentData({ docx });
    expect(comment.commentId).toBe('00000000-0000-4000-8000-000000000001');
    expect(uuidv4).toHaveBeenCalledTimes(1);
    expect(comment.creatorName).toBe('Casey Commenter');
    expect(comment.createdTime).toBe(new Date('2024-02-10T12:30:00Z').getTime());
    expect(comment.initials).toBeUndefined();
    expect(comment.isDone).toBe(false);
  });

  it('respects provided internal metadata and tracked change fields', () => {
    const docx = buildDocx({
      comments: [
        {
          id: 5,
          internalId: 'comment-internal-id',
          author: 'Jordan Editor',
          email: 'jordan@example.com',
          initials: 'JE',
          date: '2024-03-01T08:00:00Z',
          trackedChange: 'true',
          trackedChangeText: 'Added text',
          trackedChangeType: 'insert',
          trackedDeletedText: 'Removed text',
        },
      ],
    });

    const [comment] = importCommentData({ docx });
    expect(comment.commentId).toBe('comment-internal-id');
    expect(comment.creatorEmail).toBe('jordan@example.com');
    expect(comment.initials).toBe('JE');
    expect(comment.trackedChange).toBe(true);
    expect(comment.trackedChangeText).toBe('Added text');
    expect(comment.trackedChangeType).toBe('insert');
    expect(comment.trackedDeletedText).toBe('Removed text');
  });

  it('normalizes tracked change fields when docx provides "null" values', () => {
    const docx = buildDocx({
      comments: [
        {
          id: 4,
          trackedChange: 'false',
          trackedChangeText: 'null',
          trackedChangeType: undefined,
          trackedDeletedText: 'null',
        },
      ],
    });

    const [comment] = importCommentData({ docx });
    expect(comment.trackedChange).toBe(false);
    expect(comment.trackedChangeText).toBeNull();
    expect(comment.trackedChangeType).toBeUndefined();
    expect(comment.trackedDeletedText).toBeNull();
  });
});

describe('importCommentData extended metadata', () => {
  it('merges commentEx data to determine resolved state and threading', () => {
    const docx = buildDocx({
      comments: [
        {
          id: 1,
          paraId: 'para-parent',
          internalId: 'parent-comment-id',
        },
        {
          id: 2,
          paraId: 'para-child',
        },
      ],
      extended: [
        { paraId: 'para-parent', done: '0' },
        { paraId: 'para-child', done: '1', parent: 'para-parent' },
      ],
    });

    const comments = importCommentData({ docx });
    expect(comments).toHaveLength(2);

    const [parentComment, childComment] = comments;
    expect(parentComment.isDone).toBe(false);
    expect(childComment.isDone).toBe(true);
    expect(childComment.parentCommentId).toBe(parentComment.commentId);
    expect(handlerMock).toHaveBeenCalledTimes(2);
  });

  it('leaves comments unresolved when commentEx is missing', () => {
    const docx = buildDocx({
      comments: [{ id: 7, paraId: 'para-7' }],
      extended: [],
    });

    const [comment] = importCommentData({ docx });
    expect(comment.isDone).toBe(false);
    expect(comment.parentCommentId).toBeUndefined();
  });

  it('keeps default state when commentsExtended.xml exists without entries', () => {
    const docx = buildDocx({
      comments: [{ id: 11, paraId: 'para-11' }],
    });

    docx['word/commentsExtended.xml'] = { elements: [{ elements: [] }] };

    const [comment] = importCommentData({ docx });
    expect(comment.isDone).toBe(false);
    expect(comment.parentCommentId).toBeUndefined();
  });
});

describe('Google Docs threading (missing commentsExtended.xml)', () => {
  it('detects parent-child relationship from nested ranges', () => {
    const docx = buildDocx({
      comments: [{ id: 0, internalId: 'parent-comment-id' }, { id: 1 }],
      documentRanges: [
        {
          name: 'w:p',
          elements: [
            {
              name: 'w:commentRangeStart',
              attributes: { 'w:id': '0' },
            },
            {
              name: 'w:r',
              elements: [{ name: 'w:t', elements: [{ type: 'text', text: 'Text' }] }],
            },
            {
              name: 'w:commentRangeStart',
              attributes: { 'w:id': '1' },
            },
            {
              name: 'w:r',
              elements: [{ name: 'w:t', elements: [{ type: 'text', text: 'More text' }] }],
            },
            {
              name: 'w:commentRangeEnd',
              attributes: { 'w:id': '1' },
            },
            {
              name: 'w:commentRangeEnd',
              attributes: { 'w:id': '0' },
            },
          ],
        },
      ],
    });

    const comments = importCommentData({ docx });
    expect(comments).toHaveLength(2);

    const parentComment = comments.find((c) => c.commentId === 'parent-comment-id');
    const childComment = comments.find((c) => c.commentId !== 'parent-comment-id');

    expect(parentComment).toBeDefined();
    expect(childComment).toBeDefined();
    expect(parentComment.parentCommentId).toBeUndefined();
    expect(childComment.parentCommentId).toBe(parentComment.commentId);
  });

  it('handles multiple levels of nesting', () => {
    const docx = buildDocx({
      comments: [
        { id: 0, internalId: 'parent-id' },
        { id: 1, internalId: 'child-id' },
        { id: 2, internalId: 'grandchild-id' },
      ],
      documentRanges: [
        {
          name: 'w:p',
          elements: [
            {
              name: 'w:commentRangeStart',
              attributes: { 'w:id': '0' },
            },
            {
              name: 'w:r',
              elements: [{ name: 'w:t', elements: [{ type: 'text', text: 'Parent' }] }],
            },
            {
              name: 'w:commentRangeStart',
              attributes: { 'w:id': '1' },
            },
            {
              name: 'w:r',
              elements: [{ name: 'w:t', elements: [{ type: 'text', text: 'Child' }] }],
            },
            {
              name: 'w:commentRangeStart',
              attributes: { 'w:id': '2' },
            },
            {
              name: 'w:r',
              elements: [{ name: 'w:t', elements: [{ type: 'text', text: 'Grandchild' }] }],
            },
            {
              name: 'w:commentRangeEnd',
              attributes: { 'w:id': '2' },
            },
            {
              name: 'w:commentRangeEnd',
              attributes: { 'w:id': '1' },
            },
            {
              name: 'w:commentRangeEnd',
              attributes: { 'w:id': '0' },
            },
          ],
        },
      ],
    });

    const comments = importCommentData({ docx });
    expect(comments).toHaveLength(3);

    const parent = comments.find((c) => c.commentId === 'parent-id');
    const child = comments.find((c) => c.commentId === 'child-id');
    const grandchild = comments.find((c) => c.commentId === 'grandchild-id');

    expect(parent.parentCommentId).toBeUndefined();
    expect(child.parentCommentId).toBe(parent.commentId);
    expect(grandchild.parentCommentId).toBe(child.commentId);
  });

  it('returns comments unchanged when no ranges exist', () => {
    const docx = buildDocx({
      comments: [
        { id: 0, internalId: 'comment-1' },
        { id: 1, internalId: 'comment-2' },
      ],
      // No documentRanges provided, so no comment ranges in document.xml
    });

    const comments = importCommentData({ docx });
    expect(comments).toHaveLength(2);

    // Without ranges, no threading should be detected
    comments.forEach((comment) => {
      expect(comment.parentCommentId).toBeUndefined();
    });
  });

  it('generates a resolved comment when comment has at least one sub-element marked as done', () => {
    const docx = buildDocx({
      comments: [
        {
          id: 1,
          paraId: 'para-1',
          elements: [
            {
              type: 'element',
              name: 'w:p',
              fakeParaId: 'para-2',
              attributes: {
                'w14:paraId': 'para-2',
              },
              elements: [
                {
                  type: 'element',
                  name: 'w:r',
                  elements: [
                    {
                      type: 'element',
                      name: 'w:t',
                      attributes: {},
                      elements: [
                        {
                          type: 'text',
                          text: 'Some text',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: 'element',
              name: 'w:p',
              fakeParaId: 'para-1',
              attributes: {
                'w14:paraId': 'para-1',
              },
              elements: [
                {
                  type: 'element',
                  name: 'w:r',
                  elements: [
                    {
                      type: 'element',
                      name: 'w:t',
                      attributes: {},
                      elements: [
                        {
                          type: 'text',
                          text: 'Some text',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    docx['word/commentsExtended.xml'] = {
      elements: [{ elements: [{ name: 'w15:commentEx', attributes: { 'w15:paraId': 'para-1', 'w15:done': '1' } }] }],
    };

    const comments = importCommentData({ docx });
    expect(comments).toHaveLength(1);
    expect(comments[0].isDone).toBe(true);
  });
});
