import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import SlashMenu from '../SlashMenu.vue';
import { TRIGGERS } from '../constants.js';
import {
  createMockEditor,
  setupCommonMocks,
  mountSlashMenuComponent,
  createMockMenuItems,
  createMockRenderItem,
  assertEventListenersSetup,
  assertEventListenersCleanup,
} from './testHelpers.js';

vi.mock('@/extensions/slash-menu', () => ({
  SlashMenuPluginKey: {
    getState: vi.fn(() => ({ anchorPos: 100 })),
  },
}));

vi.mock('../utils.js', () => ({
  getPropsByItemId: vi.fn(() => ({ editor: {} })),
  getEditorContext: vi.fn(),
}));

vi.mock('../menuItems.js', () => ({
  getItems: vi.fn(),
}));

vi.mock('../../cursor-helpers.js', async () => {
  const actual = await vi.importActual('../../cursor-helpers.js');
  return {
    ...actual,
    moveCursorToMouseEvent: vi.fn(),
  };
});

let surfaceElementMock;
vi.mock('../../core/helpers/editorSurface.js', async () => {
  const actual = await vi.importActual('../../core/helpers/editorSurface.js');
  return {
    ...actual,
    getEditorSurfaceElement: vi.fn(() => surfaceElementMock),
  };
});

