import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import * as collaborationModule from './collaboration';
import {
  initCollaborationComments,
  initSuperdocYdoc,
  makeDocumentsCollaborative,
  syncCommentsToClients,
} from './helpers';
import * as commentsModule from './collaboration-comments';
const { addYComment, updateYComment, deleteYComment, getCommentIndex } = commentsModule;
import { SuperDoc } from '../SuperDoc';
import { PERMISSIONS, isAllowed } from './permissions';
import * as permissionsModule from './permissions';

const awarenessStatesToArrayMock = vi.hoisted(() => vi.fn(() => [{ name: 'Remote User' }]));

const {
  MockWebsocketProvider,
  MockHocuspocusProvider,
  MockYMap,
  MockYArray,
  MockYDoc,
  websocketInstances,
  hocuspocusInstances,
} = vi.hoisted(() => {
  class MockYMap extends Map {
    toJSON(): Record<string, unknown> {
      return Object.fromEntries(this);
    }
  }

  class MockYArray {
    items: unknown[];
    _observers: Set<(event: unknown) => void>;

    constructor() {
      this.items = [];
      this._observers = new Set();
    }

    push(nodes: unknown[]): void {
      this.items.push(...nodes);
    }

    delete(index: number, count: number): void {
      this.items.splice(index, count);
    }

    insert(index: number, nodes: unknown[]): void {
      this.items.splice(index, 0, ...nodes);
    }

    toJSON(): unknown[] {
      return this.items.map((item) =>
        (item as { toJSON?: () => unknown })?.toJSON ? (item as { toJSON: () => unknown }).toJSON() : item,
      );
    }

    observe(handler: (event: unknown) => void): void {
      this._observers.add(handler);
    }

    emit(event: unknown): void {
      for (const handler of this._observers) handler(event);
    }
  }

  class MockYDoc {
    _arrays: Map<string, InstanceType<typeof MockYArray>>;
    _lastMeta: unknown;

    constructor() {
      this._arrays = new Map();
      this._lastMeta = null;
    }

    getArray(name: string): InstanceType<typeof MockYArray> {
      if (!this._arrays.has(name)) {
        this._arrays.set(name, new MockYArray());
      }
      return this._arrays.get(name)!;
    }

    transact(fn: () => void, meta?: unknown): void {
      this._lastMeta = meta;
      fn();
    }
  }

  const websocketInstances: MockWebsocketProvider[] = [];

  class MockWebsocketProvider {
    url: string;
    name: string;
    ydoc: unknown;
    options: unknown;
    awareness: {
      setLocalStateField: ReturnType<typeof vi.fn>;
      on: ReturnType<typeof vi.fn>;
      getStates: ReturnType<typeof vi.fn>;
    };
    _states?: Map<number, unknown>;
    _awarenessHandler?: (changes: unknown) => void;

    constructor(url: string, name: string, ydoc: unknown, options?: unknown) {
      this.url = url;
      this.name = name;
      this.ydoc = ydoc;
      this.options = options;
      this.awareness = {
        setLocalStateField: vi.fn(),
        on: vi.fn((event: string, handler: (changes: unknown) => void) => {
          if (event === 'update') this._awarenessHandler = handler;
        }),
        getStates: vi.fn(() => this._states || new Map()),
      };
      websocketInstances.push(this);
    }

    emitAwareness(changes: unknown, states = new Map()): void {
      this._states = states;
      this._awarenessHandler?.(changes);
    }
  }

  const hocuspocusInstances: MockHocuspocusProvider[] = [];

  class MockHocuspocusProvider {
    options: Record<string, unknown>;
    _handlers: Record<string, (payload: unknown) => void>;
    _awarenessField?: { field: string; value: unknown };

    constructor(options: unknown) {
      this.options = options as Record<string, unknown>;
      this._handlers = {};
      hocuspocusInstances.push(this);
    }

    setAwarenessField(field: string, value: unknown): void {
      this._awarenessField = { field, value };
    }

    on(event: string, handler: (payload: unknown) => void): void {
      this._handlers[event] = handler;
    }

    emit(event: string, payload: unknown): void {
      this._handlers[event]?.(payload);
    }
  }

  return {
    MockWebsocketProvider,
    MockHocuspocusProvider,
    MockYMap,
    MockYArray,
    MockYDoc,
    websocketInstances,
    hocuspocusInstances,
  };
});

