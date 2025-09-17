import { expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * Test helper utilities for slash menu components
 * Extracts shared patterns from utils.test.js, SlashMenu.test.js, and menuItems.test.js
 */

/**
 * Creates a mock ProseMirror selection object with configurable properties
 */
export function createMockSelection(options = {}) {
  const defaults = {
    from: 10,
    to: 15,
    empty: false,
    marks: [],
  };

  const config = { ...defaults, ...options };

  return {
    from: config.from,
    to: config.to,
    empty: config.empty,
    $head: {
      marks: vi.fn(() => config.marks.map((mark) => ({ type: { name: mark } }))),
    },
    $from: {
      depth: 2,
      node: vi.fn(() => ({ type: { name: 'paragraph' } })),
    },
    $to: {
      depth: 2,
      node: vi.fn(() => ({ type: { name: 'paragraph' } })),
    },
    constructor: {
      near: vi.fn(() => ({ from: config.from, to: config.from })),
    },
  };
}

/**
 * Creates a mock ProseMirror state object with configurable properties
 */
export function createMockState(options = {}) {
  const defaults = {
    selectedText: 'selected text',
    nodeType: 'paragraph',
    undoDepth: 2,
    redoDepth: 1,
    marks: ['bold', 'italic', 'trackedInsert', 'trackedDelete'],
    storedMarks: null,
  };

  const config = { ...defaults, ...options };
  const mockSelection = createMockSelection(options.selection || {});

  return {
    selection: mockSelection,
    doc: {
      textBetween: vi.fn(() => config.selectedText),
      nodeAt: vi.fn(() => ({ type: { name: config.nodeType } })),
      resolve: vi.fn(() => ({})),
    },
    schema: {
      marks: config.marks.reduce((acc, mark) => {
        acc[mark] = { name: mark };
        return acc;
      }, {}),
      nodes: {
        paragraph: { name: 'paragraph' },
        table: { name: 'table' },
        bulletList: { name: 'bulletList' },
        documentSection: { name: 'documentSection' },
      },
    },
    storedMarks: config.storedMarks,
    history: {
      undoDepth: config.undoDepth,
      redoDepth: config.redoDepth,
    },
    tr: {
      setMeta: vi.fn(function () {
        return this;
      }),
      setSelection: vi.fn(function () {
        return this;
      }),
    },
  };
}

/**
 * Creates a mock ProseMirror view object with configurable properties
 */
export function createMockView(options = {}) {
  const mockState = createMockState(options.state || {});

  return {
    state: mockState,
    coordsAtPos: vi.fn(() => ({ left: 100, top: 200 })),
    posAtCoords: vi.fn(() => ({ pos: 12 })),
    dispatch: vi.fn(),
    focus: vi.fn(),
    dom: {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  };
}

/**
 * Creates a mock editor object with configurable options
 */
export function createMockEditor(options = {}) {
  const defaults = {
    documentMode: 'editing',
    isEditable: true,
    isAiEnabled: false,
    slashMenuConfig: null,
    aiApiKey: null,
    aiEndpoint: null,
  };

  const config = { ...defaults, ...options };
  const mockView = createMockView(options.view || {});

  return {
    view: mockView,
    options: {
      documentMode: config.documentMode,
      isAiEnabled: config.isAiEnabled,
      slashMenuConfig: config.slashMenuConfig,
      aiApiKey: config.aiApiKey,
      aiEndpoint: config.aiEndpoint,
    },
    isEditable: config.isEditable,
    commands: options.commands || {},
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };
}

/**
 * Creates a mock editor context object for slash menu utilities
 */
export function createMockContext(options = {}) {
  const defaults = {
    selectedText: '',
    hasSelection: false,
    trigger: 'slash',
    clipboardContent: {
      html: null,
      text: null,
      hasContent: false,
    },
    selectionStart: 10,
    selectionEnd: 10,
    isInTable: false,
    isInList: false,
    isInSectionNode: false,
    currentNodeType: 'paragraph',
    activeMarks: [],
    isTrackedChange: false,
    documentMode: 'editing',
    canUndo: false,
    canRedo: false,
    isEditable: true,
  };

  const config = { ...defaults, ...options };
  const mockEditor = options.editor || createMockEditor();

  return {
    ...config,
    editor: mockEditor,
    cursorPosition: { x: 100, y: 200 },
    pos: config.selectionStart,
    node: { type: { name: config.currentNodeType } },
    event: options.event || undefined,
  };
}

/**
 * Sets up common mocks and returns cleanup functions
 * Returns an object with mock functions and a cleanup function
 */
export function setupCommonMocks() {
  // Mock functions that are commonly used
  const mockReadFromClipboard = vi.fn();
  const mockSelectionHasNodeOrMark = vi.fn(() => false);
  const mockMoveCursorToMouseEvent = vi.fn();
  const mockHandleClipboardPaste = vi.fn(() => true);

  // Setup document event listener spies
  const docAddEventListener = vi.spyOn(document, 'addEventListener');
  const docRemoveEventListener = vi.spyOn(document, 'removeEventListener');

  const cleanup = () => {
    vi.clearAllMocks();
    docAddEventListener.mockRestore();
    docRemoveEventListener.mockRestore();
  };

  return {
    mocks: {
      readFromClipboard: mockReadFromClipboard,
      selectionHasNodeOrMark: mockSelectionHasNodeOrMark,
      moveCursorToMouseEvent: mockMoveCursorToMouseEvent,
      handleClipboardPaste: mockHandleClipboardPaste,
    },
    spies: {
      docAddEventListener,
      docRemoveEventListener,
    },
    cleanup,
  };
}

/**
 * Creates a beforeEach setup function with common mock resets
 * Has a callback for any custom setup that needs to be done before each test
 */
export function createBeforeEachSetup(customSetup = () => {}) {
  return () => {
    vi.clearAllMocks();
    customSetup();
  };
}

/**
 * Mounts a Vue component with common props and returns wrapper with helper methods
 */
export function mountSlashMenuComponent(component, options = {}) {
  const defaults = {
    editor: createMockEditor(),
    openPopover: vi.fn(),
    closePopover: vi.fn(),
  };

  const props = { ...defaults, ...options.props };
  const mountOptions = { props, ...options.mountOptions };

  const wrapper = mount(component, mountOptions);

  return {
    wrapper,
    props,

    async openMenu(menuPosition = { left: '100px', top: '200px' }) {
      const onSlashMenuOpen = props.editor.on.mock.calls.find((call) => call[0] === 'slashMenu:open')?.[1];

      if (onSlashMenuOpen) {
        await onSlashMenuOpen({ menuPosition });
        await wrapper.vm.$nextTick();
      }
    },

    async closeMenu() {
      const onSlashMenuClose = props.editor.on.mock.calls.find((call) => call[0] === 'slashMenu:close')?.[1];

      if (onSlashMenuClose) {
        onSlashMenuClose();
        await wrapper.vm.$nextTick();
      }
    },

    async triggerKeydown(key, target = '.slash-menu-hidden-input') {
      const element = wrapper.find(target);
      await element.trigger('keydown', { key });
      await wrapper.vm.$nextTick();
    },
  };
}

/**
 * Filters menu items by various criteria (helper for testing menu item filtering)
 */
export function filterMenuItems(sections, criteria = {}) {
  const { trigger = null, requiresSelection = null, hasClipboard = null, itemIds = null } = criteria;

  let items = sections.flatMap((s) => s.items);

  if (trigger) {
    items = items.filter((item) => item.allowedTriggers?.includes(trigger));
  }

  if (requiresSelection !== null) {
    items = items.filter((item) => !!item.requiresSelection === requiresSelection);
  }

  if (hasClipboard !== null && hasClipboard) {
    items = items.filter((item) => item.id !== 'paste');
  }

  if (itemIds) {
    items = items.filter((item) => itemIds.includes(item.id));
  }

  return items;
}

/**
 * Creates mock menu items for testing
 */
export function createMockMenuItems(count = 3, customItems = []) {
  const defaultItems = Array.from({ length: count }, (_, i) => ({
    id: `test-item-${i + 1}`,
    label: `Test Item ${i + 1}`,
    icon: `<svg>test-icon-${i + 1}</svg>`,
    action: vi.fn(),
    allowedTriggers: ['slash', 'click'],
  }));

  return [
    {
      id: 'test-section',
      items: [...defaultItems, ...customItems],
    },
  ];
}

/**
 * Creates a mock item with custom render function for testing
 */
export function createMockRenderItem(id = 'render-item', renderFn = null) {
  const defaultRender = vi.fn(() => {
    const div = document.createElement('div');
    div.textContent = `Custom content for ${id}`;
    div.className = 'custom-content';
    return div;
  });

  return {
    id,
    label: `Render ${id}`,
    render: renderFn || defaultRender,
    allowedTriggers: ['slash', 'click'],
  };
}

/**
 * Common assertions for editor mock objects
 */
export function assertEditorMockStructure(editor) {
  expect(editor).toHaveProperty('view');
  expect(editor.view).toHaveProperty('state');
  expect(editor.view.state).toHaveProperty('selection');
  expect(editor).toHaveProperty('options');
  expect(editor).toHaveProperty('isEditable');
}

/**
 * Common assertions for menu sections structure
 */
export function assertMenuSectionsStructure(sections) {
  expect(sections).toBeInstanceOf(Array);
  sections.forEach((section) => {
    expect(section).toHaveProperty('id');
    expect(section).toHaveProperty('items');
    expect(section.items).toBeInstanceOf(Array);

    section.items.forEach((item) => {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('allowedTriggers');
      expect(item.allowedTriggers).toBeInstanceOf(Array);
    });
  });
}

/**
 * Asserts that event listeners are properly set up
 */
export function assertEventListenersSetup(editor, documentSpies) {
  const { docAddEventListener } = documentSpies;

  // Check document listeners
  expect(docAddEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  expect(docAddEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));

  // Check editor listeners
  expect(editor.on).toHaveBeenCalledWith('update', expect.any(Function));
  expect(editor.on).toHaveBeenCalledWith('slashMenu:open', expect.any(Function));
  expect(editor.on).toHaveBeenCalledWith('slashMenu:close', expect.any(Function));

  // Check DOM listeners
  expect(editor.view.dom.addEventListener).toHaveBeenCalledWith('contextmenu', expect.any(Function));
}

/**
 * Asserts that event listeners are properly cleaned up
 */
export function assertEventListenersCleanup(editor, documentSpies) {
  const { docRemoveEventListener } = documentSpies;

  // Check document listeners cleanup
  expect(docRemoveEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  expect(docRemoveEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));

  // Check editor listeners cleanup
  expect(editor.off).toHaveBeenCalledWith('slashMenu:open');
  expect(editor.off).toHaveBeenCalledWith('slashMenu:close');
  expect(editor.off).toHaveBeenCalledWith('update', expect.any(Function));

  // Check DOM listeners cleanup
  expect(editor.view.dom.removeEventListener).toHaveBeenCalledWith('contextmenu', expect.any(Function));
}

/**
 * Creates common slash menu configurations for testing
 */
export const SlashMenuConfigs = {
  /**
   * Default configuration with AI enabled
   */
  withAI: {
    includeDefaultItems: true,
    customItems: [],
  },

  /**
   * Configuration with custom items only
   */
  customOnly: {
    includeDefaultItems: false,
    customItems: [
      {
        id: 'custom-section',
        items: [
          {
            id: 'custom-item',
            label: 'Custom Item',
            allowedTriggers: ['slash', 'click'],
            action: vi.fn(),
          },
        ],
      },
    ],
  },

  /**
   * Configuration with menuProvider function
   */
  withProvider: (providerFn) => ({
    includeDefaultItems: true,
    menuProvider:
      providerFn ||
      ((context, defaultSections) => [
        ...defaultSections,
        {
          id: 'provider-section',
          items: [
            {
              id: 'provider-item',
              label: 'Provider Item',
              allowedTriggers: ['slash', 'click'],
              action: vi.fn(),
            },
          ],
        },
      ]),
  }),

  /**
   * Configuration with conditional items
   */
  withConditionalItems: {
    includeDefaultItems: false,
    customItems: [
      {
        id: 'conditional-section',
        items: [
          {
            id: 'always-show',
            label: 'Always Show',
            allowedTriggers: ['slash', 'click'],
            action: vi.fn(),
          },
          {
            id: 'show-when-selection',
            label: 'Show When Selection',
            allowedTriggers: ['slash', 'click'],
            action: vi.fn(),
            showWhen: (context) => context.hasSelection,
          },
        ],
      },
    ],
  },
};
