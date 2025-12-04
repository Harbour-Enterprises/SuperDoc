/**
 * EditorOverlayManager
 *
 * Manages visual overlays and editor host elements for in-place header/footer editing.
 * Uses a "sibling host" architecture where editor hosts are created as siblings to
 * decoration containers (not children), allowing them to have pointer-events enabled
 * while decorations have pointer-events disabled.
 *
 * Key responsibilities:
 * - Create and position editor host elements as siblings to decoration containers
 * - Toggle visibility between static decoration content and live editors
 * - Manage dimming overlay for body content during editing
 * - Control selection overlay visibility to prevent double caret rendering
 */

// Styling constants - extracted for maintainability and consistency
const EDITOR_HOST_Z_INDEX = '10';
const BORDER_LINE_Z_INDEX = '15';
const BORDER_LINE_COLOR = '#4472c4';
const BORDER_LINE_HEIGHT = '1px';

/**
 * Represents a header or footer region with position and dimension data.
 */
export type HeaderFooterRegion = {
  /** Type of region: header or footer */
  kind: 'header' | 'footer';
  /** Relationship ID of the header/footer content */
  headerId?: string;
  /** Section type/variant (default, first, even, odd) */
  sectionType?: string;
  /** Zero-based page index */
  pageIndex: number;
  /** One-based page number for display */
  pageNumber: number;
  /** X coordinate relative to page */
  localX: number;
  /** Y coordinate relative to page */
  localY: number;
  /** Width of the region in pixels */
  width: number;
  /** Height of the region in pixels */
  height: number;
};

/**
 * Result returned from showEditingOverlay operation.
 */
type ShowOverlayResult = {
  /** Whether the overlay was successfully shown */
  success: boolean;
  /** The editor host element if successful */
  editorHost?: HTMLElement;
  /** Reason for failure if not successful */
  reason?: string;
};

/**
 * Manages visual overlays and editor host elements for in-place header/footer editing.
 *
 * This class implements the sibling host architecture pattern:
 * ```html
 * <div class="superdoc-page">
 *   <div class="superdoc-page-header" style="pointer-events: none">
 *     <!-- static content, hidden during editing -->
 *   </div>
 *   <div class="superdoc-header-editor-host" style="pointer-events: auto">
 *     <!-- PM editor, shown during editing -->
 *   </div>
 *   <!-- body content -->
 *   <div class="superdoc-page-footer" style="pointer-events: none">...</div>
 *   <div class="superdoc-footer-editor-host" style="pointer-events: auto">...</div>
 * </div>
 * ```
 */
export class EditorOverlayManager {
  /** Selection overlay element (for hiding during editing) */
  #selectionOverlay: HTMLElement | null;

  /** Currently active dimming overlay element */
  #dimmingOverlay: HTMLElement | null = null;

  /** Currently active editor host element */
  #activeEditorHost: HTMLElement | null = null;

  /** Currently active static decoration container */
  #activeDecorationContainer: HTMLElement | null = null;

  /** Current editing region */
  #activeRegion: HeaderFooterRegion | null = null;

  /** Callback for when dimming overlay is clicked (to exit edit mode) - reserved for future dimming overlay feature */
  // eslint-disable-next-line no-unused-private-class-members
  #onDimmingClick: (() => void) | null = null;

  /** Full-width border line element (MS Word style) */
  #borderLine: HTMLElement | null = null;

  /**
   * Creates a new EditorOverlayManager instance.
   *
   * @param painterHost - The host element containing painted pages. Must be an HTMLElement connected to the DOM.
   * @param visibleHost - The visible host element for overlay positioning. Must be an HTMLElement connected to the DOM.
   * @param selectionOverlay - The selection overlay element (optional). If provided, must be an HTMLElement.
   *
   * @throws {TypeError} If painterHost is not an HTMLElement
   * @throws {TypeError} If visibleHost is not an HTMLElement
   * @throws {TypeError} If selectionOverlay is provided but is not an HTMLElement
   * @throws {Error} If painterHost is not connected to the DOM
   * @throws {Error} If visibleHost is not connected to the DOM
   */
  constructor(painterHost: HTMLElement, visibleHost: HTMLElement, selectionOverlay: HTMLElement | null = null) {
    // Validate that hosts are HTMLElements
    if (!(painterHost instanceof HTMLElement)) {
      throw new TypeError('painterHost must be an HTMLElement');
    }
    if (!(visibleHost instanceof HTMLElement)) {
      throw new TypeError('visibleHost must be an HTMLElement');
    }
    if (selectionOverlay !== null && !(selectionOverlay instanceof HTMLElement)) {
      throw new TypeError('selectionOverlay must be an HTMLElement or null');
    }

    // Validate that hosts are connected to DOM
    if (!painterHost.isConnected) {
      throw new Error('painterHost must be connected to the DOM');
    }
    if (!visibleHost.isConnected) {
      throw new Error('visibleHost must be connected to the DOM');
    }

    this.#selectionOverlay = selectionOverlay;
  }

