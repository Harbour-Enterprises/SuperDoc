import { ref } from 'vue';

/**
 * Composable for ghost text autocomplete functionality
 * Provides intelligent text suggestions with Tab-to-accept UI
 */
export function getAutocompleteEndpoint() {
  if (typeof process !== 'undefined' && process.env && process.env.VITE_AUTOCOMPLETE_URL) {
    return process.env.VITE_AUTOCOMPLETE_URL;
  }
  // For Vite and other build tools: set VITE_AUTOCOMPLETE_URL in your .env file!
  return '';
}

export function useAutocomplete() {
  // Ghost text state
  const ghostText = ref('');
  const ghostTextTimeout = ref(null);
  const currentCursorPosition = ref(null);
  const ghostTextDecorationId = ref(null);
  const isGhostTextActive = ref(false);
  const ghostTextCursorPosition = ref(null);
  const autocompleteStatus = ref('');

  // Active editor reference
  let activeEditor = null;

  /**
   * Initialize autocomplete for an editor instance
   */
  const initializeAutocomplete = (editor, options = { apiCallFunction: null, enabled: ref(false) }) => {
    if (!editor) {
      console.warn('[Autocomplete] No editor provided');
      return;
    }

    activeEditor = editor;

    // Set up event listeners
    attachEventHandlers(editor, options);
  };

  /**
   * Get the last words before the cursor position
   */
  const getWordsBeforeCursor = (editor) => {
    const { state } = editor.view;
    const { selection } = state;
    const { from } = selection;

    // Get text from beginning of document to cursor position
    const textBeforeCursor = state.doc.textBetween(0, from, ' ', ' ');

    // Configurable number of words to extract
    const wordCount = 10;
    // Split text into words and get the last N words
    const words = textBeforeCursor
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    const lastWords = words.slice(-wordCount).join(' ');

    return lastWords;
  };

  /**
   * Clear the ghost text timeout
   */
  const clearGhostTextTimeout = () => {
    if (ghostTextTimeout.value) {
      clearTimeout(ghostTextTimeout.value);
      ghostTextTimeout.value = null;
    }
  };

  /**
   * Remove ghost text overlay from the DOM
   */
  const removeGhostText = () => {
    if (!isGhostTextActive.value) return;

    try {
      // Remove the ghost text overlay
      if (ghostTextDecorationId.value && ghostTextDecorationId.value.remove) {
        ghostTextDecorationId.value.remove();
      }

      // Also remove any other ghost text elements that might exist
      const existingGhosts = document.querySelectorAll('.ghost-text-overlay');
      existingGhosts.forEach((ghost) => {
        try {
          ghost.remove();
        } catch (e) {
          console.warn('[Autocomplete] Could not remove ghost element:', e);
        }
      });
    } catch (error) {
      console.error('[Autocomplete] Error removing ghost text:', error);
    }

    ghostText.value = '';
    ghostTextDecorationId.value = null;
    ghostTextCursorPosition.value = null;
    isGhostTextActive.value = false;
  };

  /**
   * Create and inject CSS styles for ghost text
   */
  const injectGhostTextStyles = () => {
    if (document.querySelector('#ghost-text-styles')) return;

    const style = document.createElement('style');
    style.id = 'ghost-text-styles';
    style.textContent = `
      @keyframes ghostTextFadeIn {
        from {
          opacity: 0;
          transform: translateY(-10%) translateX(-2px);
        }
        to {
          opacity: 1;
          transform: translateY(-10%) translateX(0);
        }
      }
        to {
          opacity: 1;
          transform: translateY(-10%) translateX(0);
        }
      }

      @keyframes cursorBlink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }

      .ghost-text-overlay {
        position: absolute;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        z-index: 1000;
        pointer-events: auto;
        animation: ghostTextFadeIn 0.2s ease-out;
        font-family: inherit;
        font-size: inherit;
        line-height: inherit;
        transform: none;
        transform-origin: left center;
      }

      .ghost-text-content {
        color: #94a3b8;
        opacity: 0.7;
        font-style: italic;
        font-weight: 400;
        position: relative;
        white-space: nowrap;
        letter-spacing: inherit;
      }

      .ghost-text-content::after {
        content: '';
        display: inline-block;
        width: 1px;
        height: 1em;
        background-color: #94a3b8;
        margin-left: 2px;
        animation: cursorBlink 1s ease-in-out infinite;
        vertical-align: text-top;
      }

      .ghost-text-truncated::before {
        content: '...';
        color: #94a3b8;
        opacity: 0.5;
        margin-right: 2px;
      }

      .ghost-text-buttons {
        display: inline-flex;
        gap: 4px;
        align-items: center;
      }

      .ghost-text-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.12s ease;
        user-select: none;
        font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
        border: 1px solid;
        min-width: 32px;
        height: 22px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .ghost-text-btn--accept {
        background: rgba(34, 197, 94, 0.08);
        color: #059669;
        border-color: rgba(34, 197, 94, 0.2);
      }

      .ghost-text-btn--accept:hover {
        background: rgba(34, 197, 94, 0.15);
        border-color: rgba(34, 197, 94, 0.4);
        transform: translateY(-0.5px);
        box-shadow: 0 2px 4px rgba(34, 197, 94, 0.15);
      }

      .ghost-text-btn--dismiss {
        background: rgba(107, 114, 128, 0.08);
        color: #6b7280;
        border-color: rgba(107, 114, 128, 0.2);
      }

      .ghost-text-btn--dismiss:hover {
        background: rgba(107, 114, 128, 0.15);
        border-color: rgba(107, 114, 128, 0.4);
        transform: translateY(-0.5px);
        box-shadow: 0 2px 4px rgba(107, 114, 128, 0.15);
      }
    `;
    document.head.appendChild(style);
  };

  /**
   * Calculate maximum text length before editor margin
   */
  const calculateMaxTextLength = (view, cursorPos, textToShow) => {
    try {
      // Get editor container width
      const editorRect = view.dom.getBoundingClientRect();
      const cursorCoords = view.coordsAtPos(cursorPos);

      // Calculate available space from cursor to right margin (reserve space for buttons)
      const availableWidth = editorRect.right - cursorCoords.left - 120; // 120px for buttons + margin

      // Create a temporary span to measure text width
      const measureSpan = document.createElement('span');
      measureSpan.style.cssText = `
        position: absolute;
        visibility: hidden;
        white-space: nowrap;
        font-family: inherit;
        font-size: inherit;
        font-style: italic;
        opacity: 0;
        pointer-events: none;
        color: #94a3b8;
      `;
      measureSpan.textContent = textToShow;
      document.body.appendChild(measureSpan);

      const textWidth = measureSpan.getBoundingClientRect().width;
      document.body.removeChild(measureSpan);

      // If text fits, return full text
      if (textWidth <= availableWidth) {
        return { text: textToShow, truncated: false };
      }

      // Otherwise, truncate text to fit
      let truncatedText = textToShow;
      while (truncatedText.length > 0) {
        measureSpan.textContent = truncatedText;
        document.body.appendChild(measureSpan);
        const newWidth = measureSpan.getBoundingClientRect().width;
        document.body.removeChild(measureSpan);

        if (newWidth <= availableWidth - 20) {
          // 20px for "..."
          return { text: truncatedText, truncated: true };
        }

        truncatedText = truncatedText.slice(0, -1);
      }

      return { text: '', truncated: true };
    } catch (error) {
      console.error('[Autocomplete] Error calculating text length:', error);
      return {
        text: textToShow.length > 50 ? textToShow.slice(0, 47) : textToShow,
        truncated: textToShow.length > 50,
      };
    }
  };

  /**
   * Display ghost text as positioned div overlay
   */
  const displayGhostText = () => {
    if (!activeEditor || !ghostText.value) {
      return;
    }

    const { view } = activeEditor;
    const { state } = view;
    const cursorPos = state.selection.from;

    // Store the cursor position where ghost text is created
    ghostTextCursorPosition.value = cursorPos;

    // Remove any existing ghost text first
    removeGhostText();

    // Inject styles if not already present
    injectGhostTextStyles();

    try {
      // Get cursor coordinates
      const coords = view.coordsAtPos(cursorPos);

      // Calculate truncated text if needed
      const { text: displayText, truncated: isTruncated } = calculateMaxTextLength(view, cursorPos, ghostText.value);

      // Create the main ghost text overlay
      const ghostOverlay = document.createElement('div');
      ghostOverlay.className = 'ghost-text-overlay';

      // Create the text content span
      const textSpan = document.createElement('span');
      textSpan.className = isTruncated ? 'ghost-text-content ghost-text-truncated' : 'ghost-text-content';
      textSpan.textContent = displayText;

      // Create interactive buttons container
      const buttonsContainer = document.createElement('div');
      buttonsContainer.className = 'ghost-text-buttons';

      // Accept button
      const acceptBtn = document.createElement('button');
      acceptBtn.className = 'ghost-text-btn ghost-text-btn--accept';
      acceptBtn.textContent = 'TAB';
      acceptBtn.title = 'Accept suggestion (Tab)';
      acceptBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        acceptGhostText();
      });

      // Dismiss button
      const dismissBtn = document.createElement('button');
      dismissBtn.className = 'ghost-text-btn ghost-text-btn--dismiss';
      dismissBtn.textContent = 'ESC';
      dismissBtn.title = 'Dismiss suggestion (Esc)';
      dismissBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeGhostText();
      });

      buttonsContainer.appendChild(acceptBtn);
      buttonsContainer.appendChild(dismissBtn);

      // Add components to overlay
      ghostOverlay.appendChild(textSpan);
      ghostOverlay.appendChild(buttonsContainer);

      // Find the editor's parent container (SuperEditor wrapper)
      const editorWrapper = view.dom.closest('.super-editor') || view.dom.parentElement;

      // Get the correct container bounds for positioning
      const containerRect = editorWrapper ? editorWrapper.getBoundingClientRect() : view.dom.getBoundingClientRect();
      const relativeLeft = coords.left - containerRect.left;
      const relativeTop = coords.top - containerRect.top;

      // Get computed styles from the cursor position to match font size
      const cursorElement = view.domAtPos(cursorPos);
      const targetElement =
        cursorElement.node.nodeType === Node.TEXT_NODE ? cursorElement.node.parentElement : cursorElement.node;
      const computedStyle = window.getComputedStyle(targetElement);

      // Position the overlay relative to the correct container and inherit font properties
      ghostOverlay.style.cssText = `
        left: ${relativeLeft}px;
        top: ${relativeTop}px;
        font-size: ${computedStyle.fontSize};
        font-family: ${computedStyle.fontFamily};
        line-height: ${computedStyle.lineHeight};
      `;

      // Add to the correct container
      if (editorWrapper) {
        editorWrapper.appendChild(ghostOverlay);
      } else {
        // Fallback to document body with absolute positioning
        ghostOverlay.style.cssText = `
          left: ${coords.left}px;
          top: ${coords.top}px;
        `;
        document.body.appendChild(ghostOverlay);
      }

      isGhostTextActive.value = true;
      ghostTextDecorationId.value = ghostOverlay;
    } catch (error) {
      console.error('[Autocomplete] Error displaying ghost text:', error);
    }
  };

  /**
   * Show ghost text after calling autocomplete API
   */
  const showGhostText = async (apiCallFunction) => {
    if (!activeEditor || !apiCallFunction) {
      return;
    }

    try {
      const inputText = getWordsBeforeCursor(activeEditor);

      if (!inputText.trim()) {
        return;
      }

      autocompleteStatus.value = 'Generating suggestion...';

      // Call the autocomplete API
      const completedText = await apiCallFunction(inputText);

      if (completedText && completedText !== inputText) {
        // Get the completion part
        let textToShow = completedText;
        if (completedText.startsWith(inputText)) {
          textToShow = completedText.slice(inputText.length);
        }

        if (textToShow.trim()) {
          ghostText.value = textToShow;
          displayGhostText();
          autocompleteStatus.value = 'Suggestion ready';
        } else {
          autocompleteStatus.value = '';
        }
      } else {
        autocompleteStatus.value = '';
      }
    } catch (error) {
      console.error('[Autocomplete] Ghost text generation failed:', error);
      autocompleteStatus.value = `Error: ${error.message}`;
    }
  };

  /**
   * Accept the current ghost text and insert it into the editor
   */
  const acceptGhostText = () => {
    if (!activeEditor || !isGhostTextActive.value || !ghostText.value) {
      return false;
    }

    const textToInsert = ghostText.value;
    const { view } = activeEditor;
    const { state } = view;
    const { selection } = state;

    // Use the stored cursor position where ghost text was created, or current cursor position as fallback
    const cursorPos = ghostTextCursorPosition.value !== null ? ghostTextCursorPosition.value : selection.from;

    // Validate cursor position
    if (cursorPos < 0 || cursorPos > state.doc.content.size) {
      console.error('[Autocomplete] Invalid cursor position:', cursorPos, 'doc size:', state.doc.content.size);
      removeGhostText();
      return false;
    }

    try {
      // Remove the ghost text display first
      removeGhostText();

      // Create a safe transaction to insert text
      const tr = state.tr;

      // Make sure the position is still valid after any state changes
      const safePos = Math.min(Math.max(0, cursorPos), tr.doc.content.size);

      // Insert the ghost text at the safe cursor position
      tr.insertText(textToInsert, safePos);

      // Calculate new cursor position and validate it
      const newCursorPos = safePos + textToInsert.length;
      const finalPos = Math.min(newCursorPos, tr.doc.content.size);

      // Set selection to end of inserted text
      tr.setSelection(selection.constructor.create(tr.doc, finalPos));

      // Dispatch the transaction
      view.dispatch(tr);
      view.focus();

      autocompleteStatus.value = 'Suggestion accepted';
      setTimeout(() => {
        autocompleteStatus.value = '';
      }, 2000);
      return true;
    } catch (error) {
      console.error('[Autocomplete] Error accepting ghost text:', error);
      console.error('[Autocomplete] Error stack:', error.stack);
      removeGhostText();
      autocompleteStatus.value = `Error: ${error.message}`;
      return false;
    }
  };

  /**
   * Schedule ghost text to appear after a delay
   */
  const scheduleGhostText = (apiCallFunction, delay = 1000) => {
    clearGhostTextTimeout();
    removeGhostText();

    if (!apiCallFunction) return;

    ghostTextTimeout.value = setTimeout(() => {
      showGhostText(apiCallFunction);
    }, delay);
  };

  /**

  /**
   * Attach event handlers to the editor
   */
  const attachEventHandlers = (editor, { apiCallFunction, enabled }) => {
    const editorElement = editor.view.dom;

    const handleKeyDown = async (event) => {
      if (!enabled || !enabled.value) return;

      // Handle Tab key - ONLY accept ghost text if it's visible
      if (event.key === 'Tab' && !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (isGhostTextActive.value && ghostText.value) {
          event.preventDefault();
          event.stopPropagation();

          try {
            const success = acceptGhostText();
            if (!success) {
              console.warn('[Autocomplete] Ghost text acceptance failed');
            }
          } catch (error) {
            console.error('[Autocomplete] Error in acceptGhostText:', error);
            removeGhostText();
          }
          return false;
        }
        // If no ghost text is visible, let Tab work normally (don't prevent default)
        // This allows normal tab spacing/indentation to work
        return;
      }

      // Handle Escape - cancel ghost text if active
      if (event.key === 'Escape') {
        if (isGhostTextActive.value && ghostText.value) {
          event.preventDefault();
          event.stopPropagation();
          removeGhostText();
          clearGhostTextTimeout();
          return false;
        }
      }

      // Handle Backspace - cancel ghost text if active, otherwise normal behavior
      if (event.key === 'Backspace') {
        if (isGhostTextActive.value && ghostText.value) {
          event.preventDefault();
          event.stopPropagation();
          removeGhostText();
          clearGhostTextTimeout();
          return false;
        }
        // If no ghost text, let backspace work normally and schedule new ghost text
        clearGhostTextTimeout();
        removeGhostText();
        setTimeout(() => scheduleGhostText(apiCallFunction), 100);
        return;
      }

      // For any other key, clear ghost text and potentially schedule new one
      if (event.key !== 'Tab') {
        clearGhostTextTimeout();
        removeGhostText();
      }

      // For typing keys, schedule new ghost text after a pause
      if (event.key.length === 1 || event.key === 'Delete' || event.key === 'Enter') {
        setTimeout(() => scheduleGhostText(apiCallFunction), 50);
      }
    };

    const handleSelectionChange = () => {
      if (!enabled || !enabled.value) return;

      try {
        const { selection } = editor.view.state;
        const newCursorPosition = selection.from;

        // If cursor moved, clear ghost text and schedule new one
        if (currentCursorPosition.value !== newCursorPosition) {
          currentCursorPosition.value = newCursorPosition;
          clearGhostTextTimeout();
          removeGhostText();
          setTimeout(() => scheduleGhostText(apiCallFunction), 100);
        }
      } catch (error) {
        console.error('[Autocomplete] Error in handleSelectionChange:', error);
      }
    };

    // Listen for selection changes (cursor movement)
    editor.view.dom.addEventListener('selectionchange', handleSelectionChange);

    // Listen for clicks which can move cursor
    editorElement.addEventListener('click', () => {
      setTimeout(handleSelectionChange, 0);
    });

    // Use capture phase to ensure we get the event before ProseMirror
    editorElement.addEventListener('keydown', handleKeyDown, true);

    // Store the handlers so we can remove them if needed
    editor._autocompleteHandlers = {
      keydown: handleKeyDown,
      selectionChange: handleSelectionChange,
    };
  };

  /**
   * Cleanup function to remove event listeners and clear state
   */
  const cleanup = () => {
    clearGhostTextTimeout();
    removeGhostText();

    if (activeEditor && activeEditor._autocompleteHandlers) {
      const { keydown, selectionChange } = activeEditor._autocompleteHandlers;
      activeEditor.view.dom.removeEventListener('keydown', keydown, true);
      activeEditor.view.dom.removeEventListener('selectionchange', selectionChange);
      activeEditor.view.dom.removeEventListener('click', selectionChange);
      delete activeEditor._autocompleteHandlers;
    }

    activeEditor = null;
  };

  return {
    // State
    ghostText,
    isGhostTextActive,
    autocompleteStatus,

    // Methods
    initializeAutocomplete,
    acceptGhostText,
    removeGhostText,
    scheduleGhostText,
    cleanup,

    // Utilities
    getWordsBeforeCursor,
  };
}
