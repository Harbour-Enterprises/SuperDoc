import { Plugin, PluginKey } from 'prosemirror-state';
import { Extension } from '@core/Extension.js';
import { getSurfaceRelativePoint } from '../../core/helpers/editorSurface.js';

/**
 * Configuration options for SlashMenu
 * @typedef {Object} SlashMenuOptions
 * @property {boolean} [disabled] - Disable the slash menu entirely (inherited from editor.options.disableContextMenu)
 * @property {number} [cooldownMs=5000] - Cooldown duration in milliseconds to prevent rapid re-opening
 * @category Options
 */

/**
 * Plugin state structure for SlashMenu
 * @typedef {Object} SlashMenuState
 * @property {boolean} open - Whether the slash menu is currently visible
 * @property {string|null} selected - ID of the currently selected menu item
 * @property {number|null} anchorPos - Document position where the menu was anchored
 * @property {Object|null} menuPosition - CSS positioning {left: string, top: string}
 * @property {string} [menuPosition.left] - Left position in pixels (e.g., "100px")
 * @property {string} [menuPosition.top] - Top position in pixels (e.g., "28px")
 * @property {boolean} disabled - Whether the menu functionality is disabled
 */

/**
 * Transaction metadata for SlashMenu actions
 * @typedef {Object} SlashMenuMeta
 * @property {'open'|'select'|'close'|'updatePosition'} type - Action type
 * @property {number} [pos] - Document position (for 'open' action)
 * @property {number} [clientX] - X coordinate for context menu positioning (for 'open' action)
 * @property {number} [clientY] - Y coordinate for context menu positioning (for 'open' action)
 * @property {string} [id] - Menu item ID (for 'select' action)
 */

export const SlashMenuPluginKey = new PluginKey('slashMenu');

// Menu positioning constants (in pixels)
const MENU_OFFSET_X = 100; // Horizontal offset for slash menu
const MENU_OFFSET_Y = 28; // Vertical offset for slash menu
const CONTEXT_MENU_OFFSET_X = 10; // Small offset for right-click
const CONTEXT_MENU_OFFSET_Y = 10; // Small offset for right-click
const SLASH_COOLDOWN_MS = 5000; // Cooldown period to prevent rapid re-opening

/**
 * @module SlashMenu
 * @sidebarTitle Slash Menu
 * @snippetPath /snippets/extensions/slash-menu.mdx
 *
 * @fires slashMenu:open - Emitted when menu opens, payload: {menuPosition: {left, top}}
 * @fires slashMenu:close - Emitted when menu closes, no payload
 */
