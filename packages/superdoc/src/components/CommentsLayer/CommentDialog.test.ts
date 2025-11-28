import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { ref, reactive, h, defineComponent, nextTick, DefineComponent } from 'vue';

let superdocStoreStub: Record<string, unknown>;
let commentsStoreStub: Record<string, unknown>;

vi.mock('@superdoc/stores/superdoc-store', () => ({
  useSuperdocStore: () => superdocStoreStub,
}));

vi.mock('@superdoc/stores/comments-store', () => ({
  useCommentsStore: () => commentsStoreStub,
}));

vi.mock('@superdoc/helpers/use-selection', () => ({
  default: vi.fn((params: Record<string, unknown>) => ({
    getValues: () => ({ ...params }),
    selectionBounds: params.selectionBounds || {},
  })),
}));

vi.mock('@harbour-enterprises/super-editor', () => ({
  SuperInput: defineComponent({
    name: 'SuperInputStub',
    setup(_, { slots }) {
      return () => h('textarea', slots.default?.());
    },
  }),
}));

const simpleStub = (name: string, emits: string[] = []): DefineComponent =>
  defineComponent({
    name,
    props: ['comment', 'config', 'state', 'isDisabled', 'timestamp', 'users'],
    emits,
    setup(props, { emit }) {
      return () =>
        h(
          'div',
          {
            class: `${name}-stub`,
            onClick: () => {
              if (emits.includes('click')) emit('click');
            },
          },
          [],
        );
    },
  });

const CommentHeaderStub = defineComponent({
  name: 'CommentHeaderStub',
  props: ['config', 'timestamp', 'comment'],
  emits: ['resolve', 'reject', 'overflow-select'],
  setup(props, { emit }) {
    return () =>
      h(
        'div',
        { class: 'comment-header-stub', 'data-comment-id': (props.comment as { commentId: string }).commentId },
        [
          h('button', { class: 'resolve-btn', onClick: () => emit('resolve') }, 'resolve'),
          h('button', { class: 'reject-btn', onClick: () => emit('reject') }, 'reject'),
          h('button', { class: 'overflow-btn', onClick: () => emit('overflow-select', 'edit') }, 'edit'),
        ],
      );
  },
});

const InternalDropdownStub = defineComponent({
  name: 'InternalDropdownStub',
  props: ['isDisabled', 'state'],
  emits: ['select'],
  setup(props, { emit }) {
    return () =>
      h('div', {
        class: 'internal-dropdown-stub',
        onClick: () => emit('select', (props.state as string) === 'internal' ? 'external' : 'internal'),
      });
  },
});

const CommentInputStub = defineComponent({
  name: 'CommentInputStub',
  props: ['users', 'config', 'comment'],
  setup() {
    return () => h('div', { class: 'comment-input-stub' });
  },
});

const AvatarStub = simpleStub('Avatar');

vi.mock('@superdoc/components/CommentsLayer/InternalDropdown.vue', () => ({ default: InternalDropdownStub }));
vi.mock('@superdoc/components/CommentsLayer/CommentHeader.vue', () => ({ default: CommentHeaderStub }));
vi.mock('@superdoc/components/CommentsLayer/CommentInput.vue', () => ({ default: CommentInputStub }));
vi.mock('@superdoc/components/general/Avatar.vue', () => ({ default: AvatarStub }));

vi.mock('naive-ui', () => ({
  NDropdown: simpleStub('NDropdown'),
  NTooltip: simpleStub('NTooltip'),
  NSelect: simpleStub('NSelect'),
}));

vi.mock('@superdoc/core/collaboration/permissions.js', () => ({
  PERMISSIONS: { MANAGE_COMMENTS: 'manage' },
  isAllowed: () => true,
}));

interface BaseComment {
  uid: string;
  commentId: string;
  parentCommentId: string | null;
  email: string;
  commentText: string;
  fileId: string;
  fileType: string;
  setActive: ReturnType<typeof vi.fn>;
  setText: ReturnType<typeof vi.fn>;
  setIsInternal: ReturnType<typeof vi.fn>;
  resolveComment: ReturnType<typeof vi.fn>;
  trackedChange: boolean;
  importedId: string | null;
  trackedChangeType: string | null;
  trackedChangeText: string | null;
  deletedText: string | null;
  selection: {
    getValues: () => { selectionBounds: { top: number; bottom: number; left: number; right: number } };
    selectionBounds: { top: number; bottom: number; left: number; right: number };
  };
  [key: string]: unknown;
}

interface MountOptions {
  baseCommentOverrides?: Partial<BaseComment>;
  extraComments?: unknown[];
  props?: Record<string, unknown>;
}

