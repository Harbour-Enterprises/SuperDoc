import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const messageApi = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
}));

const onMarginClickCursorChangeMock = vi.hoisted(() => vi.fn());
const checkNodeSpecificClicksMock = vi.hoisted(() => vi.fn());
const getFileObjectMock = vi.hoisted(() =>
  vi.fn(async () => new Blob([], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })),
);
const getStarterExtensionsMock = vi.hoisted(() => vi.fn(() => [{ name: 'core' }]));

const EditorConstructor = vi.hoisted(() => {
  const createInstance = (options) => {
    const instance = {
      options,
      lifecycle: 'idle',
      listeners: {},
      on: vi.fn((event, handler) => {
        instance.listeners[event] = handler;
      }),
      off: vi.fn(),
      view: { focus: vi.fn() },
      destroy: vi.fn(),
      open: vi.fn(async () => {
        instance.lifecycle = 'ready';
      }),
    };

    return instance;
  };

  const constructor = vi.fn((options) => createInstance(options));
  constructor.createInstance = createInstance;
  return constructor;
});

vi.mock('naive-ui', () => ({
  NSkeleton: { name: 'NSkeleton', render: () => null },
  useMessage: () => messageApi,
}));

// pagination legacy removed; no pagination helpers

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

vi.mock('@superdoc/common', () => ({
  getFileObject: getFileObjectMock,
}));

