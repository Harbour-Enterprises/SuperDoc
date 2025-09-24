import { beforeEach, describe, expect, it, vi } from 'vitest';

const handlerMock = vi.fn(({ nodes }) => [
  {
    type: 'paragraph',
    attrs: { 'w14:paraId': nodes?.[0]?.fakeParaId ?? 'PARA-DEFAULT' },
    content: [],
  },
]);

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

const buildDocx = ({ comments = [], extended = [] } = {}) => {
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
