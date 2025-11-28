import { ref, reactive, toRaw, type Ref } from 'vue';

/**
 * Bounds of a text selection within a document page
 */
export interface SelectionBounds {
  /** Top position in pixels */
  top?: number;
  /** Left position in pixels */
  left?: number;
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
}

/**
 * Parameters for initializing the selection composable
 */
export interface UseSelectionParams {
  /** Unique identifier for the document */
  documentId: string;
  /** Page number (1-indexed) */
  page: number;
  /** Optional selection bounds on the page */
  selectionBounds?: SelectionBounds;
  /** Optional source identifier for the selection */
  source?: string;
}

/**
 * Container location relative to parent element
 */
export interface ContainerLocation {
  /** Top offset in pixels */
  top: number;
  /** Left offset in pixels */
  left: number;
}

/**
 * Return type of the useSelection composable
 */
export interface UseSelectionReturn {
  /** Reactive reference to document ID */
  documentId: Ref<string>;
  /** Reactive reference to page number */
  page: Ref<number>;
  /** Reactive selection bounds */
  selectionBounds: SelectionBounds;
  /** Reactive reference to source identifier */
  source: Ref<string | undefined>;
  /** Get all current values as plain objects */
  getValues: () => {
    documentId: string;
    page: number;
    selectionBounds: SelectionBounds;
    source: string | undefined;
  };
  /** Get the container element ID for the current page */
  getContainerId: () => string;
  /** Get the container's position relative to a parent element */
  getContainerLocation: (parentContainer?: HTMLElement | null) => ContainerLocation;
}

/**
 * Vue composable for managing document text selection state
 *
 * This composable provides reactive state management for tracking text selections
 * within a document viewer, including the selected bounds, page number, and helper
 * methods for calculating container positions.
 *
 * @param params - Selection initialization parameters
 * @returns Selection state and utility methods
 *
 * @example
 * const selection = useSelection({
 *   documentId: 'doc-123',
 *   page: 1,
 *   selectionBounds: { top: 100, left: 50, width: 200, height: 20 }
 * });
 *
 * const containerId = selection.getContainerId(); // 'doc-123-page-1'
 */
export default function useSelection(params: UseSelectionParams): UseSelectionReturn {
  const documentId = ref(params.documentId);
  const page = ref(params.page);
  const selectionBounds = reactive(params.selectionBounds || {});
  const source = ref(params.source);

  /**
   * Get the DOM element ID for the current page container
   *
   * @returns Element ID in the format '{documentId}-page-{pageNumber}'
   */
  const getContainerId = (): string => `${documentId.value}-page-${page.value}`;

  /**
   * Get the location of the page container relative to a parent element
   *
   * Calculates the offset position of the current page container relative to
   * a parent container element. Useful for positioning overlays or annotations.
   *
   * @param parentContainer - Parent element to calculate relative position from
   * @returns Top and left offsets in pixels, rounded to 3 decimal places
   */
  const getContainerLocation = (parentContainer?: HTMLElement | null): ContainerLocation => {
    if (!parentContainer) return { top: 0, left: 0 };
    const parentBounds = parentContainer.getBoundingClientRect();
    const container = document.getElementById(getContainerId());

    let containerBounds = {
      top: 0,
      left: 0,
    };
    if (container) containerBounds = container.getBoundingClientRect();

    return {
      top: Number((containerBounds.top - parentBounds.top).toFixed(3)),
      left: Number((containerBounds.left - parentBounds.left).toFixed(3)),
    };
  };

  /**
   * Get all selection values as plain objects (non-reactive)
   *
   * @returns Plain object containing all current selection state values
   */
  const getValues = () => {
    return {
      documentId: documentId.value,
      page: page.value,
      selectionBounds: toRaw(selectionBounds),
      source: source.value,
    };
  };

  return {
    documentId,
    page,
    selectionBounds,
    source,

    // Actions
    getValues,
    getContainerId,
    getContainerLocation,
  };
}