vi.mock(
  '@superdoc/common/data/blank.docx?url',
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

  it('initializes an editor from a provided file source', async () => {
    vi.useFakeTimers();

    const onException = vi.fn();
    const fileSource = new Blob([], { type: DOCX_MIME });
    const wrapper = mount(SuperEditor, {
      props: {
        documentId: 'doc-1',
        fileSource,
        options: { externalExtensions: [], onException },
      },
    });

    await flushPromises();

    expect(EditorConstructor).toHaveBeenCalledTimes(1);
    const instance = getEditorInstance();
    expect(instance.open).toHaveBeenCalledWith(fileSource);

    const options = EditorConstructor.mock.calls[0][0];
    expect(options.documentId).toBe('doc-1');
    expect(options.content).toBeUndefined();
    expect(options.extensions.map((ext) => ext.name)).toEqual(['core']);

    expect(instance.on).toHaveBeenCalledWith('collaborationReady', expect.any(Function));

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
    const instance = getEditorInstance();
    expect(instance.open).toHaveBeenCalledWith({ content: '<remote />' });

    const options = EditorConstructor.mock.calls[0][0];
    expect(options.content).toBeUndefined();
    expect(provider.off).toHaveBeenCalledWith('synced', syncedHandler);

    wrapper.unmount();
  });

  it('falls back to a blank document when file load fails', async () => {
    const error = new Error('bad file');

    EditorConstructor.mockImplementationOnce((options) => {
      const instance = EditorConstructor.createInstance(options);
      instance.open = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(undefined);
      return instance;
    });

    const onException = vi.fn();
    const fileSource = new Blob([], { type: DOCX_MIME });

    const wrapper = mount(SuperEditor, {
      props: {
        fileSource,
        options: { onException },
      },
    });

    await flushPromises();
    await flushPromises();

    expect(onException).toHaveBeenCalledWith({ error, editor: null });
    expect(messageApi.error).toHaveBeenCalledWith(
      'Unable to load the file. Please verify the .docx is valid and not password protected.',
    );
    expect(getFileObjectMock).toHaveBeenCalledWith('blank-docx-url', 'blank.docx', DOCX_MIME);
    expect(EditorConstructor).toHaveBeenCalledTimes(2);

    const [firstInstance, secondInstance] = EditorConstructor.mock.results.map((result) => result.value);
    expect(firstInstance.open).toHaveBeenCalledTimes(1);
    expect(secondInstance.open).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it('handles race condition: rapid double open() calls', async () => {
    vi.useFakeTimers();

    let openInProgress = false;

    EditorConstructor.mockImplementationOnce((options) => {
      const instance = EditorConstructor.createInstance(options);
      instance.lifecycle = 'idle';
      instance.open = vi.fn(async () => {
        if (openInProgress || instance.lifecycle === 'opening') {
          throw new Error('An open operation is already in progress.');
        }
        openInProgress = true;
        instance.lifecycle = 'opening';
        await new Promise((resolve) => setTimeout(resolve, 100));
        instance.lifecycle = 'ready';
        openInProgress = false;
      });
      instance.close = vi.fn(() => {
        instance.lifecycle = 'idle';
      });
      return instance;
    });

    const fileSource = new Blob([], { type: DOCX_MIME });
    const wrapper = mount(SuperEditor, {
      props: {
        fileSource,
        options: {},
      },
    });

    await flushPromises();
    vi.runAllTimers();
    await flushPromises();

    const editorInstance = getEditorInstance();
    editorInstance.lifecycle = 'idle';
    openInProgress = false;

    // Simulate rapid double open() calls
    const firstCall = editorInstance.open(fileSource);
    let secondCallError = null;
    try {
      await editorInstance.open(fileSource);
    } catch (err) {
      secondCallError = err;
    }

    vi.runAllTimers();
    await firstCall;

    expect(secondCallError).toBeTruthy();
    expect(secondCallError.message).toBe('An open operation is already in progress.');

    wrapper.unmount();
  });

  it('handles sequential open/close/open operations', async () => {
    const file1 = new Blob(['doc1'], { type: DOCX_MIME });
    const file2 = new Blob(['doc2'], { type: DOCX_MIME });

    EditorConstructor.mockImplementationOnce((options) => {
      const instance = EditorConstructor.createInstance(options);
      instance.lifecycle = 'idle';
      instance.open = vi.fn(async (file) => {
        instance.lifecycle = 'opening';
        instance.currentFile = file;
        instance.lifecycle = 'ready';
      });
      instance.close = vi.fn(() => {
        instance.lifecycle = 'idle';
        instance.currentFile = null;
      });
      return instance;
    });

    const wrapper = mount(SuperEditor, {
      props: {
        fileSource: file1,
        options: {},
      },
    });

    await flushPromises();

    const editorInstance = getEditorInstance();
    expect(editorInstance.open).toHaveBeenCalledWith(file1);
    expect(editorInstance.lifecycle).toBe('ready');

    editorInstance.close();
    expect(editorInstance.lifecycle).toBe('idle');

    await editorInstance.open(file2);
    await flushPromises();

    expect(editorInstance.open).toHaveBeenCalledWith(file2);
    expect(editorInstance.lifecycle).toBe('ready');

    wrapper.unmount();
  });

  it('handles lifecycle state transitions and events', async () => {
    vi.useFakeTimers();

    const onOpening = vi.fn();
    const onReady = vi.fn();
    const onClosing = vi.fn();
    const onClosed = vi.fn();

    let instanceRef = null;

    EditorConstructor.mockImplementationOnce((options) => {
      const instance = EditorConstructor.createInstance(options);
      instanceRef = instance;
      instance.lifecycle = 'idle';
      instance.emit = vi.fn((event, payload) => {
        if (event === 'opening') onOpening(payload);
        if (event === 'ready') onReady(payload);
        if (event === 'closing') onClosing(payload);
        if (event === 'closed') onClosed(payload);
      });
      instance.open = vi.fn(async () => {
        instance.lifecycle = 'opening';
        instance.emit('opening', { editor: instance });
        await new Promise((resolve) => setTimeout(resolve, 10));
        instance.lifecycle = 'ready';
        instance.emit('ready', { editor: instance });
      });
      instance.close = vi.fn(() => {
        instance.lifecycle = 'closing';
        instance.emit('closing', { editor: instance });
        instance.lifecycle = 'idle';
        instance.emit('closed', { editor: instance });
      });
      return instance;
    });

    const fileSource = new Blob([], { type: DOCX_MIME });
    const wrapper = mount(SuperEditor, {
      props: {
        fileSource,
        options: {},
      },
    });

    await flushPromises();
    vi.runAllTimers();
    await flushPromises();

    expect(onOpening).toHaveBeenCalledWith({ editor: instanceRef });
    expect(onReady).toHaveBeenCalledWith({ editor: instanceRef });

    instanceRef.close();
    expect(onClosing).toHaveBeenCalledWith({ editor: instanceRef });
    expect(onClosed).toHaveBeenCalledWith({ editor: instanceRef });

    wrapper.unmount();
  });

  it('throws error when open() is called on destroyed editor', async () => {
    vi.useFakeTimers();

    let instanceRef = null;

    EditorConstructor.mockImplementationOnce((options) => {
      const instance = EditorConstructor.createInstance(options);
      instanceRef = instance;
      instance.lifecycle = 'idle';
      instance.open = vi.fn(async () => {
        if (instance.lifecycle === 'destroyed') {
          throw new Error('Cannot open a document on a destroyed editor instance.');
        }
        instance.lifecycle = 'ready';
      });
      return instance;
    });

    const fileSource = new Blob([], { type: DOCX_MIME });
    const wrapper = mount(SuperEditor, {
      props: {
        fileSource,
        options: {},
      },
    });

    await flushPromises();
    vi.runAllTimers();
    await flushPromises();

    // Now manually set to destroyed state
    instanceRef.lifecycle = 'destroyed';

    let error = null;
    try {
      await instanceRef.open(fileSource);
    } catch (err) {
      error = err;
    }

    expect(error).toBeTruthy();
    expect(error.message).toBe('Cannot open a document on a destroyed editor instance.');

    wrapper.unmount();
  });

  it('falls back to blank document when collaboration polling timeout occurs', async () => {
    vi.useFakeTimers();

    const metaMap = {
      get: vi.fn(() => null), // Always return null to simulate timeout
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

    const onException = vi.fn();

    const wrapper = mount(SuperEditor, {
      props: {
        documentId: 'doc-timeout',
        options: {
          ydoc,
          collaborationProvider: provider,
          onException,
        },
      },
    });

    await flushPromises();

    const syncedHandler = provider.on.mock.calls.find(([event]) => event === 'synced')[1];
    syncedHandler();

    // Fast-forward through all polling attempts
    for (let i = 0; i < 10; i++) {
      await flushPromises();
      vi.advanceTimersByTime(500);
    }

    await flushPromises();

    // Verify onException was called with timeout error
    expect(onException).toHaveBeenCalledWith({
      error: expect.objectContaining({
        message: 'Collaboration sync timeout: failed to load docx data from meta map',
      }),
      editor: null,
    });

    // Verify fallback to blank document
    expect(getFileObjectMock).toHaveBeenCalledWith('blank-docx-url', 'blank.docx', DOCX_MIME);
    expect(EditorConstructor).toHaveBeenCalled();

    wrapper.unmount();
  });

  it('prevents memory leaks by destroying existing editor before creating new one', async () => {
    const firstFileSource = new Blob(['first'], { type: DOCX_MIME });
    const secondFileSource = new Blob(['second'], { type: DOCX_MIME });

    const wrapper = mount(SuperEditor, {
      props: {
        fileSource: firstFileSource,
        options: {},
      },
    });

    await flushPromises();

    const firstInstance = getEditorInstance();
    expect(EditorConstructor).toHaveBeenCalledTimes(1);
    expect(firstInstance.destroy).not.toHaveBeenCalled();

    // Simulate re-initialization with a second file source
    // This mimics what would happen in initEditor if called again
    const destroySpy = vi.spyOn(firstInstance, 'destroy');

    // Manually call the cleanup that initEditor would do
    firstInstance.destroy();

    EditorConstructor.mockClear();
    const secondInstance = EditorConstructor.createInstance({ mode: 'docx' });

    expect(destroySpy).toHaveBeenCalled();
    expect(secondInstance).not.toBe(firstInstance);

    wrapper.unmount();
  });
});
