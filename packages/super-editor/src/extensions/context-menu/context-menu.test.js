import { describe, it, expect } from 'vitest';
import { ContextMenu, ContextMenuPluginKey, SlashMenu, SlashMenuPluginKey } from './context-menu.js';

describe('ContextMenu extension (alias of SlashMenu)', () => {
  it('exports a plugin key with slashMenu namespace for compatibility', () => {
    expect(ContextMenuPluginKey.key.startsWith('slashMenu')).toBe(true);
  });

  it('aliases the SlashMenu extension', () => {
    // Both symbols should reference the same object/function
    expect(ContextMenu).toBe(SlashMenu);
    expect(ContextMenuPluginKey).toBe(SlashMenuPluginKey);
  });
});