  /**
   * Sets the callback to be invoked when the dimming overlay is clicked.
   * This allows PresentationEditor to exit header/footer mode when the user
   * clicks outside the editing region.
   *
   * @param callback - Function to call when dimming overlay is clicked
   */
  setOnDimmingClick(callback: () => void): void {
    this.#onDimmingClick = callback;
  }

  /**
   * Gets the currently active editor host element.
   * This is useful for checking if a click target is inside the active editing area.
   *
   * @returns The active editor host element, or null if not in editing mode
   */
  getActiveEditorHost(): HTMLElement | null {
    return this.#activeEditorHost;
  }

  /**
   * Shows the editing overlay for a header/footer region.
   *
   * This method:
   * 1. Creates or retrieves the editor host element as a sibling to the decoration container
   * 2. Positions the editor host to match the decoration container bounds
   * 3. Hides the static decoration content
   * 4. Shows the dimming overlay over body content
   * 5. Returns the editor host element for mounting the ProseMirror editor
   *
   * @param pageElement - The page DOM element containing the region
   * @param region - The header/footer region to edit
   * @param zoom - Current zoom level (for positioning calculations)
   * @returns Result object with success status and editor host element
   *
   * @example
   * ```typescript
   * const result = overlayManager.showEditingOverlay(pageElement, region, 1.0);
   * if (result.success && result.editorHost) {
   *   // Mount ProseMirror editor in result.editorHost
   * }
   * ```
   */
  showEditingOverlay(pageElement: HTMLElement, region: HeaderFooterRegion, zoom: number): ShowOverlayResult {
    try {
      // Find the decoration container for this region
      const decorationContainer = this.#findDecorationContainer(pageElement, region.kind);
      if (!decorationContainer) {
        return {
          success: false,
          reason: `Decoration container not found for ${region.kind} on page ${region.pageIndex}`,
        };
      }

      // Create or retrieve editor host as sibling to decoration container
      const editorHost = this.#ensureEditorHost(pageElement, region.kind);
      if (!editorHost) {
        return {
          success: false,
          reason: `Failed to create editor host for ${region.kind}`,
        };
      }

      // Position editor host to match decoration container bounds
      this.#positionEditorHost(editorHost, region, decorationContainer, zoom);

      // Hide static decoration content
      decorationContainer.style.visibility = 'hidden';

      // Show editor host
      editorHost.style.visibility = 'visible';
      editorHost.style.zIndex = EDITOR_HOST_Z_INDEX;

      // For footers, adjust the editor container positioning to align content at bottom
      // The editor container has position: absolute; top: 0 by default, which we need to change
      if (region.kind === 'footer') {
        // Get the content offset calculated during positioning
        const contentOffset = editorHost.dataset.contentOffset;
        if (contentOffset) {
          // Find the editor container (first child with super-editor class)
          const editorContainer = editorHost.querySelector('.super-editor');
          if (editorContainer instanceof HTMLElement) {
            // Instead of top: 0, position from the calculated offset
            editorContainer.style.top = `${contentOffset}px`;
          }
        }
      }

      // Create full-width border line across the page (MS Word style)
      this.#showHeaderFooterBorder(pageElement, region, decorationContainer);

      // Store active elements for cleanup
      this.#activeEditorHost = editorHost;
      this.#activeDecorationContainer = decorationContainer;
      this.#activeRegion = region;

      return {
        success: true,
        editorHost,
      };
    } catch (error) {
      // Clean up any partial state on error
      if (this.#activeDecorationContainer) {
        this.#activeDecorationContainer.style.visibility = 'visible';
      }
      if (this.#activeEditorHost) {
        this.#activeEditorHost.style.visibility = 'hidden';
      }
      this.#hideHeaderFooterBorder();

      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[EditorOverlayManager] Failed to show editing overlay:', error);

      return {
        success: false,
        reason: `DOM manipulation error: ${errorMessage}`,
      };
    }
  }

