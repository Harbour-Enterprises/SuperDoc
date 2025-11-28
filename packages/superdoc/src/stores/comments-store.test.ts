import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia, defineStore } from 'pinia';
import { ref, reactive } from 'vue';

vi.mock('./superdoc-store.js', () => {
  const documents = ref<unknown[]>([]);
  const user = reactive({ name: 'Alice', email: 'alice@example.com' });
  const activeSelection = reactive({ documentId: 'doc-1', selectionBounds: {} });
  const selectionPosition = reactive({ source: null as string | null });
  const getDocument = (id: string) => documents.value.find((doc: { id: string }) => doc.id === id);

  const useMockStore = defineStore('superdoc', () => ({
    documents,
    user,
    activeSelection,
    selectionPosition,
    getDocument,
  }));

  return {
    useSuperdocStore: useMockStore,
    __mockSuperdoc: {
      documents,
      user,
      activeSelection,
      selectionPosition,
      emit: vi.fn(),
      config: {
        isInternal: false,
      },
    },
  };
});

vi.mock('@superdoc/components/CommentsLayer/use-comment', () => {
  const mock = vi.fn((params: { commentId?: string; selection?: unknown; isInternal?: boolean } = {}) => {
    const selection = params.selection || { source: 'mock', selectionBounds: {} };
    return {
      ...params,
      commentId: params.commentId ?? 'mock-id',
      selection,
      isInternal: params.isInternal ?? true,
      getValues: () => ({ ...params, commentId: params.commentId ?? 'mock-id', selection }),
      setText: vi.fn(),
    };
  });

  return {
    default: mock,
  };
});

vi.mock('../core/collaboration/helpers.js', () => ({
  syncCommentsToClients: vi.fn(),
}));

vi.mock('../helpers/group-changes.js', () => ({
  groupChanges: vi.fn(() => []),
}));

vi.mock('@harbour-enterprises/super-editor', () => ({
  Editor: class {
    getJSON() {
      return { content: [{}] };
    }
    getHTML() {
      return '<p></p>';
    }
    get state() {
      return {};
    }
    get view() {
      return { state: { tr: { setMeta: vi.fn() } }, dispatch: vi.fn() };
    }
  },
  trackChangesHelpers: {
    getTrackChanges: vi.fn(() => []),
  },
  TrackChangesBasePluginKey: 'TrackChangesBasePluginKey',
  CommentsPluginKey: 'CommentsPluginKey',
  getRichTextExtensions: vi.fn(() => []),
}));

import { useCommentsStore } from './comments-store.js';
import { __mockSuperdoc } from './superdoc-store.js';
import { comments_module_events } from '@superdoc/common';
import useComment from '@superdoc/components/CommentsLayer/use-comment';
import { syncCommentsToClients } from '../core/collaboration/helpers.js';

const useCommentMock = useComment as ReturnType<typeof vi.fn>;
const syncCommentsToClientsMock = syncCommentsToClients as ReturnType<typeof vi.fn>;

describe('comments-store', () => {
  let store: ReturnType<typeof useCommentsStore>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    setActivePinia(createPinia());
    store = useCommentsStore();
    __mockSuperdoc.documents.value = [{ id: 'doc-1', type: 'docx' }];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes config and maps initial comments', () => {
    const initialComment = { commentId: 'c-1', text: 'Hello' };

    store.init({
      readOnly: true,
      allowResolve: false,
      comments: [initialComment],
    });

    expect((store.getConfig as { readOnly: boolean }).readOnly).toBe(true);
    expect((store.getConfig as { allowResolve: boolean }).allowResolve).toBe(false);
    expect(store.commentsList.length).toBe(1);
    expect(useCommentMock).toHaveBeenCalledWith(initialComment);
  });

  it('returns comments by id or imported id', () => {
    const comment = { commentId: 'c-2', importedId: 'import-2' };
    store.commentsList = [comment];

    expect(store.getComment('c-2')).toEqual(comment);
    expect(store.getComment('import-2')).toEqual(comment);
    expect(store.getComment(null)).toBeNull();
    expect(store.getComment(undefined)).toBeNull();
  });

  it('sets active comment and updates the editor', () => {
    const setActiveCommentSpy = vi.fn();
    const superdoc = {
      activeEditor: {
        commands: {
          setActiveComment: setActiveCommentSpy,
        },
      },
    };

    const comment = { commentId: 'comment-1' };
    store.commentsList = [comment];

    store.setActiveComment(superdoc as never, 'comment-1');
    expect(store.activeComment).toBe('comment-1');
    expect(setActiveCommentSpy).toHaveBeenCalledWith({ commentId: 'comment-1' });

    store.setActiveComment(superdoc as never, null);
    expect(store.activeComment).toBeNull();
    expect(setActiveCommentSpy).toHaveBeenCalledWith({ commentId: null });
  });

  it('updates tracked change comments and emits events', () => {
    const superdoc = {
      emit: vi.fn(),
    };

    const existingComment = {
      commentId: 'change-1',
      trackedChangeText: 'old',
      getValues: vi.fn(() => ({ commentId: 'change-1' })),
    };

    store.commentsList = [existingComment];

    store.handleTrackedChangeUpdate({
      superdoc: superdoc as never,
      params: {
        event: 'update',
        changeId: 'change-1',
        trackedChangeText: 'new text',
        trackedChangeType: 'insert',
        deletedText: 'removed',
        authorEmail: 'user@example.com',
        author: 'User',
        date: 123,
        importedAuthor: null,
        documentId: 'doc-1',
        coords: {},
      },
    });

    expect((existingComment as { trackedChangeText: string }).trackedChangeText).toBe('new text');
    expect((existingComment as { deletedText: string }).deletedText).toBe('removed');
    expect(syncCommentsToClientsMock).toHaveBeenCalledWith(
      superdoc,
      expect.objectContaining({
        type: comments_module_events.UPDATE,
        comment: { commentId: 'change-1' },
      }),
    );

    expect(superdoc.emit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(superdoc.emit).toHaveBeenCalledWith(
      'comments-update',
      expect.objectContaining({
        type: comments_module_events.UPDATE,
        comment: { commentId: 'change-1' },
      }),
    );
  });

  it('should load comments with correct created time', () => {
    store.init({
      readOnly: true,
      allowResolve: false,
      comments: [],
    });

    const now = Date.now();
    store.processLoadedDocxComments({
      superdoc: __mockSuperdoc as never,
      editor: null,
      comments: [
        {
          commentId: 'c-1',
          createdTime: now,
          creatorName: 'Gabriel',
          textJson: {
            content: [
              {
                type: 'run',
                content: [],
                attrs: {
                  runProperties: [
                    {
                      xmlName: 'w:rStyle',
                      attributes: {
                        'w:val': 'CommentReference',
                      },
                    },
                  ],
                },
              },
              {
                type: 'run',
                content: [
                  {
                    type: 'text',
                    text: 'I am a comment~!',
                    attrs: {
                      type: 'element',
                      attributes: {},
                    },
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontSize: '10pt',
                          fontSizeCs: '10pt',
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
      documentId: 'doc-1',
    });

    expect((store.commentsList[0] as { createdTime: number }).createdTime).toBe(now);
  });
});