const mountDialog = async ({ baseCommentOverrides = {}, extraComments = [], props = {} }: MountOptions = {}): Promise<{
  wrapper: VueWrapper;
  baseComment: BaseComment;
  superdocStub: Record<string, unknown>;
}> => {
  const baseComment: BaseComment = reactive({
    uid: 'uid-1',
    commentId: 'comment-1',
    parentCommentId: null,
    email: 'author@example.com',
    commentText: '<p>Hello</p>',
    fileId: 'doc-1',
    fileType: 'DOCX',
    setActive: vi.fn(),
    setText: vi.fn(),
    setIsInternal: vi.fn(),
    resolveComment: vi.fn(),
    trackedChange: false,
    importedId: null,
    trackedChangeType: null,
    trackedChangeText: null,
    deletedText: null,
    selection: {
      getValues: () => ({ selectionBounds: { top: 110, bottom: 130, left: 15, right: 30 } }),
      selectionBounds: { top: 110, bottom: 130, left: 15, right: 30 },
    },
  });

  Object.assign(baseComment, baseCommentOverrides);

  superdocStoreStub = {
    activeZoom: ref(100),
    user: reactive({ name: 'Editor', email: 'editor@example.com' }),
  };

  commentsStoreStub = {
    addComment: vi.fn(),
    cancelComment: vi.fn(),
    deleteComment: vi.fn(),
    removePendingComment: vi.fn(),
    setActiveComment: vi.fn(),
    getPendingComment: vi.fn(() => ({
      commentId: 'pending-1',
      selection: baseComment.selection,
      isInternal: true,
    })),
    commentsList: [baseComment, ...extraComments],
    suppressInternalExternal: ref(false),
    getConfig: ref({ readOnly: false }),
    activeComment: ref(null),
    floatingCommentsOffset: ref(0),
    pendingComment: ref(null),
    currentCommentText: ref('<p>Pending</p>'),
    isDebugging: ref(false),
    editingCommentId: ref(null),
    editorCommentPositions: ref({}),
    hasSyncedCollaborationComments: ref(false),
    generalCommentIds: ref([]),
    getFloatingComments: ref([]),
    commentsByDocument: ref(new Map()),
    documentsWithConverations: ref([]),
    isCommentsListVisible: ref(false),
    isFloatingCommentsReady: ref(false),
    hasInitializedLocations: ref(true),
    isCommentHighlighted: ref(false),
  };

  const superdocStub = {
    config: { role: 'editor', isInternal: true },
    users: [
      { name: 'Internal', email: 'internal@example.com', access: { role: 'internal' } },
      { name: 'External', email: 'external@example.com', access: { role: 'external' } },
    ],
    activeEditor: {
      commands: {
        setCursorById: vi.fn(),
        rejectTrackedChangeById: vi.fn(),
        acceptTrackedChangeById: vi.fn(),
        setCommentInternal: vi.fn(),
        resolveComment: vi.fn(),
      },
    },
    emit: vi.fn(),
  };

  document.body.innerHTML = '<div id="host"></div>';

  const component = (await import('./CommentDialog.vue')).default;
  const wrapper = mount(component, {
    props: {
      comment: baseComment,
      autoFocus: true,
      ...props,
    },
    global: {
      config: {
        globalProperties: {
          $superdoc: superdocStub,
        },
      },
      directives: {
        'click-outside': {
          mounted(el: HTMLElement, binding: { value: unknown }) {
            (el as HTMLElement & { __clickOutside?: unknown }).__clickOutside = binding.value;
          },
          unmounted(el: HTMLElement) {
            delete (el as HTMLElement & { __clickOutside?: unknown }).__clickOutside;
          },
        },
      },
    },
  });

  await nextTick();
  return { wrapper, baseComment, superdocStub };
};