  /**
   * Hides the editing overlay and restores normal view.
   *
   * This method:
   * 1. Shows the static decoration content
   * 2. Hides the editor host (but doesn't destroy it for reuse)
   * 3. Removes the dimming overlay
   *
   * @example
   * ```typescript
   * overlayManager.hideEditingOverlay();
   * // Static decoration is now visible, editor is hidden
   * ```
   */
  hideEditingOverlay(): void {
    // Show static decoration content
    if (this.#activeDecorationContainer) {
      this.#activeDecorationContainer.style.visibility = 'visible';
    }

    // Hide editor host and remove active styling (keep in DOM for reuse)
    if (this.#activeEditorHost) {
      this.#activeEditorHost.style.visibility = 'hidden';
      this.#activeEditorHost.style.zIndex = '';

      // Reset footer editor container positioning if applicable
      if (this.#activeRegion?.kind === 'footer') {
        const editorContainer = this.#activeEditorHost.querySelector('.super-editor');
        if (editorContainer instanceof HTMLElement) {
          editorContainer.style.top = '0';
        }
      }
    }

    // Remove border line
    this.#hideHeaderFooterBorder();

    // Remove dimming overlay (if any)
    this.#hideDimmingOverlay();

    // Clear active references
    this.#activeEditorHost = null;
    this.#activeDecorationContainer = null;
    this.#activeRegion = null;
  }

  /**
   * Hides the layout selection overlay to prevent double caret rendering.
   *
   * Called when entering header/footer editing mode to ensure only the
   * ProseMirror editor's caret is visible, not both the PM caret and the
   * layout engine's selection overlay.
   *
   * @example
   * ```typescript
   * overlayManager.hideSelectionOverlay();
   * // Selection overlay is now hidden
   * ```
   */
  hideSelectionOverlay(): void {
    if (this.#selectionOverlay) {
      this.#selectionOverlay.style.visibility = 'hidden';
    }
  }

  /**
   * Shows the layout selection overlay.
   *
   * Called when exiting header/footer editing mode to restore the
   * normal selection overlay rendering for body content.
   *
   * @example
   * ```typescript
   * overlayManager.showSelectionOverlay();
   * // Selection overlay is now visible
   * ```
   */
  showSelectionOverlay(): void {
    if (this.#selectionOverlay) {
      this.#selectionOverlay.style.visibility = 'visible';
    }
  }

  /**
   * Destroys the overlay manager and cleans up all resources.
   *
   * Removes the dimming overlay and clears all references.
   * Editor host elements are left in the DOM as they're children of page elements
   * that will be cleaned up by the virtualization system.
   */
  destroy(): void {
    this.#hideDimmingOverlay();
    this.#hideHeaderFooterBorder();
    this.#activeEditorHost = null;
    this.#activeDecorationContainer = null;
    this.#activeRegion = null;
    this.#selectionOverlay = null;
  }

