import { describe, it, expect, beforeEach, vi } from 'vitest';
import useComment from './use-comment.js';

const { syncCommentsMock, useSelectionMock, uuidMock } = vi.hoisted(() => {
  const syncCommentsMock = vi.fn();
  const useSelectionMock = vi.fn((params) => ({
    ...params,
    selectionBounds: params.selectionBounds || {},
    getValues: () => ({ ...params }),
  }));
  const uuidMock = vi.fn(() => 'generated-id');
  return { syncCommentsMock, useSelectionMock, uuidMock };
});

vi.mock('@superdoc/core/collaboration/helpers.js', () => ({
  syncCommentsToClients: syncCommentsMock,
}));

vi.mock('@superdoc/helpers/use-selection', () => ({
  default: useSelectionMock,
}));

vi.mock('uuid', () => ({
  v4: uuidMock,
}));

describe('useComment composable', () => {
  const createSuperdoc = () => ({
    emit: vi.fn(),
    activeEditor: {
      commands: {
        resolveComment: vi.fn(),
        setActiveComment: vi.fn(),
        setCommentInternal: vi.fn(),
      },
    },
  });

  beforeEach(() => {
    syncCommentsMock.mockClear();
    useSelectionMock.mockClear();
  });

  it('initializes with defaults and tracks mention extraction on text updates', () => {
    const superdoc = createSuperdoc();
    const comment = useComment({
      uid: 'u-1',
      commentText: '<p>Initial</p>',
      fileId: 'doc-1',
      fileType: 'DOCX',
      creatorEmail: 'author@example.com',
      creatorName: 'Author',
    });

    comment.setText({
      text: '<p><span data-type="mention" name="Jane" email="jane@example.com"></span></p>',
      superdoc,
    });

    expect(comment.commentText).toBe('<p><span data-type="mention" name="Jane" email="jane@example.com"></span></p>');
    expect(comment.mentions).toEqual([{ name: 'Jane', email: 'jane@example.com' }]);
    expect(superdoc.emit).toHaveBeenCalledWith(
      'comments-update',
      expect.objectContaining({ type: 'update', changes: [{ key: 'text', value: expect.any(String) }] }),
    );
    expect(syncCommentsMock).toHaveBeenCalled();
  });

  it('resolves tracked change only once and notifies editor', () => {
    const superdoc = createSuperdoc();
    const comment = useComment({
      commentId: 'comment-1',
      creatorEmail: 'author@example.com',
      creatorName: 'Author',
      fileId: 'doc-1',
      fileType: 'DOCX',
      trackedChange: true,
    });

    const payload = { email: 'resolver@example.com', name: 'Resolver', superdoc };
    comment.resolveComment(payload);
    const firstResolved = comment.resolvedTime;

    comment.resolveComment(payload);
    expect(comment.resolvedTime).toBe(firstResolved);
    expect(superdoc.emit).toHaveBeenCalledTimes(1);
    expect(superdoc.activeEditor.commands.resolveComment).toHaveBeenCalledWith({
      commentId: 'comment-1',
      importedId: undefined,
    });
  });

  it('toggles isInternal and syncs changes', () => {
    const superdoc = createSuperdoc();
    const comment = useComment({
      commentId: 'comment-2',
      creatorEmail: 'author@example.com',
      creatorName: 'Author',
      fileId: 'doc-1',
      fileType: 'DOCX',
      isInternal: true,
    });

    comment.setIsInternal({ isInternal: true, superdoc });
    expect(superdoc.emit).not.toHaveBeenCalled();

    comment.setIsInternal({ isInternal: false, superdoc });
    expect(comment.isInternal).toBe(false);
    expect(superdoc.emit).toHaveBeenCalledWith(
      'comments-update',
      expect.objectContaining({ type: 'update', changes: [{ key: 'isInternal', value: false, previousValue: true }] }),
    );
    expect(superdoc.activeEditor.commands.setCommentInternal).toHaveBeenCalledWith({
      commentId: 'comment-2',
      importedId: undefined,
      isInternal: false,
    });
  });

  it('updates selection bounds relative to parent', () => {
    const superdoc = createSuperdoc();
    const comment = useComment({
      commentId: 'comment-3',
      creatorEmail: 'author@example.com',
      creatorName: 'Author',
      fileId: 'doc-1',
      fileType: 'DOCX',
      selection: {
        getValues: () => ({ source: 'existing', selectionBounds: { top: 50, bottom: 80, left: 10, right: 25 } }),
        selectionBounds: { top: 50, bottom: 80, left: 10, right: 25 },
      },
    });

    const parent = {
      getBoundingClientRect: () => ({ top: 20 }),
    };

    comment.updatePosition({ top: 120, bottom: 160, left: 40, right: 80 }, parent);

    expect(comment.selection.selectionBounds).toEqual({ top: 100, bottom: 140, left: 40, right: 80 });
  });

  it('exposes getValues and setActive helpers', () => {
    const superdoc = createSuperdoc();
    const comment = useComment({
      commentId: 'comment-4',
      creatorEmail: 'author@example.com',
      creatorName: 'Author',
      fileId: 'doc-1',
      fileType: 'DOCX',
    });

    const values = comment.getValues();
    expect(values.commentId).toBe('comment-4');
    expect(values.selection).toEqual(expect.objectContaining({ documentId: 'doc-1' }));

    comment.setActive(superdoc);
    expect(superdoc.activeEditor.commands.setActiveComment).toHaveBeenCalledWith({
      commentId: 'comment-4',
      importedId: undefined,
    });
  });
});