export const SlashMenu = Extension.create({
  name: 'slashMenu',

  /**
   * Initialize default options for the SlashMenu extension
   * @returns {SlashMenuOptions} Empty options object (configuration is inherited from editor options)
   */
  addOptions() {
    return {};
  },

  addPmPlugins() {
    const editor = this.editor;
    if (editor.options?.isHeadless) {
      return [];
    }

    // Cooldown flag and timeout for slash menu
    let slashCooldown = false;
    let slashCooldownTimeout = null;

    /**
     * Check if the context menu is disabled via editor options
     * @returns {boolean} True if menu is disabled
     */
    const isMenuDisabled = () => Boolean(editor.options?.disableContextMenu);

    /**
     * Ensures plugin state has the correct shape with all required properties
     * @param {Partial<SlashMenuState>} [value={}] - Partial state to merge with defaults
     * @returns {SlashMenuState} Complete state object with all properties
     */
    const ensureStateShape = (value = {}) => ({
      open: false,
      selected: null,
      anchorPos: null,
      menuPosition: null,
      disabled: isMenuDisabled(),
      ...value,
    });

    const slashMenuPlugin = new Plugin({
      key: SlashMenuPluginKey,

      state: {
        init: () => ensureStateShape(),

        /**
         * Apply transaction to update plugin state
         * Handles state transitions based on transaction metadata:
         * - 'open': Opens menu at specified position or cursor location
         * - 'select': Updates the selected menu item
         * - 'close': Closes the menu and clears anchor position
         * - 'updatePosition': Triggers menu position recalculation (no-op in apply)
         *
         * @param {import('prosemirror-state').Transaction} tr - The transaction
         * @param {SlashMenuState} value - Previous plugin state
         * @returns {SlashMenuState} New plugin state
         */
        apply(tr, value) {
          const meta = tr.getMeta(SlashMenuPluginKey);
          const disabled = isMenuDisabled();

          if (disabled) {
            if (value.open) {
              editor.emit('slashMenu:close');
            }
            return ensureStateShape({ disabled: true });
          }

          if (!meta) {
            if (value.disabled !== disabled) {
              return ensureStateShape({ ...value, disabled });
            }
            return value;
          }

          switch (meta.type) {
            case 'open': {
              // Validate position
              if (typeof meta.pos !== 'number' || meta.pos < 0 || meta.pos > tr.doc.content.size) {
                console.warn('SlashMenu: Invalid position', meta.pos);
                return ensureStateShape(value);
              }

              // For position: fixed menu, use viewport coordinates directly
              let left = 0;
              let top = 0;
              let isContextMenu = false;

              if (typeof meta.clientX === 'number' && typeof meta.clientY === 'number') {
                left = meta.clientX;
                top = meta.clientY;
                isContextMenu = true; // Right-click triggered
              } else {
                // Fallback to selection-based positioning (slash menu)
                const relativePoint = getSurfaceRelativePoint(editor, meta);
                if (relativePoint) {
                  // Need to convert surface-relative to viewport coordinates
                  const surface = editor.presentationEditor?.element ?? editor.view?.dom ?? editor.options?.element;
                  if (surface) {
                    try {
                      const rect = surface.getBoundingClientRect();
                      left = rect.left + relativePoint.left;
                      top = rect.top + relativePoint.top;
                    } catch (error) {
                      console.warn('SlashMenu: Failed to get surface bounds', error);
                      return ensureStateShape(value); // Return unchanged state on error
                    }
                  }
                }
              }

              // Use smaller offsets for context menu, larger for slash menu
              const offsetX = isContextMenu ? CONTEXT_MENU_OFFSET_X : MENU_OFFSET_X;
              const offsetY = isContextMenu ? CONTEXT_MENU_OFFSET_Y : MENU_OFFSET_Y;

              const menuPosition = {
                left: `${left + offsetX}px`,
                top: `${top + offsetY}px`,
              };

              // Update state
              const newState = {
                ...value,
                open: true,
                anchorPos: meta.pos,
                menuPosition,
              };

              // Emit event after state update
              editor.emit('slashMenu:open', { menuPosition });

              return ensureStateShape(newState);
            }

            case 'select': {
              return ensureStateShape({ ...value, selected: meta.id });
            }

            case 'close': {
              editor.emit('slashMenu:close');
              return ensureStateShape({ ...value, open: false, anchorPos: null });
            }

            default:
              return ensureStateShape({ ...value, disabled });
          }
        },
      },

      /**
       * Create view plugin to handle window event listeners
       * @param {import('prosemirror-view').EditorView} editorView - The ProseMirror editor view
       * @returns {Object} View plugin with destroy method
       */
      view(editorView) {
        /**
         * Update menu position when window scrolls or resizes
         * Dispatches an 'updatePosition' meta action if menu is open
         */
        const updatePosition = () => {
          if (isMenuDisabled()) return;
          const state = SlashMenuPluginKey.getState(editorView.state);
          if (state.open) {
            editorView.dispatch(
              editorView.state.tr.setMeta(SlashMenuPluginKey, {
                type: 'updatePosition',
              }),
            );
          }
        };

        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return {
          destroy() {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
            // Clear cooldown timeout if exists
            if (slashCooldownTimeout) {
              clearTimeout(slashCooldownTimeout);
              slashCooldownTimeout = null;
            }
          },
        };
      },

      props: {
        /**
         * Handle keyboard events to open/close the slash menu
         * - '/': Opens menu at cursor if conditions are met (in paragraph, after space/start)
         * - 'Escape' or 'ArrowLeft': Closes menu and restores cursor position
         *
         * @param {import('prosemirror-view').EditorView} view - The ProseMirror editor view
         * @param {KeyboardEvent} event - The keyboard event
         * @returns {boolean} True if the event was handled, false otherwise
         */
        handleKeyDown(view, event) {
          if (isMenuDisabled()) {
            return false;
          }
          const pluginState = this.getState(view.state);

          // If cooldown is active and slash is pressed, allow default behavior
          if (event.key === '/' && slashCooldown) {
            return false; // Let browser handle it
          }

          if (event.key === '/' && !pluginState.open) {
            const { selection } = view.state;
            const $cursor =
              'empty' in selection && selection.empty ? (selection as Record<string, unknown>).$cursor : null;
            if (!$cursor) return false;

            const isParagraph = $cursor.parent.type.name === 'paragraph';
            if (!isParagraph) return false;

            const textBefore = $cursor.parent.textContent.slice(0, $cursor.parentOffset);
            const isEmptyOrAfterSpace = !textBefore || textBefore.endsWith(' ');
            if (!isEmptyOrAfterSpace) return false;

            event.preventDefault();

            // Set cooldown
            slashCooldown = true;
            if (slashCooldownTimeout) clearTimeout(slashCooldownTimeout);
            slashCooldownTimeout = setTimeout(() => {
              slashCooldown = false;
              slashCooldownTimeout = null;
            }, SLASH_COOLDOWN_MS);

            // Only dispatch state update - event will be emitted in apply()
            view.dispatch(
              view.state.tr.setMeta(SlashMenuPluginKey, {
                type: 'open',
                pos: $cursor.pos,
              }),
            );
            return true;
          }

          if (pluginState.open && (event.key === 'Escape' || event.key === 'ArrowLeft')) {
            // Store current state before closing
            const { anchorPos } = pluginState;

            // Close menu
            view.dispatch(
              view.state.tr.setMeta(SlashMenuPluginKey, {
                type: 'close',
              }),
            );

            // Restore cursor position and focus
            if (anchorPos !== null) {
              const Selection = view.state.selection.constructor as Record<string, unknown>;
              const tr = view.state.tr.setSelection(Selection.near(view.state.doc.resolve(anchorPos)));
              view.dispatch(tr);
              view.focus();
            }
            return true;
          }

          return false;
        },
      },
    });

    return [slashMenuPlugin];
  },
});
