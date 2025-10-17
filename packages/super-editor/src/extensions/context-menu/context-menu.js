// New context-menu extension that aliases the existing slash-menu implementation
// while providing forward-compatible exports. Backward-compatible names are still exported.

import { SlashMenu, SlashMenuPluginKey } from '../slash-menu/slash-menu.js';

/**
 * Configuration options for ContextMenu
 * @typedef {SlashMenuOptions} ContextMenuOptions
 */

/**
 * Re-export old typedef for backward compatibility.
 * @typedef {import('../slash-menu/slash-menu.js').SlashMenuOptions} SlashMenuOptions
 * @deprecated Use ContextMenuOptions instead.
 */

/**
 * ContextMenu extension (alias of SlashMenu)
 */
export const ContextMenu = SlashMenu;

/**
 * ContextMenu PluginKey (alias of SlashMenuPluginKey)
 */
export const ContextMenuPluginKey = SlashMenuPluginKey;

/**
 * Backward-compatibility exports
 * @deprecated Use ContextMenu instead.
 */
export { SlashMenu };

/**
 * Backward-compatibility exports
 * @deprecated Use ContextMenuPluginKey instead.
 */
export { SlashMenuPluginKey };
