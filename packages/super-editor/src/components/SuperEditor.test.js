import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const messageApi = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
}));

const adjustPaginationBreaksMock = vi.hoisted(() => vi.fn());
const onMarginClickCursorChangeMock = vi.hoisted(() => vi.fn());
const checkNodeSpecificClicksMock = vi.hoisted(() => vi.fn());
const getFileObjectMock = vi.hoisted(() =>
  vi.fn(async () => new Blob([], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })),
);
const getStarterExtensionsMock = vi.hoisted(() => vi.fn(() => [{ name: 'core' }, { name: 'pagination' }]));

const EditorConstructor = vi.hoisted(() => {
  const constructor = vi.fn((options) => {
    const instance = {
      options,
      listeners: {},
      on: vi.fn((event, handler) => {
        instance.listeners[event] = handler;
      }),
      off: vi.fn(),
      view: { focus: vi.fn() },
      destroy: vi.fn(),
    };

    return instance;
  });

  constructor.loadXmlData = vi.fn();

  return constructor;
});

vi.mock('naive-ui', () => ({
  NSkeleton: { name: 'NSkeleton', render: () => null },
  useMessage: () => messageApi,
}));

vi.mock('./pagination-helpers.js', () => ({
  adjustPaginationBreaks: adjustPaginationBreaksMock,
}));

vi.mock('./cursor-helpers.js', () => ({
  onMarginClickCursorChange: onMarginClickCursorChangeMock,
  checkNodeSpecificClicks: checkNodeSpecificClicksMock,
}));

vi.mock('./slash-menu/SlashMenu.vue', () => ({
  default: { name: 'SlashMenu', render: () => null },
}));

vi.mock('./rulers/Ruler.vue', () => ({
  default: { name: 'Ruler', render: () => null },
}));

vi.mock('./popovers/GenericPopover.vue', () => ({
  default: { name: 'GenericPopover', render: () => null },
}));

vi.mock('./toolbar/LinkInput.vue', () => ({
  default: { name: 'LinkInput', render: () => null },
}));

vi.mock('@harbour-enterprises/common', () => ({
  getFileObject: getFileObjectMock,
}));

vi.mock(
  '@harbour-enterprises/common/data/blank.docx?url',
  () => ({
    default: 'blank-docx-url',
  }),
  { virtual: true },
);

vi.mock('@extensions/index.js', () => ({
  getStarterExtensions: getStarterExtensionsMock,
}));

vi.mock('@/index.js', () => ({
  Editor: EditorConstructor,
}));

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

import SuperEditor from './SuperEditor.vue';

const getEditorInstance = () => EditorConstructor.mock.results.at(-1)?.value;
let consoleDebugSpy;

describe('SuperEditor.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    consoleDebugSpy?.mockRestore();
    vi.clearAllMocks();
  });

  it('initializes an editor from a provided file source and filters pagination extension', async () => {
    vi.useFakeTimers();

    EditorConstructor.loadXmlData.mockResolvedValueOnce([
      '<docx />',
      { media: true },
      { files: true },
      { fonts: true },
    ]);

    const onException = vi.fn();
    const fileSource = new Blob([], { type: DOCX_MIME });
    const wrapper = mount(SuperEditor, {
      props: {
        documentId: 'doc-1',
        fileSource,
        options: { pagination: false, externalExtensions: [], onException },
      },
    });

    await flushPromises();

    expect(EditorConstructor.loadXmlData).toHaveBeenCalledWith(fileSource);
    expect(EditorConstructor).toHaveBeenCalledTimes(1);

    const options = EditorConstructor.mock.calls[0][0];
    expect(options.content).toBe('<docx />');
    expect(options.media).toEqual({ media: true });
    expect(options.mediaFiles).toEqual({ files: true });
    expect(options.fonts).toEqual({ fonts: true });
    expect(options.extensions.map((ext) => ext.name)).toEqual(['core']);

    const instance = getEditorInstance();
    expect(instance.on).toHaveBeenCalledWith('paginationUpdate', expect.any(Function));
    expect(instance.on).toHaveBeenCalledWith('collaborationReady', expect.any(Function));

    instance.listeners.paginationUpdate();
    expect(adjustPaginationBreaksMock).toHaveBeenCalled();

    instance.listeners.collaborationReady();
    vi.runAllTimers();
    await flushPromises();

    expect(wrapper.vm.editorReady).toBe(true);

    wrapper.unmount();
  });

  it('initializes when collaboration provider syncs remote docx data', async () => {
    const metaMap = {
      get: vi.fn(() => '<remote />'),
    };
    const ydoc = {
      getMap: vi.fn(() => metaMap),
    };

    const provider = {
      listeners: {},
      on: vi.fn((event, handler) => {
        provider.listeners[event] = handler;
      }),
      off: vi.fn(),
    };

    const wrapper = mount(SuperEditor, {
      props: {
        documentId: 'doc-2',
        options: {
          ydoc,
          collaborationProvider: provider,
          pagination: true,
        },
      },
    });

    await flushPromises();

    expect(provider.on).toHaveBeenCalledWith('synced', expect.any(Function));

    const syncedHandler = provider.on.mock.calls.find(([event]) => event === 'synced')[1];
    syncedHandler();

    await flushPromises();

    expect(ydoc.getMap).toHaveBeenCalledWith('meta');
    expect(EditorConstructor).toHaveBeenCalledTimes(1);
    expect(EditorConstructor.loadXmlData).not.toHaveBeenCalled();

    const options = EditorConstructor.mock.calls[0][0];
    expect(options.content).toBe('<remote />');
    expect(provider.off).toHaveBeenCalledWith('synced', syncedHandler);

    wrapper.unmount();
  });

  it('falls back to a blank document when file load fails', async () => {
    const error = new Error('bad file');

    EditorConstructor.loadXmlData.mockRejectedValueOnce(error).mockResolvedValueOnce(['<blank />', {}, {}, {}]);

    const onException = vi.fn();
    const fileSource = new Blob([], { type: DOCX_MIME });

    const wrapper = mount(SuperEditor, {
      props: {
        fileSource,
        options: { pagination: true, onException },
      },
    });

    await flushPromises();
    await flushPromises();

    expect(onException).toHaveBeenCalledWith({ error, editor: null });
    expect(messageApi.error).toHaveBeenCalledWith(
      'Unable to load the file. Please verify the .docx is valid and not password protected.',
    );
    expect(getFileObjectMock).toHaveBeenCalledWith('blank-docx-url', 'blank.docx', DOCX_MIME);
    expect(EditorConstructor.loadXmlData).toHaveBeenCalledTimes(2);
    expect(EditorConstructor).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });
});