vi.mock('@superdoc/common/collaboration/awareness', () => {
  return { awarenessStatesToArray: awarenessStatesToArrayMock };
});

vi.mock('y-websocket', () => {
  return {
    WebsocketProvider: vi.fn((...args: [string, string, unknown, unknown?]) => new MockWebsocketProvider(...args)),
  };
});

vi.mock('@hocuspocus/provider', () => {
  return {
    HocuspocusProvider: vi.fn((options: unknown) => new MockHocuspocusProvider(options)),
  };
});

vi.mock('yjs', () => {
  return {
    Doc: MockYDoc,
    Map: MockYMap,
  };
});

const useCommentMock = vi.hoisted(() =>
  vi.fn((comment: { commentId?: string; selection?: unknown } = {}) => {
    const selection = comment.selection || { source: 'mock', selectionBounds: {} };
    return {
      ...comment,
      commentId: comment.commentId ?? 'mock-id',
      selection,
      isInternal: (comment as { isInternal?: boolean }).isInternal ?? true,
      getValues: () => ({ ...comment, commentId: comment.commentId ?? 'mock-id', selection }),
      setText: vi.fn(),
    };
  }),
);

vi.mock('../../components/CommentsLayer/use-comment', () => ({
  default: useCommentMock,
}));

beforeAll(() => {
  (globalThis as { superdoc: { user: { name: string; email: string } } }).superdoc = {
    user: { name: 'Global User', email: 'global@example.com' },
  };
  (globalThis as { __IS_DEBUG__: boolean }).__IS_DEBUG__ = false;
});