  /**
   * Finds the decoration container element for a given region kind.
   *
   * Decoration containers are created by the layout engine renderer with
   * class names 'superdoc-page-header' or 'superdoc-page-footer'.
   *
   * @param pageElement - The page element to search within
   * @param kind - The region kind (header or footer)
   * @returns The decoration container element, or null if not found
   */
  #findDecorationContainer(pageElement: HTMLElement, kind: 'header' | 'footer'): HTMLElement | null {
    const className = kind === 'header' ? 'superdoc-page-header' : 'superdoc-page-footer';
    return pageElement.querySelector(`.${className}`) as HTMLElement | null;
  }

  /**
   * Ensures an editor host element exists as a sibling to the decoration container.
   *
   * If the editor host doesn't exist, creates it. Otherwise, returns the existing one.
   * The editor host is positioned as a sibling (not child) of the decoration container
   * to avoid the pointer-events: none constraint.
   *
   * @param pageElement - The page element to create the host within
   * @param kind - The region kind (header or footer)
   * @returns The editor host element
   */
  #ensureEditorHost(pageElement: HTMLElement, kind: 'header' | 'footer'): HTMLElement | null {
    const className = kind === 'header' ? 'superdoc-header-editor-host' : 'superdoc-footer-editor-host';

    // Check if editor host already exists
    let editorHost = pageElement.querySelector(`.${className}`) as HTMLElement | null;

    if (!editorHost) {
      // Create new editor host element
      editorHost = document.createElement('div');
      editorHost.className = className;

      // Base styles for editor host
      Object.assign(editorHost.style, {
        position: 'absolute',
        pointerEvents: 'auto', // Critical: enables click interaction
        visibility: 'hidden', // Hidden by default, shown during editing
        overflow: 'hidden',
        boxSizing: 'border-box',
      });

      // Find decoration container to determine insertion point
      const decorationContainer = this.#findDecorationContainer(pageElement, kind);
      if (!decorationContainer) {
        console.error(`[EditorOverlayManager] Decoration container not found for ${kind}`);
        return null;
      }

      // Insert editor host as sibling after decoration container
      decorationContainer.parentNode?.insertBefore(editorHost, decorationContainer.nextSibling);
    }

    return editorHost;
  }

  /**
   * Positions the editor host to match the decoration container bounds.
   *
   * The editor host is positioned absolutely within the page element to exactly
   * overlap the decoration container's visual space.
   *
   * @param editorHost - The editor host element to position
   * @param region - The header/footer region with dimension data
   * @param decorationContainer - The decoration container to match
   * @param zoom - Current zoom level
   */
  #positionEditorHost(
    editorHost: HTMLElement,
    region: HeaderFooterRegion,
    decorationContainer: HTMLElement,
    _zoom: number,
  ): void {
    // Get decoration container bounds
    const decorationRect = decorationContainer.getBoundingClientRect();
    const pageElement = editorHost.parentElement;

    if (!pageElement) {
      console.error('[EditorOverlayManager] Editor host has no parent element');
      return;
    }

    const pageRect = pageElement.getBoundingClientRect();

    // Calculate position relative to page element
    const top = decorationRect.top - pageRect.top;
    const left = decorationRect.left - pageRect.left;
    const width = decorationRect.width;
    const height = decorationRect.height;

    // Apply positioning
    Object.assign(editorHost.style, {
      top: `${top}px`,
      left: `${left}px`,
      width: `${width}px`,
      height: `${height}px`,
    });

    // For footers, we need to calculate the content offset to align with the static rendering
    // The layout engine pushes footer content to the bottom of the container
    if (region.kind === 'footer') {
      const fragment = decorationContainer.querySelector('.superdoc-fragment');
      if (fragment instanceof HTMLElement) {
        // Get the top offset of the first fragment - this is where content starts
        const fragmentTop = parseFloat(fragment.style.top) || 0;
        // Store this offset so the editor container can use it
        editorHost.dataset.contentOffset = String(fragmentTop);
      }
    }
  }

  /**
   * Hides and removes the dimming overlay.
   */
  #hideDimmingOverlay(): void {
    if (this.#dimmingOverlay) {
      this.#dimmingOverlay.remove();
      this.#dimmingOverlay = null;
    }
  }

  /**
   * Shows a full-width border line at the bottom of the header or top of the footer.
   * This creates the MS Word style visual indicator spanning edge-to-edge of the page.
   */
  #showHeaderFooterBorder(
    pageElement: HTMLElement,
    region: HeaderFooterRegion,
    decorationContainer: HTMLElement,
  ): void {
    this.#hideHeaderFooterBorder();

    // Create border line element
    this.#borderLine = document.createElement('div');
    this.#borderLine.className = 'superdoc-header-footer-border';

    // Get decoration container position to know where to place the border
    const decorationRect = decorationContainer.getBoundingClientRect();
    const pageRect = pageElement.getBoundingClientRect();

    // Calculate position - for header, border is at bottom; for footer, border is at top
    const isHeader = region.kind === 'header';
    const topPosition = isHeader ? decorationRect.bottom - pageRect.top : decorationRect.top - pageRect.top;

    Object.assign(this.#borderLine.style, {
      position: 'absolute',
      left: '0',
      right: '0',
      top: `${topPosition}px`,
      height: BORDER_LINE_HEIGHT,
      backgroundColor: BORDER_LINE_COLOR, // MS Word blue
      zIndex: BORDER_LINE_Z_INDEX,
      pointerEvents: 'none',
    });

    pageElement.appendChild(this.#borderLine);
  }

  /**
   * Hides and removes the header/footer border line.
   */
  #hideHeaderFooterBorder(): void {
    if (this.#borderLine) {
      this.#borderLine.remove();
      this.#borderLine = null;
    }
  }
}
