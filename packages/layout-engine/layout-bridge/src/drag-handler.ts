/**
 * Drag and drop handler for field annotations in the layout engine.
 *
 * This module provides drag-and-drop functionality for field annotation elements
 * rendered by the DOM painter. It mirrors the behavior of super-editor's
 * FieldAnnotationPlugin but for the layout engine's rendered DOM.
 *
 * @module drag-handler
 */

import { clickToPositionDom } from './dom-mapping.js';

/**
 * Data structure for field annotation drag operations.
 * This matches the format used by super-editor's FieldAnnotationPlugin.
 */
export interface FieldAnnotationDragData {
  /** Unique identifier for the field */
  fieldId?: string;
  /** Type of field (e.g., 'TEXTINPUT', 'CHECKBOX') */
  fieldType?: string;
  /** Variant of the field annotation (e.g., 'text', 'image', 'signature') */
  variant?: string;
  /** Display label shown in the annotation */
  displayLabel?: string;
  /** ProseMirror start position */
  pmStart?: number;
  /** ProseMirror end position */
  pmEnd?: number;
  /** Source element dataset attributes */
  attributes?: Record<string, string>;
}

/**
 * Event emitted when a drag operation starts on a field annotation.
 */
export interface DragStartEvent {
  /** The original DOM drag event */
  event: DragEvent;
  /** The field annotation element being dragged */
  element: HTMLElement;
  /** Extracted field annotation data */
  data: FieldAnnotationDragData;
}

/**
 * Event emitted when a field annotation is dropped.
 */
export interface DropEvent {
  /** The original DOM drop event */
  event: DragEvent;
  /** The field annotation data from the drag operation */
  data: FieldAnnotationDragData;
  /** ProseMirror position where the drop occurred, or null if outside valid area */
  pmPosition: number | null;
  /** Client X coordinate of the drop */
  clientX: number;
  /** Client Y coordinate of the drop */
  clientY: number;
}

/**
 * Event emitted during drag over for visual feedback.
 */
export interface DragOverEvent {
  /** The original DOM dragover event */
  event: DragEvent;
  /** Client X coordinate */
  clientX: number;
  /** Client Y coordinate */
  clientY: number;
  /** Whether the drag contains field annotation data */
  hasFieldAnnotation: boolean;
}

/**
 * Callback type for drag start events.
 */
export type DragStartCallback = (event: DragStartEvent) => void;

/**
 * Callback type for drop events.
 */
export type DropCallback = (event: DropEvent) => void;

/**
 * Callback type for drag over events.
 */
export type DragOverCallback = (event: DragOverEvent) => void;

/**
 * Callback type for drag end events.
 */
export type DragEndCallback = (event: DragEvent) => void;

/**
 * Configuration options for the DragHandler.
 */
export interface DragHandlerConfig {
  /** Callback fired when drag starts on a field annotation */
  onDragStart?: DragStartCallback;
  /** Callback fired when a field annotation is dropped */
  onDrop?: DropCallback;
  /** Callback fired during drag over for visual feedback */
  onDragOver?: DragOverCallback;
  /** Callback fired when drag ends (regardless of drop success) */
  onDragEnd?: DragEndCallback;
  /** MIME type for field annotation data in dataTransfer (default: 'application/x-field-annotation') */
  mimeType?: string;
}

/** Default MIME type for field annotation drag data */
const DEFAULT_MIME_TYPE = 'application/x-field-annotation';

/** Legacy MIME type for compatibility with super-editor */
const LEGACY_MIME_TYPE = 'fieldAnnotation';

/**
 * Safely parses an integer from a string, returning undefined if invalid.
 *
 * @param value - The string value to parse
 * @returns Parsed integer or undefined if parsing fails or input is undefined
 */
