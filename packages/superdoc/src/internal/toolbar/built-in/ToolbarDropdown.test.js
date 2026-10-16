import { afterEach, expect, it } from 'vite-plus/test';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import ToolbarDropdown from './ToolbarDropdown.vue';
let wrapper;
afterEach(() => {
  wrapper?.unmount();
  document.body.replaceChildren();
});
it('carries the toolbar owner into teleported palette content', async () => {
  wrapper = mount(ToolbarDropdown, {
    props: { show: true, options: [{ key: 'red', label: 'Red' }] },
    attachTo: document.body,
    global: { provide: { sdToolbarOwnerId: 'palette-editor-owner' } },
  });
  await nextTick();
  const menu = document.querySelector('.toolbar-dropdown-menu');
  expect(menu?.dataset.superdocUiOwner).toBe('palette-editor-owner');
  expect(menu?.textContent).toContain('Red');
});
