import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { h, defineComponent, ref, reactive, nextTick } from 'vue';
import { DOCX } from '@harbour-enterprises/common';

const isRef = (value) => value && typeof value === 'object' && 'value' in value;

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia');
  return {
    ...actual,
    storeToRefs: (store) => {
      const result = {};
      for (const key of Object.keys(store)) {
        if (isRef(store[key])) {
          result[key] = store[key];
        }
      }
      return result;
    },
  };
});

let superdocStoreStub;
let commentsStoreStub;

vi.mock('@superdoc/stores/superdoc-store', () => ({
  useSuperdocStore: () => superdocStoreStub,
}));

vi.mock('@superdoc/stores/comments-store', () => ({
  useCommentsStore: () => commentsStoreStub,
}));

const useSelectionMock = vi.fn((params) => ({
  selectionBounds: params.selectionBounds || {},
  getValues: () => ({ ...params }),
}));

vi.mock('@superdoc/helpers/use-selection', () => ({
  default: useSelectionMock,
}));

const useSelectedTextMock = vi.fn(() => ({ selectedText: ref('') }));
vi.mock('@superdoc/composables/use-selected-text', () => ({
  useSelectedText: useSelectedTextMock,
}));

const useAiMock = vi.fn(() => ({
  showAiLayer: ref(false),
  showAiWriter: ref(false),
  aiWriterPosition: reactive({ top: '0px', left: '0px' }),
  aiLayer: ref(null),
  initAiLayer: vi.fn(),
  showAiWriterAtCursor: vi.fn(),
  handleAiWriterClose: vi.fn(),
  handleAiToolClick: vi.fn(),
}));

vi.mock('@superdoc/composables/use-ai', () => ({
  useAi: useAiMock,
}));

vi.mock('@superdoc/composables/use-high-contrast-mode', () => ({
  useHighContrastMode: () => ({ isHighContrastMode: ref(false) }),
}));

const stubComponent = (name) =>
  defineComponent({
    name,
    props: ['comment', 'autoFocus', 'parent', 'documentData', 'config', 'documentId', 'fileSource', 'state', 'options'],
    emits: ['pageMarginsChange', 'ready', 'selection-change', 'page-loaded', 'bypass-selection'],
    setup(props, { slots }) {
      return () => h('div', { class: `${name}-stub` }, slots.default ? slots.default() : undefined);
    },
  });

const SuperEditorStub = defineComponent({
  name: 'SuperEditorStub',
  props: ['fileSource', 'state', 'documentId', 'options'],
  emits: ['pageMarginsChange'],
  setup(props) {
    return () => h('div', { class: 'super-editor-stub' }, [JSON.stringify(props.options.documentId)]);
  },
});

const AIWriterStub = stubComponent('AIWriter');
const CommentDialogStub = stubComponent('CommentDialog');
const FloatingCommentsStub = stubComponent('FloatingComments');
const CommentsLayerStub = stubComponent('CommentsLayer');
const HrbrFieldsLayerStub = stubComponent('HrbrFieldsLayer');
const AiLayerStub = stubComponent('AiLayer');
const PdfViewerStub = stubComponent('PdfViewer');
const HtmlViewerStub = stubComponent('HtmlViewer');

vi.mock('@harbour-enterprises/super-editor', () => ({
  SuperEditor: SuperEditorStub,
  AIWriter: AIWriterStub,
}));

vi.mock('./components/PdfViewer/PdfViewer.vue', () => ({
  default: PdfViewerStub,
}));

vi.mock('./components/HtmlViewer/HtmlViewer.vue', () => ({
  default: HtmlViewerStub,
}));

vi.mock('@superdoc/components/CommentsLayer/CommentDialog.vue', () => ({
  default: CommentDialogStub,
}));

vi.mock('@superdoc/components/CommentsLayer/FloatingComments.vue', () => ({
  default: FloatingCommentsStub,
}));

vi.mock('@superdoc/components/HrbrFieldsLayer/HrbrFieldsLayer.vue', () => ({
  default: HrbrFieldsLayerStub,
}));

vi.mock('@superdoc/components/AiLayer/AiLayer.vue', () => ({
  default: AiLayerStub,
}));

vi.mock('@superdoc/components/CommentsLayer/CommentsLayer.vue', () => ({
  default: CommentsLayerStub,
}));

vi.mock('naive-ui', () => ({
  NMessageProvider: defineComponent({
    name: 'NMessageProvider',
    setup(_, { slots }) {
      return () => h('div', { class: 'n-message-provider-stub' }, slots.default?.());
    },
  }),
}));

