/**
 * Event flag constants used for cross-component communication.
 * These flags are attached to DOM events to coordinate behavior between different parts of the editor.
 */

/**
 * Flag name used to mark context menu events that have been handled by the SlashMenu component.
 * When this flag is set on a MouseEvent, it indicates that the SlashMenu has already processed
 * the right-click and the event should not be forwarded by PresentationInputBridge.
 *
 * @constant {string}
 */
export const SLASH_MENU_HANDLED_FLAG = '__sdHandledBySlashMenu';
