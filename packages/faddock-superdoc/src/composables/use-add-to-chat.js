import { ref } from 'vue';

/**
 * Composable for Add to Chat functionality, extracted from extension/plugin logic.
 * Manages selection state and exposes API for UI components to render
 * 'Add to Chat' button based on editor selection.
 */
/**
 * Composable for Add to Chat functionality, extracted from extension/plugin logic.
 * Manages selection state and exposes API for UI components to render
 * 'Add to Chat' button based on editor selection.
 *
 * @returns {object} showAddToChatBtn, selectedText, initializeAddToChat, cleanup, addToChat
 */
export function useAddToChat(onAddToChat) {
  const showAddToChatBtn = ref(false);
  const selectedText = ref('');
  const buttonPosition = ref({ left: 0, top: 0 });
  const fadeout = ref(false);
  let fadeTimeout = null;
  let activeEditor /*: any */ = null;
  let lastUpdateTimeout = null;

  // --- Add to Chat Floating Button Injection ---
  function injectAddToChatButtonStyles() {
    if (document.getElementById('add-to-chat-floating-btn-styles')) return;
    const style = document.createElement('style');
    style.id = 'add-to-chat-floating-btn-styles';
    style.textContent = `
.add-to-chat-floating-btn {
  position: absolute;
  z-index: 2500;
  background: rgb(235,237,240);
  color: #071D49;
  border-radius: 8px;
  border: 1px solid rgb(205,210,219);
  padding: 2px 14px;
  font-size: 12px;
  font-weight: 300;
  cursor: pointer;
  box-shadow: none;
  opacity: 1;
  transition: opacity 0.3s, background 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.2s;
  pointer-events: auto;
}
.add-to-chat-floating-btn:hover {
  background: rgb(218,221,228);
  border-color: rgb(156,165,182);
  box-shadow: 0 2px 4px rgb(218,221,228);
  transform: translateY(-0.5px);
}
.add-to-chat-floating-btn--fadeout {
  opacity: 0 !important;
  pointer-events: none;
  transition: opacity 0.6s;
}
`;

    document.head.appendChild(style);
  }

  function removeAddToChatFloatingBtn(editorWrapper) {
    const oldBtn = editorWrapper?.querySelector('.add-to-chat-floating-btn');
    if (oldBtn) oldBtn.remove();
  }

  function showAddToChatFloatingBtn({ left, top, selectedText }, editorWrapper, onClick) {
    injectAddToChatButtonStyles();
    removeAddToChatFloatingBtn(editorWrapper);
    const btn = document.createElement('button');
    btn.className = 'add-to-chat-floating-btn';
    btn.style.left = `${left}px`;
    btn.style.top = `${top}px`;
    btn.textContent = 'Add to Chat';
    btn.title = selectedText;
    btn.onclick = (e) => {
      e.stopPropagation();
      onClick(selectedText);
      btn.classList.add('add-to-chat-floating-btn--fadeout');
      setTimeout(() => btn.remove(), 600);
    };
    editorWrapper.appendChild(btn);
  }

  // Update selection/reactive state
  const updateSelection = () => {
    if (!activeEditor) return;
    const { view, state } = activeEditor;
    const { from, to, empty } = state.selection;
    const editorWrapper = view.dom.closest('.super-editor') || view.dom.parentElement;
    removeAddToChatFloatingBtn(editorWrapper);
    if (empty) {
      showAddToChatBtn.value = false;
      selectedText.value = '';
      fadeout.value = false;
      if (fadeTimeout) clearTimeout(fadeTimeout);
      return;
    }
    // Check the text content between from and to
    const text = state.doc.textBetween(from, to, ' ');
    if (text && text.trim().length > 0) {
      showAddToChatBtn.value = true;
      selectedText.value = text.trim();
      // Compute button position using coordsAtPos of end of selection
      let coords = view.coordsAtPos(to);
      let left = coords.left;
      let top = coords.top;
      if (editorWrapper) {
        const box = editorWrapper.getBoundingClientRect();
        left = coords.left - box.left;
        top = coords.top - box.top - 0;
      } else {
        left = coords.left + window.scrollX;
        top = coords.top + window.scrollY - 0;
      }
      buttonPosition.value = { left, top };
      showAddToChatFloatingBtn({ left, top, selectedText: text.trim() }, editorWrapper, (txt) => {
        addToChat((message, documentText) => {
          if (typeof onAddToChat === 'function') {
            onAddToChat(message, documentText);
          }
        });
        showAddToChatBtn.value = false;
        selectedText.value = '';
      });
      // Handle fadeout timer (for Vue state, DOM cleans up above)
      fadeout.value = false;
      if (fadeTimeout) clearTimeout(fadeTimeout);
      fadeTimeout = setTimeout(() => {
        fadeout.value = true;
        showAddToChatBtn.value = false;
        selectedText.value = '';
        removeAddToChatFloatingBtn(editorWrapper);
      }, 6000);
    } else {
      showAddToChatBtn.value = false;
      selectedText.value = '';
      fadeout.value = false;
      if (fadeTimeout) clearTimeout(fadeTimeout);
      removeAddToChatFloatingBtn(editorWrapper);
    }
  };

  // Debounced update
  const scheduleUpdate = () => {
    if (lastUpdateTimeout) clearTimeout(lastUpdateTimeout);
    lastUpdateTimeout = setTimeout(updateSelection, 1);
  };

  // Initialize composable with editor instance
  /**
   * Initializes AddToChat composable with editor instance.
   * @param {object} editor - ProseMirror editor instance
   */
  const initializeAddToChat = (editor /*: any */) => {
    if (!editor || !editor.view) {
      console.warn('[AddToChat] No editor provided or missing view');
      return;
    }
    activeEditor = editor;
    // Attach listeners to update state on selection changes
    editor.view.dom.addEventListener('mouseup', scheduleUpdate);
    editor.view.dom.addEventListener('keyup', scheduleUpdate);
    // run once to sync state
    updateSelection();
  };

  // Clean up listeners
  const cleanup = () => {
    if (activeEditor && activeEditor.view && activeEditor.view.dom) {
      activeEditor.view.dom.removeEventListener('mouseup', scheduleUpdate);
      activeEditor.view.dom.removeEventListener('keyup', scheduleUpdate);
    }
    showAddToChatBtn.value = false;
    selectedText.value = '';
    buttonPosition.value = { left: 0, top: 0 };
    fadeout.value = false;
    if (fadeTimeout) clearTimeout(fadeTimeout);
    activeEditor = null;
    if (lastUpdateTimeout) clearTimeout(lastUpdateTimeout);
  };

  // Action to trigger when user presses 'add to chat' button
  /**
   * Call to trigger chat action (e.g. button click)
   * @param {function} cb - callback with selectedText (string) and documentText (string)
   */
  const addToChat = (cb /*: any */) => {
    if (showAddToChatBtn.value && selectedText.value && typeof cb === 'function') {
      let fullDocumentText = '';
      if (activeEditor && activeEditor.view && activeEditor.view.state) {
        const { state } = activeEditor.view;
        const { doc } = state;
        fullDocumentText = doc.textBetween(0, doc.content.size, '\n', '\n');
      }
      cb(selectedText.value, fullDocumentText);
      showAddToChatBtn.value = false;
      selectedText.value = '';
      fadeout.value = false;
      if (fadeTimeout) clearTimeout(fadeTimeout);
    }
  };

  return {
    showAddToChatBtn,
    selectedText,
    buttonPosition,
    fadeout,
    initializeAddToChat,
    cleanup,
    addToChat,
  };
}
