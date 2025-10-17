import { reactive, ref, shallowRef, watch } from 'vue';
import { SuperDocAiController } from '@harbour-enterprises/superdoc-ai-controller';

/**
 * Composable to manage AI layer and AI writer functionality
 *
 * @param {Object} options - Configuration options
 * @param {Object} options.activeEditorRef - Ref to the active editor
 * @returns {Object} - AI state and methods
 */
export function useAi({ activeEditorRef }) {
  // Shared state
  const showAiLayer = ref(false);
  const showAiWriter = ref(false);
  const aiWriterPosition = reactive({ top: 0, left: 0 });
  const aiLayer = ref(null);
  const aiControllerRef = shallowRef(null);

  watch(
    () => activeEditorRef.value,
    (editor) => {
      if (editor && !editor.isDestroyed) {
        aiControllerRef.value =
          aiControllerRef.value?.editor === editor ? aiControllerRef.value : new SuperDocAiController({ editor });
      } else {
        aiControllerRef.value = null;
      }
    },
    { immediate: true },
  );

  const ensureAiController = () => {
    const editor = activeEditorRef.value;
    if (!editor || editor.isDestroyed) {
      console.error('[useAi] Editor not available');
      return null;
    }

    if (!aiControllerRef.value || aiControllerRef.value.editor !== editor) {
      aiControllerRef.value = new SuperDocAiController({ editor });
    }

    return aiControllerRef.value;
  };

  const runWithController = async (methodName, handler) => {
    const controller = ensureAiController();
    if (!controller) {
      throw new Error('[useAi] Editor not available');
    }

    try {
      return await handler(controller);
    } catch (error) {
      console.error(`[useAi] ${methodName} failed:`, error);
      throw error;
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
        // Add the ai mark to the document
        editor.commands.insertAiMark();
      }

      let coords;
      try {
        // Try to get coordinates from the selection head
        coords = view.coordsAtPos(selection.$head.pos);
      } catch {
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
    // Add the ai mark to the document
    const editor = activeEditorRef.value;
    if (!editor || editor.isDestroyed) {
      console.error('[useAi] Editor not available');
      return;
    }
    editor.commands.insertAiMark();
    // Show the AI writer at the cursor position
    showAiWriterAtCursor();
  };

  const aiFindContent = (prompt, provider) =>
    runWithController('aiFindContent', (controller) => controller.aiFindContent(prompt, provider));

  const aiFindContents = (prompt, provider) =>
    runWithController('aiFindContents', (controller) => controller.aiFindContents(prompt, provider));

  const aiFindAndSelect = (prompt, provider) =>
    runWithController('aiFindAndSelect', (controller) => controller.aiFindAndSelect(prompt, provider));

  const aiChange = (config, provider) =>
    runWithController('aiChange', (controller) => controller.aiChange(config, provider));

  const aiGenerateContent = (prompt, provider, streaming = false) =>
    runWithController('aiGenerateContent', (controller) => controller.aiGenerateContent(prompt, provider, streaming));

  const aiRewriteSelection = (instructions, provider, streaming = false) =>
    runWithController('aiRewriteSelection', (controller) =>
      controller.aiRewriteSelection(instructions, provider, streaming),
    );

  return {
    // State
    showAiLayer,
    showAiWriter,
    aiWriterPosition,
    aiLayer,
    aiController: aiControllerRef,

    // Methods
    initAiLayer,
    showAiWriterAtCursor,
    handleAiWriterClose,
    handleAiToolClick,
    aiFindContent,
    aiFindContents,
    aiFindAndSelect,
    aiChange,
    aiGenerateContent,
    aiRewriteSelection,
  };
}