const buildSuperdocStore = () => {
  const documents = ref([
    {
      id: 'doc-1',
      type: DOCX,
      data: 'mock-data',
      state: {},
      html: '<p></p>',
      markdown: '',
      isReady: false,
      rulers: false,
      setEditor: vi.fn(),
      getEditor: vi.fn(() => null),
    },
  ]);

  return {
    documents,
    isReady: ref(false),
    areDocumentsReady: ref(true),
    selectionPosition: ref(null),
    activeSelection: ref(null),
    activeZoom: ref(100),
    modules: reactive({ comments: { readOnly: false }, ai: {}, 'hrbr-fields': [] }),
    handlePageReady: vi.fn(),
    user: { name: 'Ada', email: 'ada@example.com' },
    getDocument: vi.fn((id) => documents.value.find((d) => d.id === id)),
  };
};

const buildCommentsStore = () => ({
  init: vi.fn(),
  showAddComment: vi.fn(),
  handleEditorLocationsUpdate: vi.fn(),
  handleTrackedChangeUpdate: vi.fn(),
  removePendingComment: vi.fn(),
  setActiveComment: vi.fn(),
  processLoadedDocxComments: vi.fn(),
  translateCommentsForExport: vi.fn(() => []),
  getPendingComment: vi.fn(() => ({ commentId: 'pending', selection: { getValues: () => ({}) } })),
  commentsParentElement: null,
  editorCommentIds: [],
  proxy: null,
  commentsList: [],
  lastUpdate: null,
  gesturePositions: ref([]),
  suppressInternalExternal: ref(false),
  getConfig: ref({ readOnly: false }),
  activeComment: ref(null),
  floatingCommentsOffset: ref(0),
  pendingComment: ref(null),
  currentCommentText: ref('<p>Text</p>'),
  isDebugging: ref(false),
  editingCommentId: ref(null),
  editorCommentPositions: ref([]),
  skipSelectionUpdate: ref(false),
  documentsWithConverations: ref([]),
  commentsByDocument: ref(new Map()),
  isCommentsListVisible: ref(false),
  isFloatingCommentsReady: ref(false),
  generalCommentIds: ref([]),
  getFloatingComments: ref([]),
  hasSyncedCollaborationComments: ref(false),
  hasInitializedLocations: ref(true),
  isCommentHighlighted: ref(false),
});