describe('CommentDialog.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('focuses the comment on mount and adds replies', async () => {
    const { wrapper, baseComment, superdocStub } = await mountDialog();

    await nextTick();
    expect(baseComment.setActive).toHaveBeenCalledWith(superdocStub);
    expect(
      (superdocStub.activeEditor as { commands: { setCursorById: ReturnType<typeof vi.fn> } }).commands.setCursorById,
    ).toHaveBeenCalledWith(baseComment.commentId);
    expect((commentsStoreStub.activeComment as { value: string }).value).toBe(baseComment.commentId);

    (commentsStoreStub.pendingComment as { value: unknown }).value = {
      commentId: 'pending-1',
      selection: baseComment.selection,
      isInternal: true,
    };
    await nextTick();

    const addButton = wrapper.findAll('button.sd-button.primary').find((btn) => btn.text() === 'Comment');
    await addButton?.trigger('click');
    expect(commentsStoreStub.getPendingComment).toHaveBeenCalled();
    expect(commentsStoreStub.addComment).toHaveBeenCalledWith({
      superdoc: superdocStub,
      comment: expect.objectContaining({ commentId: 'pending-1' }),
    });
  });

  it('handles resolve and reject for tracked change comments', async () => {
    const { wrapper, baseComment, superdocStub } = await mountDialog({
      baseCommentOverrides: {
        trackedChange: true,
        trackedChangeType: 'trackInsert',
        trackedChangeText: 'Added',
        deletedText: 'Removed',
      },
    });

    const header = wrapper.findComponent(CommentHeaderStub);
    header.vm.$emit('resolve');
    expect(
      (superdocStub.activeEditor as { commands: { acceptTrackedChangeById: ReturnType<typeof vi.fn> } }).commands
        .acceptTrackedChangeById,
    ).toHaveBeenCalledWith(baseComment.commentId);
    expect(baseComment.resolveComment).toHaveBeenCalledWith({
      email: (superdocStoreStub.user as { email: string }).email,
      name: (superdocStoreStub.user as { name: string }).name,
      superdoc: expect.any(Object),
    });

    header.vm.$emit('reject');
    expect(
      (superdocStub.activeEditor as { commands: { rejectTrackedChangeById: ReturnType<typeof vi.fn> } }).commands
        .rejectTrackedChangeById,
    ).toHaveBeenCalledWith(baseComment.commentId);
  });

  it('supports editing threaded comments and toggling internal state', async () => {
    const childComment: BaseComment = reactive({
      uid: 'uid-2',
      commentId: 'child-1',
      parentCommentId: 'comment-1',
      email: 'child@example.com',
      commentText: '<p>Child</p>',
      fileId: 'doc-1',
      fileType: 'DOCX',
      setActive: vi.fn(),
      setText: vi.fn(),
      setIsInternal: vi.fn(),
      resolveComment: vi.fn(),
      trackedChange: false,
      importedId: null,
      trackedChangeType: null,
      trackedChangeText: null,
      deletedText: null,
      selection: {
        getValues: () => ({ selectionBounds: { top: 120, bottom: 150, left: 20, right: 40 } }),
        selectionBounds: { top: 120, bottom: 150, left: 20, right: 40 },
      },
    });

    const { wrapper, baseComment, superdocStub } = await mountDialog({
      extraComments: [childComment],
    });

    const headers = wrapper.findAllComponents(CommentHeaderStub);
    headers[1].vm.$emit('overflow-select', 'edit');
    expect((commentsStoreStub.editingCommentId as { value: string }).value).toBe(childComment.commentId);
    expect(commentsStoreStub.setActiveComment).toHaveBeenCalledWith(superdocStub, childComment.commentId);

    (commentsStoreStub.currentCommentText as { value: string }).value = '<p>Updated</p>';
    await nextTick();
    const updateButton = wrapper.findAll('button.sd-button.primary').find((btn) => btn.text() === 'Update');
    await updateButton?.trigger('click');
    expect(childComment.setText).toHaveBeenCalledWith({ text: '<p>Updated</p>', superdoc: superdocStub });
    expect(commentsStoreStub.removePendingComment).toHaveBeenCalledWith(superdocStub);

    headers[1].vm.$emit('overflow-select', 'delete');
    expect(commentsStoreStub.deleteComment).toHaveBeenCalledWith({
      superdoc: superdocStub,
      commentId: childComment.commentId,
    });

    const dropdown = wrapper.findComponent(InternalDropdownStub);
    dropdown.vm.$emit('select', 'external');
    expect(baseComment.setIsInternal).toHaveBeenCalledWith({ isInternal: false, superdoc: superdocStub });
  });

  it('emits dialog-exit when clicking outside active comment and no track changes highlighted', async () => {
    const { wrapper, baseComment } = await mountDialog();
    (commentsStoreStub.activeComment as { value: string }).value = baseComment.commentId;

    const eventTarget = document.createElement('div');
    const handler = (
      wrapper.element as HTMLElement & {
        __clickOutside?: (event: {
          target: HTMLElement;
          classList: { contains: (className: string) => boolean };
        }) => void;
      }
    ).__clickOutside;
    handler?.({ target: eventTarget, classList: { contains: () => false } });

    expect(commentsStoreStub.setActiveComment).toHaveBeenCalledWith(expect.any(Object), null);
    expect(wrapper.emitted('dialog-exit')).toHaveLength(1);
  });

  it('does not emit dialog-exit when track changes highlighted', async () => {
    const { wrapper, baseComment } = await mountDialog();
    (commentsStoreStub.activeComment as { value: string }).value = baseComment.commentId;
    (commentsStoreStub.isCommentHighlighted as { value: boolean }).value = true;

    const eventTarget = document.createElement('div');
    const handler = (
      wrapper.element as HTMLElement & {
        __clickOutside?: (event: {
          target: HTMLElement;
          classList: { contains: (className: string) => boolean };
        }) => void;
      }
    ).__clickOutside;
    handler?.({ target: eventTarget, classList: { contains: () => false } });

    expect(commentsStoreStub.setActiveComment).not.toHaveBeenCalled();
    expect(wrapper.emitted()).not.toHaveProperty('dialog-exit');
  });
});
