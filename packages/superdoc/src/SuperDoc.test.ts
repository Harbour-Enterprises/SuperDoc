import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { h, defineComponent, ref, reactive, nextTick, DefineComponent } from 'vue';
import { DOCX } from '@superdoc/common';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { Extension } from '../../super-editor/src/core/Extension.js';
import { CommentsPlugin, CommentsPluginKey } from '../../super-editor/src/extensions/comment/comments-plugin.js';
import { CommentMarkName } from '../../super-editor/src/extensions/comment/comments-constants.js';

const isRef = (value: unknown): boolean => value !== null && typeof value === 'object' && 'value' in value;

// Mock state for PresentationEditor
const mockState: { instances: Map<string, unknown> } = { instances: new Map() };

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia');
  return {
    ...actual,
    storeToRefs: (store: Record<string, unknown>) => {
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(store)) {
        if (isRef(store[key])) {
          result[key] = store[key];
        }
      }
      return result;
    },
  };
});

let superdocStoreStub: Record<string, unknown>;
let commentsStoreStub: Record<string, unknown>;

vi.mock('@superdoc/stores/superdoc-store', () => ({
  useSuperdocStore: () => superdocStoreStub,
}));

vi.mock('@superdoc/stores/comments-store', () => ({
  useCommentsStore: () => commentsStoreStub,
}));

