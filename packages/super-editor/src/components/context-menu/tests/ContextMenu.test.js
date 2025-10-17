import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ContextMenu from '../ContextMenu.vue';

vi.mock('@/extensions/context-menu', () => ({
  ContextMenuPluginKey: {
    getState: vi.fn(() => ({ anchorPos: 100 })),
  },
}));

vi.mock('../../slash-menu/utils.js', () => ({
  getPropsByItemId: vi.fn(() => ({ editor: {} })),
  getEditorContext: vi.fn().mockResolvedValue({ selectedText: '', hasSelection: false, trigger: 'slash' }),
}));

vi.mock('../../slash-menu/menuItems.js', () => ({
  getItems: vi.fn(() => [ { id: 'test', items: [{ id: 'item', label: 'Item', showWhen: () => true }] } ]),
}));

vi.mock('../../cursor-helpers.js', () => ({
  moveCursorToMouseEvent: vi.fn(),
}));

describe('ContextMenu.vue', () => {
  it('mounts and renders items', async () => {
    const editor = {
      isEditable: true,
      on: vi.fn(),
      off: vi.fn(),
      view: {
        state: { selection: { from: 1, constructor: { near: vi.fn(() => ({ from: 1, to: 1 })) } } },
        dom: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
        dispatch: vi.fn(),
      },
    };

    const wrapper = mount(ContextMenu, {
      props: {
        editor,
        openPopover: vi.fn(),
        closePopover: vi.fn(),
      },
    });

    const onOpen = editor.on.mock.calls.find((c) => c[0] === 'slashMenu:open')[1];
    await onOpen({ menuPosition: { left: '1px', top: '2px' } });

    expect(wrapper.find('.context-menu').exists()).toBe(true);
    expect(wrapper.findAll('.context-menu-item').length).toBeGreaterThan(0);
  });
});
