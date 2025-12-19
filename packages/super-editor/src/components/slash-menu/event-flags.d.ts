/**
 * Type augmentation for MouseEvent to include custom event flags used by the SlashMenu component.
 */

declare global {
  interface MouseEvent {
    /**
     * Flag indicating that this context menu event has been handled by the SlashMenu component.
     * When true, the event should not be forwarded by other handlers like PresentationInputBridge.
     */
    __sdHandledBySlashMenu?: boolean;
  }
}

export {};