beforeEach(() => {
  awarenessStatesToArrayMock?.mockClear();
  useCommentMock?.mockClear();
  websocketInstances.length = 0;
  hocuspocusInstances.length = 0;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('collaboration.createProvider', () => {
  it('creates websocket provider with awareness hook', () => {
    const context = { emit: vi.fn() };
    const config = { url: 'ws://test-server' };
    const user = { name: 'Sam', email: 'sam@example.com' };
    const result = collaborationModule.createProvider({
      config,
      user,
      documentId: 'doc-1',
      superdocInstance: context,
    });

    expect(result.provider).toBeInstanceOf(MockWebsocketProvider);
    expect(result.provider.awareness.setLocalStateField).toHaveBeenCalledWith('user', user);

    const states = new Map([[1, { user: { name: 'Other' } }]]);
    awarenessStatesToArrayMock.mockReturnValueOnce([{ name: 'Other' }]);
    (result.provider as InstanceType<typeof MockWebsocketProvider>).emitAwareness({ added: [1], removed: [] }, states);

    expect(context.emit).toHaveBeenCalledWith(
      'awareness-update',
      expect.objectContaining({ states: [{ name: 'Other' }] }),
    );
  });

  it('creates hocuspocus provider and wires lifecycle callbacks', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const context = { emit: vi.fn() };
    const user = { name: 'Ana', email: 'ana@example.com' };

    const { provider } = collaborationModule.createProvider({
      config: { providerType: 'hocuspocus', token: 'abc' },
      user,
      documentId: 'doc-2',
      socket: { url: 'wss://socket' },
      superdocInstance: context,
    });

    expect(provider).toBeInstanceOf(MockHocuspocusProvider);
    expect((provider as InstanceType<typeof MockHocuspocusProvider>)._awarenessField).toEqual({
      field: 'user',
      value: user,
    });

    (provider as InstanceType<typeof MockHocuspocusProvider>).options.onConnect?.();
    (provider as InstanceType<typeof MockHocuspocusProvider>).options.onDisconnect?.();
    (provider as InstanceType<typeof MockHocuspocusProvider>).options.onDestroy?.();
    (provider as InstanceType<typeof MockHocuspocusProvider>).options.onAuthenticationFailed?.('bad-token');
    (provider as InstanceType<typeof MockHocuspocusProvider>).emit('awarenessUpdate', {
      states: new Map([[2, { user }]]),
    });
    expect(awarenessStatesToArrayMock).toHaveBeenCalled();
    expect(context.emit).toHaveBeenCalledWith(
      'awareness-update',
      expect.objectContaining({ states: [{ name: 'Remote User' }] }),
    );
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('collaboration helpers', () => {
  let superdoc: Record<string, unknown>;
  let commentsArray: InstanceType<typeof MockYArray>;

  beforeEach(() => {
    const ydoc = new MockYDoc();
    commentsArray = ydoc.getArray('comments');
    superdoc = {
      config: {
        superdocId: 'doc-123',
        user: { name: 'Owner', email: 'owner@example.com' },
        role: 'editor',
        isInternal: false,
        socket: { id: 'socket' },
        modules: {
          comments: true,
          collaboration: { providerType: 'superdoc', url: 'ws://collab' },
        },
        documents: [{ id: 'doc-a' }, { id: 'doc-b' }],
      },
      colors: ['#f00'],
      provider: {
        on: vi.fn(),
        off: vi.fn(),
      },
      ydoc,
      commentsStore: {
        commentsParentElement: 'parent',
        editorCommentIds: ['1'],
        handleEditorLocationsUpdate: vi.fn(),
        hasSyncedCollaborationComments: false,
        commentsList: [],
      },
      emit: vi.fn(),
      isCollaborative: true,
    };
  });

  it('initCollaborationComments wires provider sync and deduplicates updates', () => {
    initCollaborationComments(superdoc as never);

    expect((superdoc.provider as { on: ReturnType<typeof vi.fn> }).on).toHaveBeenCalledWith(
      'synced',
      expect.any(Function),
    );
    expect(commentsArray._observers.size).toBe(1);

    // Trigger synced event
    const syncedHandler = (superdoc.provider as { on: ReturnType<typeof vi.fn> }).on.mock.calls[0][1] as () => void;
    syncedHandler();
    expect(
      (superdoc.commentsStore as { handleEditorLocationsUpdate: ReturnType<typeof vi.fn> }).handleEditorLocationsUpdate,
    ).toHaveBeenCalled();
    expect((superdoc.commentsStore as { hasSyncedCollaborationComments: boolean }).hasSyncedCollaborationComments).toBe(
      true,
    );

    // Trigger observation from another user
    commentsArray.items = [
      new MockYMap(Object.entries({ commentId: 'c1', text: 'Hello' })),
      new MockYMap(Object.entries({ commentId: 'c1', text: 'Duplicate' })),
      new MockYMap(Object.entries({ commentId: 'c2', text: 'Another' })),
    ];

    const event = {
      transaction: { origin: { user: { name: 'Other', email: 'other@example.com' } } },
    };
    commentsArray.emit(event);

    expect(useCommentMock).toHaveBeenCalledTimes(2);
    // useComment is called with the filtered comment data, and the mock spreads those properties
    // So commentsList should contain objects with commentId, text, and the mocked properties
    const commentsList = (superdoc.commentsStore as { commentsList: { commentId: string; text: string }[] })
      .commentsList;
    expect(commentsList).toHaveLength(2);
    expect(commentsList[0].commentId).toBe('c1');
    expect(commentsList[0].text).toBe('Hello');
    expect(commentsList[1].commentId).toBe('c2');
    expect(commentsList[1].text).toBe('Another');

    // Event from same user should be ignored
    commentsArray.emit({ transaction: { origin: { user: (superdoc.config as { user: unknown }).user } } });
    expect(useCommentMock).toHaveBeenCalledTimes(2);
  });

  it('initCollaborationComments skips when module disabled', () => {
    (superdoc.config as { modules: { comments: boolean } }).modules.comments = false;
    initCollaborationComments(superdoc as never);
    expect((superdoc.provider as { on: ReturnType<typeof vi.fn> }).on).not.toHaveBeenCalled();
  });

  it('initSuperdocYdoc delegates to createProvider with derived document id', () => {
    const mockProvider = { provider: 'p', ydoc: 'y' };
    const spy = vi.spyOn(collaborationModule, 'createProvider').mockReturnValue(mockProvider as never);

    const result = initSuperdocYdoc(superdoc as never);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: 'doc-123-superdoc-external',
      }),
    );
    expect(result).toEqual(mockProvider);
    spy.mockRestore();
  });

  it('makeDocumentsCollaborative mutates documents with provider metadata', () => {
    const created = makeDocumentsCollaborative(superdoc as never);
    expect(created).toHaveLength(2);
    created.forEach((doc) => {
      expect((doc as { provider: unknown }).provider).toBeInstanceOf(MockWebsocketProvider);
      expect((doc as { ydoc: unknown }).ydoc).toBeInstanceOf(MockYDoc);
      expect((doc as { socket: unknown }).socket).toEqual((superdoc.config as { socket: unknown }).socket);
      expect((doc as { role: string }).role).toBe((superdoc.config as { role: string }).role);
    });
  });
});

describe('collaboration comments primitives', () => {
  it('manages Yjs comment array operations', () => {
    const ydoc = new MockYDoc();
    const yArray = ydoc.getArray('comments');
    const baseComment = { commentId: 'c1', body: 'Hello' };
    const mockSuperdoc = {
      user: (globalThis as { superdoc: { user: { name: string; email: string } } }).superdoc.user,
    } as unknown as SuperDoc;

    addYComment(yArray as never, ydoc as never, { comment: baseComment }, mockSuperdoc);
    expect(yArray.toJSON()).toEqual([baseComment]);
    expect((ydoc._lastMeta as { user: { name: string; email: string } }).user).toEqual(
      (globalThis as { superdoc: { user: { name: string; email: string } } }).superdoc.user,
    );

    const updatedComment = { commentId: 'c1', body: 'Updated' };
    updateYComment(yArray as never, ydoc as never, { comment: updatedComment }, mockSuperdoc);
    expect(yArray.toJSON()).toEqual([updatedComment]);

    deleteYComment(yArray as never, ydoc as never, { comment: updatedComment }, mockSuperdoc);
    expect(yArray.toJSON()).toEqual([]);
  });

  it('getCommentIndex finds matching comment ids', () => {
    const ydoc = new MockYDoc();
    const yArray = ydoc.getArray('comments');
    const mockSuperdoc = {
      user: (globalThis as { superdoc: { user: { name: string; email: string } } }).superdoc.user,
    } as unknown as SuperDoc;
    addYComment(yArray as never, ydoc as never, { comment: { commentId: 'c5', body: 'Test' } }, mockSuperdoc);
    expect(getCommentIndex(yArray as never, { commentId: 'missing' })).toBe(-1);
    expect(getCommentIndex(yArray as never, { commentId: 'c5' })).toBe(0);
  });
});

describe('syncCommentsToClients routing', () => {
  let superdoc: Record<string, unknown>;
  let addSpy: ReturnType<typeof vi.spyOn>;
  let updateSpy: ReturnType<typeof vi.spyOn>;
  let deleteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    const ydoc = new MockYDoc();
    superdoc = {
      ydoc,
      isCollaborative: true,
      config: {
        modules: { comments: true },
      },
    };

    addSpy = vi.spyOn(commentsModule, 'addYComment');
    updateSpy = vi.spyOn(commentsModule, 'updateYComment');
    deleteSpy = vi.spyOn(commentsModule, 'deleteYComment');
  });

  afterEach(() => {
    addSpy.mockRestore();
    updateSpy.mockRestore();
    deleteSpy.mockRestore();
  });

  it('routes events to the correct helpers', () => {
    syncCommentsToClients(superdoc as never, { type: 'add', comment: { commentId: 'a' } });
    expect(addSpy).toHaveBeenCalled();

    syncCommentsToClients(superdoc as never, { type: 'update', comment: { commentId: 'a' } });
    expect(updateSpy).toHaveBeenCalledTimes(1);

    syncCommentsToClients(superdoc as never, { type: 'resolved', comment: { commentId: 'a' } });
    expect(updateSpy).toHaveBeenCalledTimes(2);

    syncCommentsToClients(superdoc as never, { type: 'deleted', comment: { commentId: 'a' } });
    expect(deleteSpy).toHaveBeenCalled();
  });

  it('ignores events when collaboration disabled', () => {
    (superdoc as { isCollaborative: boolean }).isCollaborative = false;
    syncCommentsToClients(superdoc as never, { type: 'add', comment: {} });
    expect(addSpy).not.toHaveBeenCalled();
  });

  it('ignores events when comments module disabled', () => {
    (superdoc.config as { modules: { comments: boolean } }).modules.comments = false;
    syncCommentsToClients(superdoc as never, { type: 'add', comment: {} });
    expect(addSpy).not.toHaveBeenCalled();
  });
});