describe('SlashMenu.vue', () => {
  let mockEditor;
  let mockProps;
  let mockGetItems;
  let mockGetEditorContext;
  let commonMocks;

  beforeEach(async () => {
    commonMocks = setupCommonMocks();

    mockEditor = createMockEditor({
      isEditable: true,
      view: {
        state: {
          selection: {
            from: 10,
            constructor: {
              near: vi.fn(() => ({ from: 10, to: 10 })),
            },
          },
        },
      },
    });
    surfaceElementMock = mockEditor.view.dom;

    mockProps = {
      editor: mockEditor,
      openPopover: vi.fn(),
      closePopover: vi.fn(),
    };

    const { getItems } = await import('../menuItems.js');
    const { getEditorContext } = await import('../utils.js');

    mockGetItems = getItems;
    mockGetEditorContext = getEditorContext;

    mockGetItems.mockReturnValue(
      createMockMenuItems(1, [
        {
          id: 'test-item',
          label: 'Test Item',
          icon: '<svg>test-icon</svg>',
          action: vi.fn(),
          showWhen: (context) => [TRIGGERS.slash, TRIGGERS.click].includes(context.trigger),
        },
      ]),
    );

    mockGetEditorContext.mockResolvedValue({
      selectedText: 'test selection',
      hasSelection: true,
      trigger: 'slash',
    });
  });

  describe('component mounting and lifecycle', () => {
    it('should mount without errors', () => {
      const wrapper = mount(SlashMenu, { props: mockProps });
      expect(wrapper.exists()).toBe(true);
    });

    it('should set up event listeners on mount', () => {
      mount(SlashMenu, { props: mockProps });

      assertEventListenersSetup(mockEditor, commonMocks.spies);
    });

    it('should clean up event listeners on unmount', () => {
      const wrapper = mount(SlashMenu, { props: mockProps });
      wrapper.unmount();

      assertEventListenersCleanup(mockEditor, commonMocks.spies);
    });

    it('attaches contextmenu listener to PresentationEditor host when available', () => {
      const presentationHost = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0 })),
      };
      mockEditor.presentationEditor = { element: presentationHost };
      surfaceElementMock = presentationHost;

      const wrapper = mount(SlashMenu, { props: mockProps });
      expect(presentationHost.addEventListener).toHaveBeenCalledWith('contextmenu', expect.any(Function));
      expect(mockEditor.view.dom.addEventListener).not.toHaveBeenCalledWith('contextmenu', expect.any(Function));

      wrapper.unmount();
      expect(presentationHost.removeEventListener).toHaveBeenCalledWith('contextmenu', expect.any(Function));
    });
  });

  describe('menu visibility and state', () => {
    it('should be hidden by default', () => {
      const wrapper = mount(SlashMenu, { props: mockProps });
      expect(wrapper.find('.slash-menu').exists()).toBe(false);
    });

    it('should show menu when slashMenu:open event is triggered', async () => {
      const wrapper = mount(SlashMenu, { props: mockProps });

      // Simulate the slashMenu:open event
      const onSlashMenuOpen = mockEditor.on.mock.calls.find((call) => call[0] === 'slashMenu:open')[1];
      await onSlashMenuOpen({ menuPosition: { left: '100px', top: '200px' } });

      await nextTick();

      expect(wrapper.find('.slash-menu').exists()).toBe(true);
      expect(wrapper.find('.slash-menu').element.style.left).toBe('100px');
      expect(wrapper.find('.slash-menu').element.style.top).toBe('200px');
    });

    it('should not open menu when editor is read-only', async () => {
      mockEditor.isEditable = false;
      const wrapper = mount(SlashMenu, { props: mockProps });

      const onSlashMenuOpen = mockEditor.on.mock.calls.find((call) => call[0] === 'slashMenu:open')[1];
      await onSlashMenuOpen({ menuPosition: { left: '100px', top: '200px' } });

      await nextTick();

      expect(wrapper.find('.slash-menu').exists()).toBe(false);
    });

    it('should hide menu when slashMenu:close event is triggered', async () => {
      const wrapper = mount(SlashMenu, { props: mockProps });

      // Open menu first
      const onSlashMenuOpen = mockEditor.on.mock.calls.find((call) => call[0] === 'slashMenu:open')[1];
      await onSlashMenuOpen({ menuPosition: { left: '100px', top: '200px' } });
      await nextTick();

      expect(wrapper.find('.slash-menu').exists()).toBe(true);

      // Close menu
      const onSlashMenuClose = mockEditor.on.mock.calls.find((call) => call[0] === 'slashMenu:close')[1];
      onSlashMenuClose();
      await nextTick();

      expect(wrapper.find('.slash-menu').exists()).toBe(false);
    });
  });

  describe('menu items rendering', () => {
    it('should render default menu items', async () => {
      const wrapper = mount(SlashMenu, { props: mockProps });

      const onSlashMenuOpen = mockEditor.on.mock.calls.find((call) => call[0] === 'slashMenu:open')[1];
      await onSlashMenuOpen({ menuPosition: { left: '100px', top: '200px' } });
      await nextTick();

      expect(wrapper.find('.slash-menu-item').exists()).toBe(true);
      expect(wrapper.find('.slash-menu-item').text()).toContain('Test Item');
      expect(wrapper.find('.slash-menu-item-icon').exists()).toBe(true);
    });

    it('should render custom items with render function', async () => {
      const customRenderItem = createMockRenderItem('custom-item');
      customRenderItem.label = 'Custom Item';
      customRenderItem.action = vi.fn();

      mockGetItems.mockReturnValue([
        {
          id: 'custom-section',
          items: [customRenderItem],
        },
      ]);

      const wrapper = mount(SlashMenu, { props: mockProps });

      const onSlashMenuOpen = mockEditor.on.mock.calls.find((call) => call[0] === 'slashMenu:open')[1];
      await onSlashMenuOpen({ menuPosition: { left: '100px', top: '200px' } });
      await nextTick();
      await nextTick();

      expect(wrapper.find('.slash-menu-custom-item').exists()).toBe(true);
    });

    it('should pass right-click context (including event) to custom renderers', async () => {
      const rightClickEvent = new MouseEvent('contextmenu', { clientX: 120, clientY: 160 });

      const contextFromEvent = {
        selectedText: '',
        hasSelection: false,
        event: rightClickEvent,
        pos: 42,
      };

      mockGetEditorContext.mockReset();
      mockGetEditorContext.mockResolvedValue(contextFromEvent);

      const renderSpy = vi.fn(() => {
        const el = document.createElement('div');
        el.textContent = 'custom';
        return el;
      });

      mockGetItems.mockReturnValue([
        {
          id: 'custom-section',
          items: [
            {
              id: 'custom-item',
              label: 'Custom Item',
              render: renderSpy,
              showWhen: (context) => [TRIGGERS.slash, TRIGGERS.click].includes(context.trigger),
            },
          ],
        },
      ]);

      mount(SlashMenu, { props: mockProps });

      const contextMenuHandler = mockEditor.view.dom.addEventListener.mock.calls.find(
        (call) => call[0] === 'contextmenu',
      )[1];

      await contextMenuHandler(rightClickEvent);

      const onSlashMenuOpen = mockEditor.on.mock.calls.find((call) => call[0] === 'slashMenu:open')[1];
      await onSlashMenuOpen({ menuPosition: { left: '100px', top: '200px' } });
      await nextTick();
      await nextTick();

      expect(renderSpy).toHaveBeenCalledWith(expect.objectContaining({ event: rightClickEvent }));
    });

    it('should keep selection when right-click happens inside the active selection', async () => {
      mount(SlashMenu, { props: mockProps });

      const { moveCursorToMouseEvent } = await import('../../cursor-helpers.js');
      moveCursorToMouseEvent.mockClear();

      mockEditor.state.selection.from = 5;
      mockEditor.state.selection.to = 15;
      mockEditor.posAtCoords = vi.fn(() => ({ pos: 10 }));

      const contextMenuHandler = mockEditor.view.dom.addEventListener.mock.calls.find(
        (call) => call[0] === 'contextmenu',
      )[1];

      const rightClickEvent = new MouseEvent('contextmenu', { clientX: 120, clientY: 160 });

      await contextMenuHandler(rightClickEvent);

      expect(moveCursorToMouseEvent).not.toHaveBeenCalled();
    });

    it('should move cursor when right-click happens outside the active selection', async () => {
      mount(SlashMenu, { props: mockProps });

      const { moveCursorToMouseEvent } = await import('../../cursor-helpers.js');
      moveCursorToMouseEvent.mockClear();

      mockEditor.state.selection.from = 5;
      mockEditor.state.selection.to = 15;
      mockEditor.posAtCoords = vi.fn(() => ({ pos: 25 }));

      const contextMenuHandler = mockEditor.view.dom.addEventListener.mock.calls.find(
        (call) => call[0] === 'contextmenu',
      )[1];

      const rightClickEvent = new MouseEvent('contextmenu', { clientX: 120, clientY: 160 });

      await contextMenuHandler(rightClickEvent);

      expect(moveCursorToMouseEvent).toHaveBeenCalledWith(rightClickEvent, mockEditor);
    });

    it('should allow native context menu when modifier is pressed', async () => {
      mount(SlashMenu, { props: mockProps });

      mockGetEditorContext.mockClear();

      const contextMenuHandler = mockEditor.view.dom.addEventListener.mock.calls.find(
        (call) => call[0] === 'contextmenu',
      )[1];

      const event = {
        ctrlKey: true,
        preventDefault: vi.fn(),
        clientX: 50,
        clientY: 60,
        type: 'contextmenu',
        detail: 0,
        button: 2,
      };

      await contextMenuHandler(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(mockGetEditorContext).not.toHaveBeenCalled();
    });

    it('should allow native context menu for keyboard invocation', async () => {
      mount(SlashMenu, { props: mockProps });

      mockGetEditorContext.mockClear();

      const contextMenuHandler = mockEditor.view.dom.addEventListener.mock.calls.find(
        (call) => call[0] === 'contextmenu',
      )[1];

      const keyboardEvent = {
        preventDefault: vi.fn(),
        clientX: 0,
        clientY: 0,
        detail: 0,
        button: 0,
        type: 'contextmenu',
      };

      await contextMenuHandler(keyboardEvent);

      expect(keyboardEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockGetEditorContext).not.toHaveBeenCalled();
    });

    it('should reuse the computed context instead of re-reading clipboard for custom renders', async () => {
      const rightClickEvent = new MouseEvent('contextmenu', { clientX: 200, clientY: 240 });

      mockGetEditorContext.mockReset();
      mockGetEditorContext.mockResolvedValue({
        selectedText: '',
        hasSelection: false,
        event: rightClickEvent,
        pos: 21,
      });

      const renderSpy = vi.fn(() => {
        const el = document.createElement('div');
        el.textContent = 'custom';
        return el;
      });

      mockGetItems.mockReturnValue([
        {
          id: 'custom-section',
          items: [
            {
              id: 'custom-item',
              label: 'Custom Item',
              render: renderSpy,
              showWhen: (context) => [TRIGGERS.slash, TRIGGERS.click].includes(context.trigger),
            },
          ],
        },
      ]);

      mount(SlashMenu, { props: mockProps });

      const contextMenuHandler = mockEditor.view.dom.addEventListener.mock.calls.find(
        (call) => call[0] === 'contextmenu',
      )[1];

      await contextMenuHandler(rightClickEvent);

      const onSlashMenuOpen = mockEditor.on.mock.calls.find((call) => call[0] === 'slashMenu:open')[1];
      await onSlashMenuOpen({ menuPosition: { left: '100px', top: '200px' } });
      await nextTick();
      await nextTick();

      expect(mockGetEditorContext).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple sections with dividers', async () => {
      mockGetItems.mockReturnValue([
        {
          id: 'section1',
          items: [{ id: 'item1', label: 'Item 1', showWhen: (context) => context.trigger === TRIGGERS.slash }],
        },
        {
          id: 'section2',
          items: [{ id: 'item2', label: 'Item 2', showWhen: (context) => context.trigger === TRIGGERS.slash }],
        },
      ]);

      const wrapper = mount(SlashMenu, { props: mockProps });

      const onSlashMenuOpen = mockEditor.on.mock.calls.find((call) => call[0] === 'slashMenu:open')[1];
      await onSlashMenuOpen({ menuPosition: { left: '100px', top: '200px' } });
      await nextTick();

      expect(wrapper.findAll('.slash-menu-item')).toHaveLength(2);
      expect(wrapper.find('.slash-menu-divider').exists()).toBe(true);
    });
  });

  describe('search functionality', () => {
    beforeEach(() => {
      mockGetItems.mockReturnValue(
        createMockMenuItems(0, [
          { id: 'insert-table', label: 'Insert Table', showWhen: (context) => context.trigger === TRIGGERS.slash },
          { id: 'insert-image', label: 'Insert Image', showWhen: (context) => context.trigger === TRIGGERS.slash },
          { id: 'insert-link', label: 'Insert Link', showWhen: (context) => context.trigger === TRIGGERS.slash },
        ]),
      );
    });

    it('should filter items based on search query', async () => {
      const wrapper = mount(SlashMenu, { props: mockProps });

      const onSlashMenuOpen = mockEditor.on.mock.calls.find((call) => call[0] === 'slashMenu:open')[1];
      await onSlashMenuOpen({ menuPosition: { left: '100px', top: '200px' } });
      await nextTick();

      expect(wrapper.findAll('.slash-menu-item')).toHaveLength(3);

      const searchInput = wrapper.find('.slash-menu-hidden-input');
      await searchInput.setValue('table');
      await nextTick();

      expect(wrapper.findAll('.slash-menu-item')).toHaveLength(1);
      expect(wrapper.find('.slash-menu-item').text()).toContain('Insert Table');
    });

    it('should be case insensitive', async () => {
      const wrapper = mount(SlashMenu, { props: mockProps });

      const onSlashMenuOpen = mockEditor.on.mock.calls.find((call) => call[0] === 'slashMenu:open')[1];
      await onSlashMenuOpen({ menuPosition: { left: '100px', top: '200px' } });
      await nextTick();

      const searchInput = wrapper.find('.slash-menu-hidden-input');
      await searchInput.setValue('TABLE');
      await nextTick();

      expect(wrapper.findAll('.slash-menu-item')).toHaveLength(1);
      expect(wrapper.find('.slash-menu-item').text()).toContain('Insert Table');
    });
  });

  describe('keyboard navigation', () => {
    beforeEach(() => {
      mockGetItems.mockReturnValue(
        createMockMenuItems(0, [
          { id: 'item1', label: 'Item 1', showWhen: (context) => context.trigger === TRIGGERS.slash, action: vi.fn() },
          { id: 'item2', label: 'Item 2', showWhen: (context) => context.trigger === TRIGGERS.slash, action: vi.fn() },
          { id: 'item3', label: 'Item 3', showWhen: (context) => context.trigger === TRIGGERS.slash, action: vi.fn() },
        ]),
      );
    });

    it('should select first item by default', async () => {
      const wrapper = mount(SlashMenu, { props: mockProps });

      const onSlashMenuOpen = mockEditor.on.mock.calls.find((call) => call[0] === 'slashMenu:open')[1];
      await onSlashMenuOpen({ menuPosition: { left: '100px', top: '200px' } });
      await nextTick();

      expect(wrapper.find('.slash-menu-item.is-selected').exists()).toBe(true);
    });

    it('should navigate with arrow keys', async () => {
      const wrapper = mount(SlashMenu, { props: mockProps });

      const onSlashMenuOpen = mockEditor.on.mock.calls.find((call) => call[0] === 'slashMenu:open')[1];
      await onSlashMenuOpen({ menuPosition: { left: '100px', top: '200px' } });
      await nextTick();

      const searchInput = wrapper.find('.slash-menu-hidden-input');

      await searchInput.trigger('keydown', { key: 'ArrowDown' });
      await nextTick();

      const selectedItems = wrapper.findAll('.slash-menu-item.is-selected');
      expect(selectedItems).toHaveLength(1);

      await searchInput.trigger('keydown', { key: 'ArrowUp' });
      await nextTick();

      expect(wrapper.findAll('.slash-menu-item.is-selected')).toHaveLength(1);
    });

    it('should execute selected item on Enter', async () => {
      const mockAction = vi.fn();
      mockGetItems.mockReturnValue([
        {
          id: 'test-section',
          items: [
            {
              id: 'test-item',
              label: 'Test Item',
              showWhen: (context) => context.trigger === TRIGGERS.slash,
              action: mockAction,
            },
          ],
        },
      ]);

      const wrapper = mount(SlashMenu, { props: mockProps });

      const onSlashMenuOpen = mockEditor.on.mock.calls.find((call) => call[0] === 'slashMenu:open')[1];
      await onSlashMenuOpen({ menuPosition: { left: '100px', top: '200px' } });
      await nextTick();

      const searchInput = wrapper.find('.slash-menu-hidden-input');
      await searchInput.trigger('keydown', { key: 'Enter' });

      // editor and context
      expect(mockAction).toHaveBeenCalledWith(
        mockEditor,
        expect.objectContaining({
          hasSelection: expect.any(Boolean),
          selectedText: expect.any(String),
          trigger: expect.any(String),
        }),
      );
    });

    it('should close menu on Escape', async () => {
      const wrapper = mount(SlashMenu, { props: mockProps });

      const onSlashMenuOpen = mockEditor.on.mock.calls.find((call) => call[0] === 'slashMenu:open')[1];
      await onSlashMenuOpen({ menuPosition: { left: '100px', top: '200px' } });
      await nextTick();

      expect(wrapper.find('.slash-menu').exists()).toBe(true);

      const searchInput = wrapper.find('.slash-menu-hidden-input');
      await searchInput.trigger('keydown', { key: 'Escape' });
      await nextTick();

      expect(mockEditor.view.dispatch).toHaveBeenCalled();
    });
  });

  describe('custom item rendering', () => {
    it('should call render function with context', async () => {
      const mockRender = vi.fn(() => {
        const div = document.createElement('div');
        div.textContent = 'Custom content';
        return div;
      });

      mockGetItems.mockReturnValue([
        {
          id: 'custom-section',
          items: [
            {
              id: 'custom-item',
              label: 'Custom Item',
              render: mockRender,
              showWhen: (context) => context.trigger === TRIGGERS.slash,
            },
          ],
        },
      ]);

      const wrapper = mount(SlashMenu, { props: mockProps });

      const onSlashMenuOpen = mockEditor.on.mock.calls.find((call) => call[0] === 'slashMenu:open')[1];
      await onSlashMenuOpen({ menuPosition: { left: '100px', top: '200px' } });
      await nextTick();
      await nextTick();

      expect(mockRender).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedText: 'test selection',
          hasSelection: true,
          trigger: 'slash',
        }),
      );
    });

    it('should handle render function errors gracefully', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockRender = vi.fn(() => {
        throw new Error('Render error');
      });

      mockGetItems.mockReturnValue([
        {
          id: 'error-section',
          items: [
            {
              id: 'error-item',
              label: 'Error Item',
              render: mockRender,
              showWhen: (context) => context.trigger === TRIGGERS.slash,
            },
          ],
        },
      ]);

      mount(SlashMenu, { props: mockProps });

      const onSlashMenuOpen = mockEditor.on.mock.calls.find((call) => call[0] === 'slashMenu:open')[1];

      await expect(
        onSlashMenuOpen({ menuPosition: { left: '100px', top: '200px' } }).then(async () => {
          await nextTick();
          await nextTick();
        }),
      ).resolves.not.toThrow();

      await nextTick();
      warnSpy.mockRestore();
    });

    it('should clean up custom items on menu close', async () => {
      const mockRender = vi.fn(() => {
        const div = document.createElement('div');
        div.textContent = 'Custom content';
        return div;
      });

      mockGetItems.mockReturnValue([
        {
          id: 'custom-section',
          items: [
            {
              id: 'custom-item',
              label: 'Custom Item',
              render: mockRender,
              showWhen: (context) => context.trigger === TRIGGERS.slash,
            },
          ],
        },
      ]);

      const wrapper = mount(SlashMenu, { props: mockProps });

      const onSlashMenuOpen = mockEditor.on.mock.calls.find((call) => call[0] === 'slashMenu:open')[1];
      await onSlashMenuOpen({ menuPosition: { left: '100px', top: '200px' } });
      await nextTick();
      await nextTick();

      const onSlashMenuClose = mockEditor.on.mock.calls.find((call) => call[0] === 'slashMenu:close')[1];
      onSlashMenuClose();
      await nextTick();

      expect(wrapper.find('.slash-menu').exists()).toBe(false);
    });
  });

  describe('item execution', () => {
    it('should execute item action on click', async () => {
      const mockAction = vi.fn();
      mockGetItems.mockReturnValue([
        {
          id: 'test-section',
          items: [
            {
              id: 'test-item',
              label: 'Test Item',
              showWhen: (context) => context.trigger === TRIGGERS.slash,
              action: mockAction,
            },
          ],
        },
      ]);

      const wrapper = mount(SlashMenu, { props: mockProps });

      const onSlashMenuOpen = mockEditor.on.mock.calls.find((call) => call[0] === 'slashMenu:open')[1];
      await onSlashMenuOpen({ menuPosition: { left: '100px', top: '200px' } });
      await nextTick();

      await wrapper.find('.slash-menu-item').trigger('click');

      expect(mockAction).toHaveBeenCalledWith(
        mockEditor,
        expect.objectContaining({
          hasSelection: expect.any(Boolean),
          selectedText: expect.any(String),
          trigger: expect.any(String),
        }),
      );
    });

    it('should open popover for component items', async () => {
      const MockComponent = { template: '<div>Mock Component</div>' };
      mockGetItems.mockReturnValue([
        {
          id: 'component-section',
          items: [
            {
              id: 'component-item',
              label: 'Component Item',
              showWhen: (context) => context.trigger === TRIGGERS.slash,
              component: MockComponent,
            },
          ],
        },
      ]);

      const wrapper = mount(SlashMenu, { props: mockProps });

      const onSlashMenuOpen = mockEditor.on.mock.calls.find((call) => call[0] === 'slashMenu:open')[1];
      await onSlashMenuOpen({ menuPosition: { left: '100px', top: '200px' } });
      await nextTick();

      await wrapper.find('.slash-menu-item').trigger('click');

      expect(mockProps.openPopover).toHaveBeenCalledWith(
        expect.any(Object), // markRaw wrapped component
        expect.any(Object), // props
        expect.objectContaining({ left: '100px', top: '200px' }),
      );
    });
  });
});