const mountComponent = async (superdocStub) => {
  superdocStoreStub = buildSuperdocStore();
  commentsStoreStub = buildCommentsStore();
  superdocStoreStub.modules.ai = { endpoint: '/ai' };
  commentsStoreStub.documentsWithConverations.value = [{ id: 'doc-1' }];

  const component = (await import('./SuperDoc.vue')).default;

  return mount(component, {
    global: {
      components: {
        SuperEditor: SuperEditorStub,
        CommentDialog: CommentDialogStub,
        FloatingComments: FloatingCommentsStub,
        HrbrFieldsLayer: HrbrFieldsLayerStub,
        AIWriter: AIWriterStub,
      },
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
};

const createSuperdocStub = () => {
  const toolbar = { config: { aiApiKey: 'abc' }, setActiveEditor: vi.fn(), updateToolbarState: vi.fn() };
  return {
    config: {
      modules: { comments: {}, ai: {}, toolbar: {}, pdf: {} },
      pagination: false,
      isDebug: false,
      documentMode: 'editing',
      role: 'editor',
      suppressDefaultDocxStyles: false,
      disableContextMenu: false,
    },
    activeEditor: null,
    toolbar,
    colors: ['#111'],
    broadcastEditorBeforeCreate: vi.fn(),
    broadcastEditorCreate: vi.fn(),
    broadcastEditorDestroy: vi.fn(),
    broadcastPdfDocumentReady: vi.fn(),
    broadcastSidebarToggle: vi.fn(),
    setActiveEditor: vi.fn(),
    lockSuperdoc: vi.fn(),
    emit: vi.fn(),
  };
};

describe('SuperDoc.vue', () => {
  beforeEach(() => {
    useSelectionMock.mockClear();
    useAiMock.mockClear();
    useSelectedTextMock.mockClear();
    if (!window.matchMedia) {
      window.matchMedia = vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });
    }
  });

  it('wires editor lifecycle events and propagates updates', async () => {
    const superdocStub = createSuperdocStub();
    const wrapper = await mountComponent(superdocStub);
    await nextTick();

    const editorComponent = wrapper.findComponent(SuperEditorStub);
    expect(editorComponent.exists()).toBe(true);

    const options = editorComponent.props('options');
    const editorMock = {
      options: { documentId: 'doc-1' },
      commands: {
        togglePagination: vi.fn(),
        insertAiMark: vi.fn(),
        setCursorById: vi.fn(),
        search: vi.fn(),
        goToSearchResult: vi.fn(),
      },
      view: {
        coordsAtPos: vi.fn((pos) =>
          pos === 1 ? { top: 100, bottom: 120, left: 10, right: 20 } : { top: 130, bottom: 160, left: 60, right: 80 },
        ),
        state: { selection: { empty: true } },
      },
      getPageStyles: vi.fn(() => ({ pageMargins: {} })),
    };

    options.onBeforeCreate({ editor: editorMock });
    expect(superdocStub.broadcastEditorBeforeCreate).toHaveBeenCalled();

    options.onCreate({ editor: editorMock });
    expect(superdocStoreStub.documents.value[0].setEditor).toHaveBeenCalledWith(editorMock);
    expect(superdocStub.setActiveEditor).toHaveBeenCalledWith(editorMock);
    expect(superdocStub.broadcastEditorCreate).toHaveBeenCalled();
    expect(useAiMock).toHaveBeenCalled();

    options.onSelectionUpdate({
      editor: editorMock,
      transaction: { selection: { $from: { pos: 1 }, $to: { pos: 3 } } },
    });
    expect(useSelectionMock).toHaveBeenCalled();

    options.onCommentsUpdate({ activeCommentId: 'c1', type: 'trackedChange' });
    expect(commentsStoreStub.handleTrackedChangeUpdate).toHaveBeenCalled();
    await nextTick();
    expect(commentsStoreStub.setActiveComment).toHaveBeenCalledWith(superdocStub, 'c1');

    options.onCollaborationReady({ editor: editorMock });
    expect(superdocStub.emit).toHaveBeenCalledWith('collaboration-ready', { editor: editorMock });
    await nextTick();
    expect(superdocStoreStub.isReady.value).toBe(true);

    options.onDocumentLocked({ editor: editorMock, isLocked: true, lockedBy: { name: 'A' } });
    expect(superdocStub.lockSuperdoc).toHaveBeenCalledWith(true, { name: 'A' });

    options.onException({ error: new Error('boom'), editor: editorMock });
    expect(superdocStub.emit).toHaveBeenCalledWith('exception', { error: expect.any(Error), editor: editorMock });
  });

  it('shows comments sidebar and tools, handles menu actions', async () => {
    const superdocStub = createSuperdocStub();
    const wrapper = await mountComponent(superdocStub);
    await nextTick();

    const options = wrapper.findComponent(SuperEditorStub).props('options');
    const editorMock = {
      options: { documentId: 'doc-1' },
      commands: {
        togglePagination: vi.fn(),
        insertAiMark: vi.fn(),
      },
      view: {
        coordsAtPos: vi.fn((pos) =>
          pos === 1 ? { top: 100, bottom: 140, left: 10, right: 30 } : { top: 120, bottom: 160, left: 70, right: 90 },
        ),
        state: { selection: { empty: true } },
      },
      getPageStyles: vi.fn(() => ({ pageMargins: {} })),
    };
    await nextTick();
    options.onSelectionUpdate({
      editor: editorMock,
      transaction: { selection: { $from: { pos: 1 }, $to: { pos: 6 } } },
    });
    await nextTick();
    const setupState = wrapper.vm.$.setupState;
    setupState.toolsMenuPosition.top = '12px';
    setupState.toolsMenuPosition.right = '0px';
    setupState.selectionPosition.value = {
      left: 10,
      right: 40,
      top: 20,
      bottom: 60,
      source: 'super-editor',
    };
    await nextTick();

    const handleToolClick = wrapper.vm.$.setupState.handleToolClick;
    handleToolClick('comments');
    expect(commentsStoreStub.showAddComment).toHaveBeenCalledWith(superdocStub);

    handleToolClick('ai');
    const aiMockResult = useAiMock.mock.results.at(-1)?.value;
    expect(aiMockResult?.handleAiToolClick).toHaveBeenCalled();

    commentsStoreStub.pendingComment.value = { commentId: 'new', selection: { getValues: () => ({}) } };
    await nextTick();
    const toggleArg = superdocStub.broadcastSidebarToggle.mock.calls.at(-1)[0];
    expect(toggleArg).toEqual(expect.objectContaining({ commentId: 'new' }));
    expect(wrapper.findComponent(CommentDialogStub).exists()).toBe(true);

    superdocStoreStub.isReady.value = true;
    await nextTick();
    commentsStoreStub.getFloatingComments.value = [{ id: 'f1' }];
    await nextTick();
    await nextTick();
    expect(commentsStoreStub.hasInitializedLocations.value).toBe(true);
  });
});
