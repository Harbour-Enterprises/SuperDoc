import { describe, expect, it } from 'vitest';
import { initTestEditor } from '@tests/helpers/helpers.js';
import { SlashMenu, SlashMenuPluginKey } from './slash-menu.js';

describe('SlashMenu extension', () => {
  it('registers the plugin key', () => {
    expect(SlashMenuPluginKey.key.startsWith('slashMenu')).toBe(true);
  });

  it('skips plugin creation when disabled or headless', () => {
    const disabledContextMenu = SlashMenu.config.addPmPlugins.call({
      editor: { options: { disableContextMenu: true } },
    });
    expect(disabledContextMenu).toEqual([]);

    const headless = SlashMenu.config.addPmPlugins.call({ editor: { options: { isHeadless: true } } });
    expect(headless).toEqual([]);
  });

  it('creates a plugin when enabled', () => {
    const { editor } = initTestEditor({
      mode: 'text',
      content: '<p></p>',
      isHeadless: false,
      disableContextMenu: false,
    });
    const plugins = SlashMenu.config.addPmPlugins.call({ editor });
    expect(plugins).toHaveLength(1);
    expect(typeof plugins[0].props.handleKeyDown).toBe('function');
    editor.destroy();
  });
});