const useSelectionMock = vi.fn((params: Record<string, unknown>) => ({
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

const stubComponent = (name: string): DefineComponent =>
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

// Mock @harbour-enterprises/super-editor with stubs and PresentationEditor class
vi.mock('@harbour-enterprises/super-editor', () => ({
  SuperEditor: SuperEditorStub,
  AIWriter: AIWriterStub,
  PresentationEditor: class PresentationEditorMock {
    static getInstance(documentId: string): unknown {
      return mockState.instances.get(documentId);
    }

    static setGlobalZoom(zoom: number): void {
      mockState.instances.forEach((instance: unknown) => {
        (instance as { setZoom?: (zoom: number) => void })?.setZoom?.(zoom);
      });
    }
  },
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

const buildSuperdocStore = (): Record<string, unknown> => {
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
    getDocument: vi.fn((id: string) => documents.value.find((d) => d.id === id)),
  };
};

const buildCommentsStore = (): Record<string, unknown> => ({
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

const mountComponent = async (superdocStub: Record<string, unknown>): Promise<VueWrapper> => {
  superdocStoreStub = buildSuperdocStore();
  commentsStoreStub = buildCommentsStore();
  (superdocStoreStub.modules as Record<string, unknown>).ai = { endpoint: '/ai' };
  (commentsStoreStub.documentsWithConverations as { value: unknown[] }).value = [{ id: 'doc-1' }];

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
};

const createSuperdocStub = (): Record<string, unknown> => {
  const toolbar = { config: { aiApiKey: 'abc' }, setActiveEditor: vi.fn(), updateToolbarState: vi.fn() };
  return {
    config: {
      modules: { comments: {}, ai: {}, toolbar: {}, pdf: {} },
      isDebug: false,
      documentMode: 'editing',
      role: 'editor',
      suppressDefaultDocxStyles: false,
      disableContextMenu: false,
      layoutEngineOptions: {},
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
    listeners: vi.fn(),
    captureLayoutPipelineEvent: vi.fn(),
    canPerformPermission: vi.fn(() => true),
  };
};

const createFloatingCommentsSchema = (): Schema =>
  new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: { content: 'inline*', group: 'block', toDOM: () => ['p', 0], parseDOM: [{ tag: 'p' }] },
      text: { group: 'inline' },
    },
    marks: {
      [CommentMarkName]: {
        attrs: { commentId: { default: null }, importedId: { default: null }, internal: { default: true } },
        inclusive: false,
        toDOM: (mark) => [CommentMarkName, mark.attrs],
        parseDOM: [{ tag: CommentMarkName }],
      },
    },
  });

const createImportedCommentDoc = (threadId: string): { schema: Schema; doc: unknown } => {
  const schema = createFloatingCommentsSchema();
  const importedMark = schema.marks[CommentMarkName].create({ importedId: threadId, internal: true });
  const paragraph = schema.node('paragraph', null, [schema.text('Imported', [importedMark])]);
  const doc = schema.node('doc', null, [paragraph]);

  return { schema, doc };
};

const createCommentsPluginEnvironment = ({
  schema,
  doc,
}: {
  schema: Schema;
  doc: unknown;
}): Record<string, unknown> => {
  const selection = TextSelection.create(doc as never, 1);
  let state = EditorState.create({ schema, doc: doc as never, selection });

  const editor: Record<string, unknown> = {
    options: { documentId: 'doc-1' },
    emit: vi.fn(),
    view: null,
  };

  const extension = Extension.create(CommentsPlugin.config as never);
  extension.addCommands = CommentsPlugin.config.addCommands.bind(extension);
  extension.addPmPlugins = CommentsPlugin.config.addPmPlugins.bind(extension);
  (extension as Record<string, unknown>).editor = editor;
  const [plugin] = extension.addPmPlugins();

  state = EditorState.create({ schema, doc: doc as never, selection, plugins: [plugin] });

  const view: Record<string, unknown> = {
    state,
    dispatch: vi.fn((tr: unknown) => {
      state = state.apply(tr as never);
      view.state = state;
    }),
    focus: vi.fn(),
    coordsAtPos: vi.fn(),
  };

  editor.view = view;
  const pluginView = (plugin.spec as { view?: (view: unknown) => unknown }).view?.(view);

  return { editor, view, pluginView };
};

describe('SuperDoc.vue', () => {
  beforeEach(() => {
    useSelectionMock.mockClear();
    useAiMock.mockClear();
    useSelectedTextMock.mockClear();
    mockState.instances.clear();

    // Set up default mock presentation editor instances for common document IDs
    const mockPresentationEditor = {
      getSelectionBounds: vi.fn(() => null),
      getCommentBounds: vi.fn((positions: unknown[]) => positions),
      getRangeRects: vi.fn(() => []),
      getPages: vi.fn(() => []),
      getLayoutError: vi.fn(() => null),
      setZoom: vi.fn(),
    };
    mockState.instances.set('doc-1', mockPresentationEditor);

    if (!window.matchMedia) {
      window.matchMedia = vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as typeof window.matchMedia;
    }
  });

  it('wires editor lifecycle events and propagates updates', async () => {
    const superdocStub = createSuperdocStub();
    const wrapper = await mountComponent(superdocStub);
    await nextTick();

    const editorComponent = wrapper.findComponent(SuperEditorStub);
    expect(editorComponent.exists()).toBe(true);

    const options = editorComponent.props('options') as Record<string, unknown>;
    const editorMock: Record<string, unknown> = {
      options: { documentId: 'doc-1' },
      commands: {
        togglePagination: vi.fn(),
        insertAiMark: vi.fn(),
        setCursorById: vi.fn(),
        search: vi.fn(),
        goToSearchResult: vi.fn(),
      },
      view: {
        coordsAtPos: vi.fn((pos: number) =>
          pos === 1 ? { top: 100, bottom: 120, left: 10, right: 20 } : { top: 130, bottom: 160, left: 60, right: 80 },
        ),
        state: { selection: { empty: true } },
      },
      getPageStyles: vi.fn(() => ({ pageMargins: {} })),
    };

    (options.onBeforeCreate as (params: { editor: unknown }) => void)({ editor: editorMock });
    expect(superdocStub.broadcastEditorBeforeCreate).toHaveBeenCalled();

    (options.onCreate as (params: { editor: unknown }) => void)({ editor: editorMock });
    expect(
      (superdocStoreStub.documents as { value: { setEditor: ReturnType<typeof vi.fn> }[] }).value[0].setEditor,
    ).toHaveBeenCalledWith(editorMock);
    expect(superdocStub.setActiveEditor).toHaveBeenCalledWith(editorMock);
    expect(superdocStub.broadcastEditorCreate).toHaveBeenCalled();
    expect(useAiMock).toHaveBeenCalled();

    (options.onSelectionUpdate as (params: { editor: unknown; transaction: unknown }) => void)({
      editor: editorMock,
      transaction: { selection: { $from: { pos: 1 }, $to: { pos: 3 } } },
    });
    expect(useSelectionMock).toHaveBeenCalled();

    (options.onCommentsUpdate as (params: { activeCommentId: string; type: string }) => void)({
      activeCommentId: 'c1',
      type: 'trackedChange',
    });
    expect(commentsStoreStub.handleTrackedChangeUpdate).toHaveBeenCalled();
    await nextTick();
    expect(commentsStoreStub.setActiveComment).toHaveBeenCalledWith(superdocStub, 'c1');

    (options.onCollaborationReady as (params: { editor: unknown }) => void)({ editor: editorMock });
    expect(superdocStub.emit).toHaveBeenCalledWith('collaboration-ready', { editor: editorMock });
    await nextTick();
    expect((superdocStoreStub.isReady as { value: boolean }).value).toBe(true);

    (options.onDocumentLocked as (params: { editor: unknown; isLocked: boolean; lockedBy: unknown }) => void)({
      editor: editorMock,
      isLocked: true,
      lockedBy: { name: 'A' },
    });
    expect(superdocStub.lockSuperdoc).toHaveBeenCalledWith(true, { name: 'A' });

    (options.onException as (params: { error: Error; editor: unknown }) => void)({
      error: new Error('boom'),
      editor: editorMock,
    });
    expect(superdocStub.emit).toHaveBeenCalledWith('exception', { error: expect.any(Error), editor: editorMock });
  });

  it('shows comments sidebar and tools, handles menu actions', async () => {
    const superdocStub = createSuperdocStub();
    const wrapper = await mountComponent(superdocStub);
    await nextTick();

    const options = wrapper.findComponent(SuperEditorStub).props('options') as Record<string, unknown>;
    const editorMock: Record<string, unknown> = {
      options: { documentId: 'doc-1' },
      commands: {
        togglePagination: vi.fn(),
        insertAiMark: vi.fn(),
      },
      view: {
        coordsAtPos: vi.fn((pos: number) =>
          pos === 1 ? { top: 100, bottom: 140, left: 10, right: 30 } : { top: 120, bottom: 160, left: 70, right: 90 },
        ),
        state: { selection: { empty: true } },
      },
      getPageStyles: vi.fn(() => ({ pageMargins: {} })),
    };
    await nextTick();
    (options.onSelectionUpdate as (params: { editor: unknown; transaction: unknown }) => void)({
      editor: editorMock,
      transaction: { selection: { $from: { pos: 1 }, $to: { pos: 6 } } },
    });
    await nextTick();
    const setupState = wrapper.vm.$.setupState as Record<string, unknown>;
    (setupState.toolsMenuPosition as Record<string, string>).top = '12px';
    (setupState.toolsMenuPosition as Record<string, string>).right = '0px';
    (setupState.selectionPosition as { value: unknown }).value = {
      left: 10,
      right: 40,
      top: 20,
      bottom: 60,
      source: 'super-editor',
    };
    await nextTick();

    const handleToolClick = setupState.handleToolClick as (tool: string) => void;
    handleToolClick('comments');
    expect(commentsStoreStub.showAddComment).toHaveBeenCalledWith(superdocStub);

    handleToolClick('ai');
    const aiMockResult = useAiMock.mock.results.at(-1)?.value as Record<string, unknown>;
    expect(aiMockResult?.handleAiToolClick).toHaveBeenCalled();

    (commentsStoreStub.pendingComment as { value: unknown }).value = {
      commentId: 'new',
      selection: { getValues: () => ({}) },
    };
    await nextTick();
    const toggleArg = (superdocStub.broadcastSidebarToggle as ReturnType<typeof vi.fn>).mock.calls.at(-1)[0];
    expect(toggleArg).toEqual(expect.objectContaining({ commentId: 'new' }));
    expect(wrapper.findComponent(CommentDialogStub).exists()).toBe(true);

    (superdocStoreStub.isReady as { value: boolean }).value = true;
    await nextTick();
    (commentsStoreStub.getFloatingComments as { value: unknown[] }).value = [{ id: 'f1' }];
    await nextTick();
    await nextTick();
    expect((commentsStoreStub.hasInitializedLocations as { value: boolean }).value).toBe(true);
  });

  it('hides comment interactions when comments module is disabled', async () => {
    const superdocStub = createSuperdocStub();
    (superdocStub.config as Record<string, unknown>).modules = { comments: false };

    const wrapper = await mountComponent(superdocStub);
    await nextTick();

    (superdocStoreStub.modules as Record<string, unknown>).comments = false;
    await nextTick();

    expect(wrapper.find('.superdoc__selection-layer').exists()).toBe(false);

    const options = wrapper.findComponent(SuperEditorStub).props('options') as Record<string, unknown>;
    const editorMock: Record<string, unknown> = {
      options: { documentId: 'doc-1' },
      commands: { togglePagination: vi.fn() },
      view: {
        coordsAtPos: vi.fn(() => ({ top: 100, bottom: 140, left: 10, right: 30 })),
        state: { selection: { empty: true } },
      },
      getPageStyles: vi.fn(() => ({ pageMargins: {} })),
    };

    (options.onSelectionUpdate as (params: { editor: unknown; transaction: unknown }) => void)({
      editor: editorMock,
      transaction: { selection: { $from: { pos: 1 }, $to: { pos: 4 } } },
    });
    await nextTick();

    expect((superdocStoreStub.activeSelection as { value: unknown }).value).toBeNull();
    expect(wrapper.find('.superdoc__tools').exists()).toBe(false);
  });

  it('shows floating comments after imported threads and positions load', async () => {
    const superdocStub = createSuperdocStub();
    const wrapper = await mountComponent(superdocStub);
    await nextTick();

    const options = wrapper.findComponent(SuperEditorStub).props('options') as Record<string, unknown>;
    (commentsStoreStub.handleEditorLocationsUpdate as ReturnType<typeof vi.fn>).mockImplementation(
      (positions: Record<string, unknown>) => {
        (commentsStoreStub.getFloatingComments as { value: unknown[] }).value = Object.values(positions);
      },
    );
    const importedComment = {
      commentId: null,
      importedId: 'import-1',
      documentId: 'doc-1',
      commentText: '<p>Imported</p>',
      createdTime: Date.now(),
    };

    (options.onCommentsUpdate as (params: { type: string; comment: unknown }) => void)({
      type: 'add',
      comment: importedComment,
    });
    await nextTick();

    const { schema, doc } = createImportedCommentDoc('import-1');
    const { view, editor, pluginView } = createCommentsPluginEnvironment({ schema, doc });
    expect(pluginView).toBeDefined();

    (view.coordsAtPos as ReturnType<typeof vi.fn>).mockReturnValue({ top: 20, bottom: 40, left: 10, right: 30 });
    (editor.emit as ReturnType<typeof vi.fn>) = vi.fn(
      (event: string, payload: { allCommentPositions: unknown; allCommentIds?: string[] }) => {
        if (event === 'comment-positions') {
          (
            options.onCommentLocationsUpdate as (params: {
              allCommentPositions: unknown;
              allCommentIds: string[];
            }) => void
          )({
            allCommentPositions: payload.allCommentPositions,
            allCommentIds: Object.keys(payload.allCommentPositions as Record<string, unknown>),
          });
        }
      },
    );

    const forceTr = (view.state as { tr: { setMeta: (key: unknown, value: unknown) => unknown } }).tr.setMeta(
      CommentsPluginKey,
      { type: 'force' },
    );
    (view.dispatch as ReturnType<typeof vi.fn>)(forceTr);
    (pluginView as { update: (view: unknown) => void }).update(view);

    expect(editor.emit).toHaveBeenCalledWith(
      'comment-positions',
      expect.objectContaining({
        allCommentPositions: expect.objectContaining({
          'import-1': expect.objectContaining({
            bounds: expect.objectContaining({ top: 20, left: 10 }),
          }),
        }),
      }),
    );
    expect(commentsStoreStub.handleEditorLocationsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        'import-1': expect.objectContaining({ threadId: 'import-1' }),
      }),
      expect.arrayContaining(['import-1']),
    );

    await nextTick();
    (superdocStoreStub.isReady as { value: boolean }).value = true;
    await nextTick();

    expect((wrapper.vm as { showCommentsSidebar: boolean }).showCommentsSidebar).toBe(true);
    expect(wrapper.find('.floating-comments').exists()).toBe(true);
  });

  // Note: The handlePresentationEditorReady test was removed because that function
  // no longer exists. PresentationEditor now registers itself automatically in the
  // constructor and manages zoom/layout data internally.
});
