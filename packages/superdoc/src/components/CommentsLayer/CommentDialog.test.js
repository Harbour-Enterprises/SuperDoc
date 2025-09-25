import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, reactive, h, defineComponent, nextTick } from 'vue';

let superdocStoreStub;
let commentsStoreStub;

vi.mock('@superdoc/stores/superdoc-store', () => ({
  useSuperdocStore: () => superdocStoreStub,
}));

vi.mock('@superdoc/stores/comments-store', () => ({
  useCommentsStore: () => commentsStoreStub,
}));

vi.mock('@superdoc/helpers/use-selection', () => ({
  default: vi.fn((params) => ({ getValues: () => ({ ...params }), selectionBounds: params.selectionBounds || {} })),
}));

vi.mock('@harbour-enterprises/super-editor', () => ({
  SuperInput: defineComponent({
    name: 'SuperInputStub',
    setup(_, { slots }) {
      return () => h('textarea', slots.default?.());
    },
  }),
}));

const simpleStub = (name, emits = []) =>
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
      h('div', { class: 'comment-header-stub', 'data-comment-id': props.comment.commentId }, [
        h('button', { class: 'resolve-btn', onClick: () => emit('resolve') }, 'resolve'),
        h('button', { class: 'reject-btn', onClick: () => emit('reject') }, 'reject'),
        h('button', { class: 'overflow-btn', onClick: () => emit('overflow-select', 'edit') }, 'edit'),
      ]);
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
        onClick: () => emit('select', props.state === 'internal' ? 'external' : 'internal'),
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

const mountDialog = async ({ baseCommentOverrides = {}, extraComments = [], props = {} } = {}) => {
  const baseComment = reactive({
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
          mounted(el, binding) {
            el.__clickOutside = binding.value;
          },
          unmounted(el) {
            delete el.__clickOutside;
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
    expect(superdocStub.activeEditor.commands.setCursorById).toHaveBeenCalledWith(baseComment.commentId);
    expect(commentsStoreStub.activeComment.value).toBe(baseComment.commentId);

    commentsStoreStub.pendingComment.value = {
      commentId: 'pending-1',
      selection: baseComment.selection,
      isInternal: true,
    };
    await nextTick();

    const addButton = wrapper.findAll('button.sd-button.primary').find((btn) => btn.text() === 'Comment');
    await addButton.trigger('click');
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
    expect(superdocStub.activeEditor.commands.acceptTrackedChangeById).toHaveBeenCalledWith(baseComment.commentId);
    expect(baseComment.resolveComment).toHaveBeenCalledWith({
      email: superdocStoreStub.user.email,
      name: superdocStoreStub.user.name,
      superdoc: expect.any(Object),
    });

    header.vm.$emit('reject');
    expect(superdocStub.activeEditor.commands.rejectTrackedChangeById).toHaveBeenCalledWith(baseComment.commentId);
  });

  it('supports editing threaded comments and toggling internal state', async () => {
    const childComment = reactive({
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
    expect(commentsStoreStub.editingCommentId.value).toBe(childComment.commentId);
    expect(commentsStoreStub.setActiveComment).toHaveBeenCalledWith(superdocStub, childComment.commentId);

    commentsStoreStub.currentCommentText.value = '<p>Updated</p>';
    await nextTick();
    const updateButton = wrapper.findAll('button.sd-button.primary').find((btn) => btn.text() === 'Update');
    await updateButton.trigger('click');
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

  it('emits dialog-exit when clicking outside active comment', async () => {
    const { wrapper, baseComment } = await mountDialog();
    commentsStoreStub.activeComment.value = baseComment.commentId;

    const eventTarget = document.createElement('div');
    const handler = wrapper.element.__clickOutside;
    handler({ target: eventTarget, classList: { contains: () => false } });

    expect(commentsStoreStub.setActiveComment).toHaveBeenCalledWith(expect.any(Object), null);
    expect(wrapper.emitted('dialog-exit')).toHaveLength(1);
  });
});
