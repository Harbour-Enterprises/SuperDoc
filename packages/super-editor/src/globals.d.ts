/**
 * Global type declarations for the SuperDoc editor.
 * This file augments the global Window interface with custom properties.
 */

declare global {
  /**
   * Extended Window interface with SuperDoc-specific properties.
   */
  interface Window {
    /**
     * Global drag data storage for field annotation drag-and-drop operations.
     * Used as a workaround for SortableJS which sets drag data after the native
     * dragstart event, making it unavailable via DataTransfer.getData() during
     * dragover/dragend events.
     *
     * This property is set by the drag source (e.g., webapp) and read by the
     * editor during drag operations to retrieve field annotation payload.
     *
     * @remarks
     * - Set during drag initialization (after SortableJS dragstart)
     * - Read during dragover to cache field annotation data
     * - Cleared after drop or drag end to prevent stale data
     */
    __superdocDragData?: string;
  }
}

// This export statement is required to make this file a module and ensure
// the global augmentation is properly applied.
export {};
