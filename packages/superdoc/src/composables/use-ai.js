import { ref, reactive } from 'vue';

/**
 * Composable to manage AI layer and AI writer functionality
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.emitAiHighlight - Function to emit AI highlight events
 * @param {Object} options.activeEditorRef - Ref to the active editor
 * @returns {Object} - AI state and methods
 */
export function useAi({ emitAiHighlight, activeEditorRef }) {
  // Shared state
  const showAiLayer = ref(false);
  const showAiWriter = ref(false);
  const aiWriterPosition = reactive({ top: 0, left: 0 });
  const aiLayer = ref(null);

  /**
   * Handle AI highlighting events
   *
   * @param {Object} params - Event parameters
   * @param {String} params.type - Type of event (add/remove)
   * @param {Object} params.data - Additional data (optional)
   */
  const handleAiHighlight = ({ type, data }) => {
    if (!aiLayer.value) return;

    // Get the editor from the ref
    const editor = activeEditorRef.value;

    switch (type) {
      case 'add':
        // First clear any existing pulse animation if the editor is available
        if (editor && !editor.isDestroyed) {
          editor.commands.clearAiHighlightStyle();
        }
        // Then add the highlight
        aiLayer.value.addAiHighlight();
        break;
      case 'remove':
        // Clear any pulse animation before removing highlight
        if (editor && !editor.isDestroyed) {
          editor.commands.clearAiHighlightStyle();
        }
        aiLayer.value.removeAiHighlight();
        break;
      case 'update':
        aiLayer.value.updateAiHighlight();
        break;
    }
  };

  /**
   * Show the AI writer at the current cursor position
   */
  const showAiWriterAtCursor = () => {
    const editor = activeEditorRef.value;
    if (!editor || editor.isDestroyed) {
      console.error('[useAi] Editor not available');
      return;
    }

    try {
      // Get the current cursor position
      const { view } = editor;
      const { selection } = view.state;

      // If we have selected text, add AI highlighting
      if (!selection.empty) {
        // Emit the highlight event to trigger the AI highlighting
        emitAiHighlight({ type: 'add', data: null });
      }

      let coords;
      try {
        // Try to get coordinates from the selection head
        coords = view.coordsAtPos(selection.$head.pos);
      } catch (e) {
        // Fallback to using the DOM selection if ProseMirror position is invalid
        const domSelection = window.getSelection();
        if (domSelection.rangeCount > 0) {
          const range = domSelection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          coords = { top: rect.top, left: rect.left };
        } else {
          // If no selection, use editor position
          const editorRect = view.dom.getBoundingClientRect();
          coords = { top: editorRect.top + 50, left: editorRect.left + 50 };
        }
      }

      // Position the AIWriter at the cursor position
      // Move down 30px to render under the cursor
      aiWriterPosition.top = coords.top + 30 + 'px';
      aiWriterPosition.left = coords.left + 'px';

      // Show the AIWriter
      showAiWriter.value = true;
    } catch (error) {
      console.error('[useAi] Error displaying AIWriter:', error);
      // Fallback position in center of editor
      try {
        const editorDom = activeEditorRef.value.view.dom;
        const rect = editorDom.getBoundingClientRect();
        aiWriterPosition.top = rect.top + 100 + 'px';
        aiWriterPosition.left = rect.left + 100 + 'px';
        showAiWriter.value = true;
      } catch (e) {
        console.error('[useAi] Failed to get fallback position:', e);
      }
    }
  };

  /**
   * Handle closing the AI writer
   */
  const handleAiWriterClose = () => {
    showAiWriter.value = false;
  };

  /**
   * Initialize the AI layer
   *
   * @param {Boolean} value - Whether to show the AI layer
   */
  const initAiLayer = (value = true) => {
    showAiLayer.value = value;
  };

  /**
   * Handle tool click for AI functionality
   */
  const handleAiToolClick = () => {
    // Emit the highlight event before showing the AI writer
    // @todo: is this double?
    emitAiHighlight({ type: 'add', data: null });
    showAiWriterAtCursor();
  };

  return {
    // State
    showAiLayer,
    showAiWriter,
    aiWriterPosition,
    aiLayer,

    // Methods
    initAiLayer,
    handleAiHighlight,
    showAiWriterAtCursor,
    handleAiWriterClose,
    handleAiToolClick,
  };
}