describe('permissions', () => {
  it('exposes immutable list of permission keys', () => {
    expect(Object.keys(PERMISSIONS)).toEqual(expect.arrayContaining(['RESOLVE_OWN', 'VERSION_HISTORY']));
  });

  it('validates role access using isAllowed', () => {
    expect(isAllowed(PERMISSIONS.RESOLVE_OWN, 'editor', true)).toBe(true);
    expect(isAllowed(PERMISSIONS.RESOLVE_OWN, 'viewer', true)).toBe(false);
    expect(isAllowed(PERMISSIONS.REJECT_OWN, 'suggester', false)).toBe(true);
    expect(isAllowed(PERMISSIONS.REJECT_OTHER, 'suggester', false)).toBe(false);
  });

  it('delegates permission decisions to a hook when provided', () => {
    const permissionResolver = vi
      .fn()
      .mockImplementation(
        ({
          defaultDecision,
          comment,
          currentUser,
          superdoc,
        }: {
          defaultDecision: boolean;
          comment: { commentId: string };
          currentUser: { email: string };
          superdoc: unknown;
        }) => {
          expect(defaultDecision).toBe(true);
          expect(comment.commentId).toBe('comment-1');
          expect(currentUser.email).toBe('editor@example.com');
          expect(superdoc).toBeDefined();
          return false;
        },
      );

    const superdoc = {
      config: {
        user: { email: 'editor@example.com' },
        modules: {
          comments: {
            permissionResolver,
          },
        },
      },
    };

    const allowed = isAllowed(PERMISSIONS.RESOLVE_OWN, 'editor', true, {
      superdoc,
      comment: { commentId: 'comment-1' },
      trackedChange: { id: 'comment-1', attrs: { authorEmail: 'editor@example.com' } },
    });

    expect(allowed).toBe(false);
    expect(permissionResolver).toHaveBeenCalledWith(
      expect.objectContaining({
        permission: PERMISSIONS.RESOLVE_OWN,
        role: 'editor',
        isInternal: true,
        defaultDecision: true,
        trackedChange: expect.objectContaining({ id: 'comment-1' }),
      }),
    );
  });

  it('falls back to default decision when hook returns non-boolean', () => {
    const superdoc = {
      config: {
        user: { email: 'viewer@example.com' },
        modules: {
          comments: {
            permissionResolver: vi.fn(() => undefined),
          },
        },
      },
    };

    const allowed = isAllowed(PERMISSIONS.RESOLVE_OWN, 'viewer', true, {
      superdoc,
      comment: { commentId: 'comment-2' },
    });

    expect(allowed).toBe(false);
  });

  it('canPerformPermission resolves tracked-change comments via store', () => {
    const originalIsAllowed = permissionsModule.isAllowed;
    const resolver = vi.fn(({ comment }: { comment: { commentId: string; text: string } }) => {
      expect(comment).toEqual({ commentId: 'change-1', text: 'hello' });
      return true;
    });

    const superdoc = {
      config: {
        role: 'editor',
        isInternal: true,
        user: { email: 'editor@example.com' },
        modules: {
          comments: {
            permissionResolver: resolver,
          },
        },
      },
      commentsStore: {
        getComment: vi.fn(() => ({
          getValues: () => ({ commentId: 'change-1', text: 'hello' }),
        })),
      },
    };

    const isAllowedSpy = vi
      .spyOn(permissionsModule, 'isAllowed')
      .mockImplementation(
        (
          permission: string,
          role: string,
          isInternal: boolean,
          ctx?: { comment: { commentId: string; text: string } },
        ) => {
          expect(ctx?.comment).toEqual({ commentId: 'change-1', text: 'hello' });
          return originalIsAllowed(permission, role, isInternal, ctx as never);
        },
      );

    const result = SuperDoc.prototype.canPerformPermission.call(superdoc, {
      permission: PERMISSIONS.RESOLVE_OWN,
      trackedChange: { id: 'change-1', attrs: { authorEmail: 'editor@example.com' } },
    });

    expect(result).toBe(true);
    expect((superdoc.commentsStore as { getComment: ReturnType<typeof vi.fn> }).getComment).toHaveBeenCalledWith(
      'change-1',
    );
    expect(resolver).toHaveBeenCalled();
    expect(isAllowedSpy).toHaveBeenCalledWith(
      PERMISSIONS.RESOLVE_OWN,
      'editor',
      true,
      expect.objectContaining({ trackedChange: expect.objectContaining({ id: 'change-1' }) }),
    );

    isAllowedSpy.mockRestore();
  });
});
