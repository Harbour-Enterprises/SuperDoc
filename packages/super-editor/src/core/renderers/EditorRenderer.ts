import type { EditorState, Transaction } from 'prosemirror-state';
import type { EditorView as PmEditorView, EditorViewProps } from 'prosemirror-view';
import type { Editor } from '../Editor.js';
import type { EditorOptions } from '../types/EditorConfig.js';

/**
 * Parameters required to attach a renderer to a DOM element.
 */
export type EditorRendererAttachParams = {
  /** The DOM element to mount the editor into, or null for headless mode */
  element: HTMLElement | null;
  /** The ProseMirror editor state */
  state: EditorState;
  /** Additional ProseMirror editor view properties */
  editorProps?: Record<string, unknown>;
  /** Callback function to handle transaction dispatching */
  dispatchTransaction: (transaction: Transaction) => void;
  /** Optional click handler for the editor view */
  handleClick?: EditorViewProps['handleClick'];
};

/**
 * Interface for editor renderers that manage the lifecycle of the editing surface.
 *
 * Renderers are responsible for:
 * - Creating and destroying the ProseMirror view
 * - Initializing DOM elements and styles
 * - Managing platform-specific behaviors (fonts, mobile styles, etc.)
 * - Handling copy/paste operations
 * - Integrating with developer tools
 *
 * Implementations include:
 * - ProseMirrorRenderer: Standard DOM-based rendering
 * - Custom renderers: For alternative rendering strategies (e.g., canvas, layout engines)
 */
export interface EditorRenderer {
  /**
   * The current ProseMirror view instance, or null if not attached.
   * This is null in headless mode or before attach() is called.
   */
  readonly view: PmEditorView | null;

  /**
   * Attach the renderer to a DOM element and create a ProseMirror view.
   *
   * @param params - Parameters including element, state, and callbacks
   * @returns The created ProseMirror EditorView instance
   * @throws {Error} If the renderer cannot be attached (e.g., missing element in non-headless mode)
   */
  attach(params: EditorRendererAttachParams): PmEditorView;

  /**
   * Destroy the renderer and clean up all resources.
   * This should destroy the ProseMirror view and remove event listeners.
   */
  destroy(): void;

  /**
   * Initialize the container element for the editor.
   * Handles element selection via selector, applies style isolation, and configures headless mode.
   *
   * @param options - Partial editor options containing element/selector configuration
   */
  initContainerElement?(options: Partial<EditorOptions>): void;

  /**
   * Initialize and inject document fonts into the DOM.
   * Generates @font-face CSS from the converter and appends to document head.
   *
   * @param editor - The editor instance containing font data
   */
  initFonts?(editor: Editor): void;

  /**
   * Initialize default styles for the editor container and ProseMirror element.
   * Applies page dimensions, margins, typography, and accessibility attributes.
   *
   * @param editor - The editor instance
   * @param element - Optional container element (defaults to editor.element)
   */
  initDefaultStyles?(editor: Editor, element?: HTMLElement | null): void;

  /**
   * Update styles on the editor container and ProseMirror element.
   * Called when page styles change (e.g., margins, dimensions).
   *
   * @param editor - The editor instance
   * @param element - The container element
   * @param proseMirror - The ProseMirror content element
   */
  updateEditorStyles?(editor: Editor, element: HTMLElement, proseMirror: HTMLElement): void;

  /**
   * Initialize responsive styles for mobile devices.
   * Sets up viewport scaling and orientation change listeners.
   *
   * @param editor - The editor instance
   * @param element - The container element to apply mobile styles to
   */
  initMobileStyles?(editor: Editor, element: HTMLElement | null): void;

  /**
   * Register a copy event handler for transforming copied content.
   * Applies list transformations to ensure proper clipboard format.
   *
   * @param editor - The editor instance
   */
  registerCopyHandler?(editor: Editor): void;

  /**
   * Initialize developer tools integration.
   * Exposes editor and converter instances to window.superdocdev in development mode.
   *
   * @param editor - The editor instance
   */
  initDevTools?(editor: Editor): void;
}
