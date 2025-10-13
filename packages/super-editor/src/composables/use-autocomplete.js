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
  const ghostTextAutoDismissTimeout = ref(null);
  const ghostText = ref('');
  const ghostTextTimeout = ref(null);
  const currentCursorPosition = ref(null);
  const ghostTextDecorationId = ref(null);
  const isGhostTextActive = ref(false);
  const ghostTextCursorPosition = ref(null);
  const autocompleteStatus = ref('');
  let activeEditor = null;

  const initializeAutocomplete = (editor, options = { apiCallFunction: null, enabled: ref(false) }) => {
    if (!editor) {
      console.warn('[Autocomplete] No editor provided');
      return;
    }
    activeEditor = editor;
    attachEventHandlers(editor, options);
  };

  const getWordsBeforeCursor = (editor) => {
    const { state } = editor.view;
    const { selection } = state;
    const { from } = selection;
    const textBeforeCursor = state.doc.textBetween(0, from, ' ', ' ');
    const wordCount = 10;
    const words = textBeforeCursor
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    const lastWords = words.slice(-wordCount).join(' ');
    return lastWords;
  };

  const clearGhostTextTimeout = () => {
    if (ghostTextTimeout.value) {
      clearTimeout(ghostTextTimeout.value);
      ghostTextTimeout.value = null;
    }
  };

  const removeGhostText = () => {
    if (!isGhostTextActive.value) return;
    try {
      if (ghostTextDecorationId.value && ghostTextDecorationId.value.remove) {
        ghostTextDecorationId.value.remove();
      }
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
    if (ghostTextAutoDismissTimeout.value) {
      clearTimeout(ghostTextAutoDismissTimeout.value);
      ghostTextAutoDismissTimeout.value = null;
    }
    // Remove lingering transitionend listeners on all overlays just in case
    const overlays = document.querySelectorAll('.ghost-text-overlay');
    overlays.forEach((ghost) => {
      ghost.replaceWith(ghost.cloneNode(true));
    });
  };

  const injectGhostTextStyles = () => {
    if (document.querySelector('#ghost-text-styles')) return;
    const style = document.createElement('style');
    style.id = 'ghost-text-styles';
    style.textContent = `
      @keyframes ghostTextFadeIn {
        from { opacity: 0; transform: translateY(-10%) translateX(-2px); }
        to { opacity: 1; transform: translateY(-10%) translateX(0); }
      }
      @keyframes cursorBlink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }
      .ghost-text-overlay { position: absolute; display: inline-flex; align-items: center; gap: 8px; z-index: 1000; pointer-events: auto; animation: ghostTextFadeIn 0.2s ease-out; font-family: inherit; font-size: inherit; line-height: inherit; transform: none; transform-origin: left center; }
      .ghost-text-content { color: #94a3b8; opacity: 0.7; font-style: italic; font-weight: 400; position: relative; white-space: nowrap; letter-spacing: inherit; }
      .ghost-text-content::after { content: ''; display: inline-block; width: 1px; height: 1em; background-color: #94a3b8; margin-left: 2px; animation: cursorBlink 1s ease-in-out infinite; vertical-align: text-top; }
      .ghost-text-truncated::before { content: '...'; color: #94a3b8; opacity: 0.5; margin-right: 2px; }
      .ghost-text-buttons { display: inline-flex; gap: 4px; align-items: center; }
      .ghost-text-btn { display: inline-flex; align-items: center; justify-content: center; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.12s ease; user-select: none; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; border: 1px solid; min-width: 32px; height: 22px; text-transform: uppercase; letter-spacing: 0.5px; }
      .ghost-text-btn--accept { background: rgba(34, 197, 94, 0.08); color: #059669; border-color: rgba(34, 197, 94, 0.2); }
      .ghost-text-btn--accept:hover { background: rgba(34, 197, 94, 0.15); border-color: rgba(34, 197, 94, 0.4); transform: translateY(-0.5px); box-shadow: 0 2px 4px rgba(34, 197, 94, 0.15); }
      .ghost-text-btn--dismiss { background: rgba(107, 114, 128, 0.08); color: #6b7280; border-color: rgba(107, 114, 128, 0.2); }
      .ghost-text-btn--dismiss:hover { background: rgba(107, 114, 128, 0.15); border-color: rgba(107, 114, 128, 0.4); transform: translateY(-0.5px); box-shadow: 0 2px 4px rgba(107, 114, 128, 0.15); }
.ghost-text-fadeout { opacity: 0 !important; transition: opacity 0.6s linear; }
      .ghost-text-fadeout { opacity: 0 !important; transition: opacity 0.6s linear; }
    `;
    document.head.appendChild(style);
  };

  const calculateMaxTextLength = (view, cursorPos, textToShow) => {
    try {
      const editorRect = view.dom.getBoundingClientRect();
      const cursorCoords = view.coordsAtPos(cursorPos);
      const availableWidth = editorRect.right - cursorCoords.left - 120;
      const measureSpan = document.createElement('span');
      measureSpan.style.cssText = `position: absolute; visibility: hidden; white-space: nowrap; font-family: inherit; font-size: inherit; font-style: italic; opacity: 0; pointer-events: none; color: #94a3b8;`;
      measureSpan.textContent = textToShow;
      document.body.appendChild(measureSpan);
      const textWidth = measureSpan.getBoundingClientRect().width;
      document.body.removeChild(measureSpan);
      if (textWidth <= availableWidth) {
        return { text: textToShow, truncated: false };
      }
      let truncatedText = textToShow;
      while (truncatedText.length > 0) {
        measureSpan.textContent = truncatedText;
        document.body.appendChild(measureSpan);
        const newWidth = measureSpan.getBoundingClientRect().width;
        document.body.removeChild(measureSpan);
        if (newWidth <= availableWidth - 20) {
          return { text: truncatedText, truncated: true };
        }
        truncatedText = truncatedText.slice(0, -1);
      }
      return { text: '', truncated: true };
    } catch (error) {
      console.error('[Autocomplete] Error calculating text length:', error);
      return { text: textToShow.length > 50 ? textToShow.slice(0, 47) : textToShow, truncated: textToShow.length > 50 };
    }
  };

  const displayGhostText = () => {
    if (!activeEditor || !ghostText.value) {
      return;
    }
    const { view } = activeEditor;
    const { state } = view;
    const cursorPos = state.selection.from;
    ghostTextCursorPosition.value = cursorPos;
    removeGhostText();
    injectGhostTextStyles();
    try {
      const coords = view.coordsAtPos(cursorPos);
      const { text: displayText, truncated: isTruncated } = calculateMaxTextLength(view, cursorPos, ghostText.value);
      const ghostOverlay = document.createElement('div');
      ghostOverlay.className = 'ghost-text-overlay';
      const textSpan = document.createElement('span');
      textSpan.className = isTruncated ? 'ghost-text-content ghost-text-truncated' : 'ghost-text-content';
      textSpan.textContent = displayText;
      const buttonsContainer = document.createElement('div');
      buttonsContainer.className = 'ghost-text-buttons';
      const acceptBtn = document.createElement('button');
      acceptBtn.className = 'ghost-text-btn ghost-text-btn--accept';
      acceptBtn.textContent = 'TAB';
      acceptBtn.title = 'Accept suggestion (Tab)';
      acceptBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        acceptGhostText();
      });
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
      ghostOverlay.appendChild(textSpan);
      ghostOverlay.appendChild(buttonsContainer);
      const editorWrapper = view.dom.closest('.super-editor') || view.dom.parentElement;
      const containerRect = editorWrapper ? editorWrapper.getBoundingClientRect() : view.dom.getBoundingClientRect();
      const cursorElement = view.domAtPos(cursorPos);
      const targetElement =
        cursorElement.node.nodeType === Node.TEXT_NODE ? cursorElement.node.parentElement : cursorElement.node;
      const computedStyle = window.getComputedStyle(targetElement);
      const lineHeight = parseFloat(computedStyle.lineHeight) || 18;
      let baseLeft, baseTop;
      if (editorWrapper) {
        const containerRect = editorWrapper.getBoundingClientRect();
        baseLeft = coords.left - containerRect.left;
        baseTop = coords.bottom - containerRect.top + 10;
        ghostOverlay.style.cssText = `left: ${baseLeft}px; top: ${baseTop}px; font-size: ${computedStyle.fontSize}; font-family: ${computedStyle.fontFamily}; line-height: ${computedStyle.lineHeight}; opacity:0; pointer-events:none; position:absolute;`;
        editorWrapper.appendChild(ghostOverlay);
      } else {
        baseLeft = coords.left;
        baseTop = coords.bottom + 10;
        ghostOverlay.style.cssText = `left: ${baseLeft}px; top: ${baseTop}px; font-size: ${computedStyle.fontSize}; font-family: ${computedStyle.fontFamily}; line-height: ${computedStyle.lineHeight}; opacity:0; pointer-events:none; position:absolute;`;
        document.body.appendChild(ghostOverlay);
      }
      // Remove centering! Just position left: baseLeft.
      ghostOverlay.style.cssText = `left: ${baseLeft}px; top: ${baseTop}px; font-size: ${computedStyle.fontSize}; font-family: ${computedStyle.fontFamily}; line-height: ${computedStyle.lineHeight}; opacity:1; pointer-events:auto; position:absolute;`;
      isGhostTextActive.value = true;
      ghostTextDecorationId.value = ghostOverlay;
      // Auto dismiss after 1s
      if (ghostTextAutoDismissTimeout.value) clearTimeout(ghostTextAutoDismissTimeout.value);
      ghostTextAutoDismissTimeout.value = setTimeout(() => {
        // Fade out and cleanup after fade
        if (ghostTextDecorationId.value) {
          const toRemove = ghostTextDecorationId.value;
          let removed = false;
          const cleanup = () => {
            if (!removed) {
              removeGhostText();
              removed = true;
            }
          };
          toRemove.classList.add('ghost-text-fadeout');
          toRemove.addEventListener('transitionend', cleanup, { once: true });
          // Fallback removal in case transitionend doesn't fire (e.g., overlay disappears too soon)
          setTimeout(cleanup, 700);
        } else {
          removeGhostText();
        }
      }, 5000);
    } catch (error) {
      console.error('[Autocomplete] Error displaying ghost text:', error);
    }
  };

  const showGhostText = async (apiCallFunction) => {
    if (!activeEditor || !apiCallFunction) {
      return;
    }
    const { view } = activeEditor;
    const { state } = view;
    const { selection } = state;
    const docSize = state.doc.content.size;
    const cursorPos = selection.from;
    const afterRangeEnd = Math.min(cursorPos + 3, docSize);
    const nextThreeAfterCursor = state.doc.textBetween(cursorPos, afterRangeEnd, ' ', ' ');
    if (nextThreeAfterCursor && nextThreeAfterCursor.trim().length > 0) {
      // Do not trigger autocomplete if any text in next 3 positions after cursor
      return;
    }
    try {
      const inputText = getWordsBeforeCursor(activeEditor);
      if (!inputText.trim()) {
        return;
      }
      autocompleteStatus.value = 'Generating suggestion...';
      const completedText = await apiCallFunction(inputText);
      if (completedText && completedText !== inputText) {
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

  const acceptGhostText = () => {
    if (!activeEditor || !isGhostTextActive.value || !ghostText.value) {
      return false;
    }
    const textToInsert = ghostText.value;
    const { view } = activeEditor;
    const { state } = view;
    const { selection } = state;
    const cursorPos = ghostTextCursorPosition.value !== null ? ghostTextCursorPosition.value : selection.from;
    if (cursorPos < 0 || cursorPos > state.doc.content.size) {
      console.error('[Autocomplete] Invalid cursor position:', cursorPos, 'doc size:', state.doc.content.size);
      removeGhostText();
      return false;
    }
    try {
      removeGhostText();
      const tr = state.tr;
      const safePos = Math.min(Math.max(0, cursorPos), tr.doc.content.size);
      tr.insertText(textToInsert, safePos);
      const newCursorPos = safePos + textToInsert.length;
      const finalPos = Math.min(newCursorPos, tr.doc.content.size);
      tr.setSelection(selection.constructor.create(tr.doc, finalPos));
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

  const scheduleGhostText = (apiCallFunction, delay = 150) => {
    clearGhostTextTimeout();
    removeGhostText();
    if (!apiCallFunction) return;
    ghostTextTimeout.value = setTimeout(() => {
      showGhostText(apiCallFunction);
    }, delay);
  };

  const attachEventHandlers = (editor, { apiCallFunction, enabled }) => {
    const editorElement = editor.view.dom;
    const handleKeyDown = async (event) => {
      if (!enabled || !enabled.value) return;
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
            if (ghostTextAutoDismissTimeout.value) {
              clearTimeout(ghostTextAutoDismissTimeout.value);
              ghostTextAutoDismissTimeout.value = null;
            }
          }
          return false;
        }
        return;
      }
      if (event.key === 'Escape') {
        if (isGhostTextActive.value && ghostText.value) {
          event.preventDefault();
          event.stopPropagation();
          removeGhostText();
          clearGhostTextTimeout();
          return false;
        }
      }
      if (event.key === 'Backspace') {
        if (isGhostTextActive.value && ghostText.value) {
          event.preventDefault();
          event.stopPropagation();
          removeGhostText();
          clearGhostTextTimeout();
          return false;
        }
        clearGhostTextTimeout();
        removeGhostText();
        setTimeout(() => scheduleGhostText(apiCallFunction), 150);
        return;
      }
      if (event.key !== 'Tab') {
        clearGhostTextTimeout();
        removeGhostText();
      }
      if (event.key.length === 1 || event.key === 'Delete' || event.key === 'Enter') {
        setTimeout(() => scheduleGhostText(apiCallFunction), 150);
      }
    };
    const handleSelectionChange = () => {
      if (!enabled || !enabled.value) return;
      try {
        const { selection } = editor.view.state;
        const newCursorPosition = selection.from;
        if (currentCursorPosition.value !== newCursorPosition) {
          currentCursorPosition.value = newCursorPosition;
          clearGhostTextTimeout();
          removeGhostText();
          setTimeout(() => scheduleGhostText(apiCallFunction), 150);
        }
      } catch (error) {
        console.error('[Autocomplete] Error in handleSelectionChange:', error);
      }
    };
    editor.view.dom.addEventListener('selectionchange', handleSelectionChange);
    editorElement.addEventListener('click', () => {
      setTimeout(handleSelectionChange, 0);
    });
    editorElement.addEventListener('keydown', handleKeyDown, true);
    editor._autocompleteHandlers = { keydown: handleKeyDown, selectionChange: handleSelectionChange };
  };

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
    ghostText,
    isGhostTextActive,
    autocompleteStatus,
    initializeAutocomplete,
    acceptGhostText,
    removeGhostText,
    scheduleGhostText,
    cleanup,
    getWordsBeforeCursor,
  };
}
