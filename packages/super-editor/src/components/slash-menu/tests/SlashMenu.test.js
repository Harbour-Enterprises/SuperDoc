import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import SlashMenu from '../SlashMenu.vue';
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

vi.mock('../../cursor-helpers.js', () => ({
  moveCursorToMouseEvent: vi.fn(),
}));

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
          allowedTriggers: ['slash', 'click'],
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

    it('should handle multiple sections with dividers', async () => {
      mockGetItems.mockReturnValue([
        {
          id: 'section1',
          items: [{ id: 'item1', label: 'Item 1', allowedTriggers: ['slash'] }],
        },
        {
          id: 'section2',
          items: [{ id: 'item2', label: 'Item 2', allowedTriggers: ['slash'] }],
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
          { id: 'insert-table', label: 'Insert Table', allowedTriggers: ['slash'] },
          { id: 'insert-image', label: 'Insert Image', allowedTriggers: ['slash'] },
          { id: 'insert-link', label: 'Insert Link', allowedTriggers: ['slash'] },
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
          { id: 'item1', label: 'Item 1', allowedTriggers: ['slash'], action: vi.fn() },
          { id: 'item2', label: 'Item 2', allowedTriggers: ['slash'], action: vi.fn() },
          { id: 'item3', label: 'Item 3', allowedTriggers: ['slash'], action: vi.fn() },
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
          items: [{ id: 'test-item', label: 'Test Item', allowedTriggers: ['slash'], action: mockAction }],
        },
      ]);

      const wrapper = mount(SlashMenu, { props: mockProps });

      const onSlashMenuOpen = mockEditor.on.mock.calls.find((call) => call[0] === 'slashMenu:open')[1];
      await onSlashMenuOpen({ menuPosition: { left: '100px', top: '200px' } });
      await nextTick();

      const searchInput = wrapper.find('.slash-menu-hidden-input');
      await searchInput.trigger('keydown', { key: 'Enter' });

      expect(mockAction).toHaveBeenCalledWith(mockEditor);
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
              allowedTriggers: ['slash'],
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
              allowedTriggers: ['slash'],
            },
          ],
        },
      ]);

      const wrapper = mount(SlashMenu, { props: mockProps });

      const onSlashMenuOpen = mockEditor.on.mock.calls.find((call) => call[0] === 'slashMenu:open')[1];

      expect(async () => {
        await onSlashMenuOpen({ menuPosition: { left: '100px', top: '200px' } });
        await nextTick();
        await nextTick();
      }).not.toThrow();
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
              allowedTriggers: ['slash'],
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
          items: [{ id: 'test-item', label: 'Test Item', allowedTriggers: ['slash'], action: mockAction }],
        },
      ]);

      const wrapper = mount(SlashMenu, { props: mockProps });

      const onSlashMenuOpen = mockEditor.on.mock.calls.find((call) => call[0] === 'slashMenu:open')[1];
      await onSlashMenuOpen({ menuPosition: { left: '100px', top: '200px' } });
      await nextTick();

      await wrapper.find('.slash-menu-item').trigger('click');

      expect(mockAction).toHaveBeenCalledWith(mockEditor);
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
              allowedTriggers: ['slash'],
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