function parseIntSafe(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Extracts field annotation data from a draggable element's dataset.
 *
 * @param element - The DOM element with data attributes
 * @returns Extracted field annotation data
 */
function extractFieldAnnotationData(element: HTMLElement): FieldAnnotationDragData {
  const dataset = element.dataset;

  // Safely convert DOMStringMap to Record<string, string>
  const attributes: Record<string, string> = {};
  for (const key in dataset) {
    const value = dataset[key];
    if (value !== undefined) {
      attributes[key] = value;
    }
  }

  return {
    fieldId: dataset.fieldId,
    fieldType: dataset.fieldType,
    variant: dataset.variant ?? dataset.type,
    displayLabel: dataset.displayLabel,
    pmStart: parseIntSafe(dataset.pmStart),
    pmEnd: parseIntSafe(dataset.pmEnd),
    attributes,
  };
}

/**
 * Handles drag and drop operations for field annotations in the layout engine.
 *
 * This class sets up event listeners on a container element to handle:
 * - dragstart: Captures field annotation data and sets drag image
 * - dragover: Provides visual feedback during drag operations
 * - drop: Maps drop coordinates to ProseMirror positions
 * - dragend: Cleans up drag state
 *
 * @example
 * ```typescript
 * const container = document.querySelector('.superdoc-layout');
 * const handler = new DragHandler(container, {
 *   onDragStart: (e) => console.log('Drag started:', e.data),
 *   onDrop: (e) => {
 *     if (e.pmPosition !== null) {
 *       editor.commands.addFieldAnnotation(e.pmPosition, e.data.attributes);
 *     }
 *   },
 * });
 *
 * // Later, when cleaning up:
 * handler.destroy();
 * ```
 */
export class DragHandler {
  private container: HTMLElement;
  private config: DragHandlerConfig;
  private mimeType: string;
  private boundHandlers: {
    dragstart: (e: DragEvent) => void;
    dragover: (e: DragEvent) => void;
    drop: (e: DragEvent) => void;
    dragend: (e: DragEvent) => void;
    dragleave: (e: DragEvent) => void;
  };
  private windowDragoverHandler: (e: DragEvent) => void;
  private windowDropHandler: (e: DragEvent) => void;

  /**
   * Creates a new DragHandler instance.
   *
   * @param container - The DOM container element (typically .superdoc-layout)
   * @param config - Configuration options and callbacks
   */
  constructor(container: HTMLElement, config: DragHandlerConfig = {}) {
    this.container = container;
    this.config = config;
    this.mimeType = config.mimeType ?? DEFAULT_MIME_TYPE;

    // Bind handlers to preserve 'this' context
    this.boundHandlers = {
      dragstart: this.handleDragStart.bind(this),
      dragover: this.handleDragOver.bind(this),
      drop: this.handleDrop.bind(this),
      dragend: this.handleDragEnd.bind(this),
      dragleave: this.handleDragLeave.bind(this),
    };

    // Window-level handlers for overlay support
    this.windowDragoverHandler = this.handleWindowDragOver.bind(this);
    this.windowDropHandler = this.handleWindowDrop.bind(this);

    this.attachListeners();
  }

  /**
   * Attaches event listeners to the container and window.
   */
  private attachListeners(): void {
    // Container-level listeners
    this.container.addEventListener('dragstart', this.boundHandlers.dragstart);
    this.container.addEventListener('dragover', this.boundHandlers.dragover);
    this.container.addEventListener('drop', this.boundHandlers.drop);
    this.container.addEventListener('dragend', this.boundHandlers.dragend);
    this.container.addEventListener('dragleave', this.boundHandlers.dragleave);

    // Window-level listeners to handle drops on overlays (selection highlights, etc.)
    // Without these, drops on UI elements outside the container fail because
    // those elements don't have dragover preventDefault() called.
    window.addEventListener('dragover', this.windowDragoverHandler, false);
    window.addEventListener('drop', this.windowDropHandler, false);
  }

  /**
   * Removes event listeners from the container and window.
   */
  private removeListeners(): void {
    this.container.removeEventListener('dragstart', this.boundHandlers.dragstart);
    this.container.removeEventListener('dragover', this.boundHandlers.dragover);
    this.container.removeEventListener('drop', this.boundHandlers.drop);
    this.container.removeEventListener('dragend', this.boundHandlers.dragend);
    this.container.removeEventListener('dragleave', this.boundHandlers.dragleave);

    window.removeEventListener('dragover', this.windowDragoverHandler, false);
    window.removeEventListener('drop', this.windowDropHandler, false);
  }

  /**
   * Handles dragover at window level to allow drops on overlay elements.
   * This ensures preventDefault is called even when dragging over selection
   * highlights or other UI elements that sit on top of the layout content.
   */
  private handleWindowDragOver(event: DragEvent): void {
    if (this.hasFieldAnnotationData(event)) {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }

      // Emit dragover event for cursor updates when over overlays outside the container.
      // If target is inside container, the container handler will emit the event.
      const target = event.target as HTMLElement;
      if (!this.container.contains(target)) {
        this.config.onDragOver?.({
          event,
          clientX: event.clientX,
          clientY: event.clientY,
          hasFieldAnnotation: true,
        });
      }
    }
  }

  /**
   * Handles drop at window level to catch drops on overlay elements.
   * If the drop target is outside the container, we process it here.
   */
  private handleWindowDrop(event: DragEvent): void {
    if (this.hasFieldAnnotationData(event)) {
      const target = event.target as HTMLElement;
      if (!this.container.contains(target)) {
        // Drop landed on an overlay outside the container - process it
        this.handleDrop(event);
      }
    }
  }

  /**
   * Handles the dragstart event.
   * Sets up dataTransfer with field annotation data and drag image.
   */
  private handleDragStart(event: DragEvent): void {
    const target = event.target as HTMLElement;

    // Check if the target is a draggable field annotation
    if (!target?.dataset?.draggable || target.dataset.draggable !== 'true') {
      return;
    }

    // Extract field annotation data from element
    const data = extractFieldAnnotationData(target);

    // Set drag data in multiple formats for compatibility
    if (event.dataTransfer) {
      const jsonData = JSON.stringify({
        attributes: data.attributes,
        sourceField: data,
      });

      // Set in our MIME type
      event.dataTransfer.setData(this.mimeType, jsonData);

      // Also set in legacy format for super-editor compatibility
      event.dataTransfer.setData(LEGACY_MIME_TYPE, jsonData);

      // Set plain text fallback
      event.dataTransfer.setData('text/plain', data.displayLabel ?? 'Field Annotation');

      // Set the drag image to the annotation element
      event.dataTransfer.setDragImage(target, 0, 0);

      // Set the effect to move (can be overridden by consumers)
      event.dataTransfer.effectAllowed = 'move';
    }

    // Emit drag start event
    this.config.onDragStart?.({
      event,
      element: target,
      data,
    });
  }

  /**
   * Handles the dragover event.
   * Provides visual feedback and determines if drop is allowed.
   */
  private handleDragOver(event: DragEvent): void {
    const hasFieldAnnotation = this.hasFieldAnnotationData(event);

    if (hasFieldAnnotation) {
      // Prevent default to allow drop
      event.preventDefault();

      // Set drop effect
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }

      // Add visual indicator to container
      this.container.classList.add('drag-over');
    }

    // Emit drag over event
    this.config.onDragOver?.({
      event,
      clientX: event.clientX,
      clientY: event.clientY,
      hasFieldAnnotation,
    });
  }

  /**
   * Handles the dragleave event.
   * Removes visual feedback when drag leaves the container.
   */
  private handleDragLeave(event: DragEvent): void {
    // Only remove the class if we're leaving the container itself
    // (not just moving between child elements)
    const relatedTarget = event.relatedTarget as Node | null;
    if (!relatedTarget || !this.container.contains(relatedTarget)) {
      this.container.classList.remove('drag-over');
    }
  }

  /**
   * Handles the drop event.
   * Maps drop coordinates to ProseMirror position and emits drop event.
   */
  private handleDrop(event: DragEvent): void {
    // Remove visual feedback
    this.container.classList.remove('drag-over');

    // Check if this drop contains field annotation data
    if (!this.hasFieldAnnotationData(event)) {
      return;
    }

    // Prevent default browser handling
    event.preventDefault();

    // Extract field annotation data from dataTransfer
    const data = this.extractDragData(event);

    if (!data) {
      return;
    }

    // Map drop coordinates to ProseMirror position using DOM mapping
    const pmPosition = clickToPositionDom(this.container, event.clientX, event.clientY);

    // Emit drop event
    this.config.onDrop?.({
      event,
      data,
      pmPosition,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }

  /**
   * Handles the dragend event.
   * Cleans up drag state.
   */
  private handleDragEnd(event: DragEvent): void {
    // Remove visual feedback
    this.container.classList.remove('drag-over');

    // Emit drag end event
    this.config.onDragEnd?.(event);
  }

  /**
   * Checks if a drag event contains field annotation data.
   */
  private hasFieldAnnotationData(event: DragEvent): boolean {
    if (!event.dataTransfer) {
      return false;
    }

    const types = event.dataTransfer.types;
    return types.includes(this.mimeType) || types.includes(LEGACY_MIME_TYPE);
  }

  /**
   * Extracts field annotation data from a drag event's dataTransfer.
   */
  private extractDragData(event: DragEvent): FieldAnnotationDragData | null {
    if (!event.dataTransfer) {
      return null;
    }

    // Try our MIME type first, then legacy
    let jsonData = event.dataTransfer.getData(this.mimeType);
    if (!jsonData) {
      jsonData = event.dataTransfer.getData(LEGACY_MIME_TYPE);
    }

    if (!jsonData) {
      return null;
    }

    try {
      const parsed = JSON.parse(jsonData);
      // Handle both { attributes, sourceField } format and direct data format
      return parsed.sourceField ?? parsed.attributes ?? parsed;
    } catch {
      return null;
    }
  }

  /**
   * Updates the configuration options.
   *
   * @param config - New configuration options to merge
   */
  updateConfig(config: Partial<DragHandlerConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.mimeType) {
      this.mimeType = config.mimeType;
    }
  }

  /**
   * Destroys the drag handler and removes all event listeners.
   * Call this when the layout engine is unmounted or the container is removed.
   */
  destroy(): void {
    this.removeListeners();
    this.container.classList.remove('drag-over');
  }
}

/**
 * Creates a simple drag handler that just emits events without managing state.
 * Useful for integrating with existing event systems.
 *
 * @param container - The DOM container element
 * @param config - Configuration options and callbacks
 * @returns A cleanup function to remove event listeners
 *
 * @example
 * ```typescript
 * const cleanup = createDragHandler(container, {
 *   onDrop: (e) => editor.emit('fieldAnnotationDropped', e),
 * });
 *
 * // Later, when cleaning up:
 * cleanup();
 * ```
 */
export function createDragHandler(container: HTMLElement, config: DragHandlerConfig = {}): () => void {
  const handler = new DragHandler(container, config);
  return () => handler.destroy();
}
