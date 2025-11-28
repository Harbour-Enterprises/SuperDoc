import { ref, reactive, type Ref, type UnwrapNestedRefs } from 'vue';
import type { Editor } from '../core/types';
import type { EditorView } from 'prosemirror-view';

/**
 * Position coordinates for the AI writer interface
 */
export interface AiWriterPosition {
  /** Top position in CSS units */
  top: number | string;
  /** Left position in CSS units */
  left: number | string;
}

/**
 * Configuration options for the useAi composable
 */
export interface UseAiOptions {
  /** Ref to the active editor instance */
  activeEditorRef: Ref<Editor | null>;
}

/**
 * Return type of the useAi composable
 */
export interface UseAiReturn {
  /** Whether the AI layer is visible */
  showAiLayer: Ref<boolean>;
  /** Whether the AI writer is visible */
  showAiWriter: Ref<boolean>;
  /** Position of the AI writer interface */
  aiWriterPosition: UnwrapNestedRefs<AiWriterPosition>;
  /** Reference to the AI layer element */
  aiLayer: Ref<HTMLElement | null>;
  /** Initialize the AI layer */
  initAiLayer: (value?: boolean) => void;
  /** Show the AI writer at the current cursor position */
  showAiWriterAtCursor: () => void;
  /** Handle closing the AI writer */
  handleAiWriterClose: () => void;
  /** Handle AI tool click */
  handleAiToolClick: () => void;
}

/**
 * Vue composable for managing AI layer and AI writer functionality
 *
 * This composable provides comprehensive AI interface management including:
 * - AI layer visibility control
 * - AI writer positioning at cursor location
 * - Editor integration for AI marks and commands
 * - Error handling for editor state
 *
 * @param options - Configuration options including active editor ref
 * @returns AI state and methods
 *
 * @example
 * const editorRef = ref<Editor | null>(null);
 * const ai = useAi({ activeEditorRef: editorRef });
 *
 * ai.initAiLayer(true);
 * ai.showAiWriterAtCursor();
 */
export function useAi({ activeEditorRef }: UseAiOptions): UseAiReturn {
  // Shared state
  const showAiLayer = ref<boolean>(false);
  const showAiWriter = ref<boolean>(false);
  const aiWriterPosition = reactive<AiWriterPosition>({ top: 0, left: 0 });
  const aiLayer = ref<HTMLElement | null>(null);

  /**
   * Show the AI writer at the current cursor position
   *
   * This method positions the AI writer interface near the current cursor
   * or selection in the editor. It handles various edge cases including:
   * - Invalid editor states
   * - Empty or invalid selections
   * - DOM selection fallbacks
   * - Error recovery with fallback positioning
   */
  const showAiWriterAtCursor = (): void => {
    const editor = activeEditorRef.value;
    if (!editor || !('isDestroyed' in editor) || editor.isDestroyed) {
      console.error('[useAi] Editor not available');
      return;
    }

    try {
      // Get the current cursor position
      if (!('view' in editor)) {
        console.error('[useAi] Editor view not available');
        return;
      }
      const view = editor.view as EditorView;
      const { selection } = view.state;

      // If we have selected text, add AI highlighting
      if (!selection.empty) {
        // Add the ai mark to the document
        if ('commands' in editor && editor.commands && 'insertAiMark' in editor.commands) {
          editor.commands.insertAiMark();
        }
      }

      let coords: { top: number; left: number };
      try {
        // Try to get coordinates from the selection head
        coords = view.coordsAtPos(selection.$head.pos);
      } catch {
        // Fallback to using the DOM selection if ProseMirror position is invalid
        const domSelection = window.getSelection();
        if (domSelection && domSelection.rangeCount > 0) {
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
        const currentEditor = activeEditorRef.value;
        if (currentEditor && 'view' in currentEditor) {
          const editorView = currentEditor.view as EditorView;
          const editorDom = editorView.dom;
          const rect = editorDom.getBoundingClientRect();
          aiWriterPosition.top = rect.top + 100 + 'px';
          aiWriterPosition.left = rect.left + 100 + 'px';
          showAiWriter.value = true;
        }
      } catch (e) {
        console.error('[useAi] Failed to get fallback position:', e);
      }
    }
  };

  /**
   * Handle closing the AI writer
   *
   * This method hides the AI writer interface when the user closes it
   * or completes their AI interaction.
   */
  const handleAiWriterClose = (): void => {
    showAiWriter.value = false;
  };

  /**
   * Initialize the AI layer
   *
   * This method controls the visibility of the AI layer overlay.
   *
   * @param value - Whether to show the AI layer (default: true)
   */
  const initAiLayer = (value = true): void => {
    showAiLayer.value = value;
  };

  /**
   * Handle tool click for AI functionality
   *
   * This method is called when the AI tool is clicked in the toolbar.
   * It adds an AI mark to the document and displays the AI writer
   * at the current cursor position.
   */
  const handleAiToolClick = (): void => {
    // Add the ai mark to the document
    const editor = activeEditorRef.value;
    if (!editor || !('isDestroyed' in editor) || editor.isDestroyed) {
      console.error('[useAi] Editor not available');
      return;
    }
    if ('commands' in editor && editor.commands && 'insertAiMark' in editor.commands) {
      editor.commands.insertAiMark();
    }
    // Show the AI writer at the cursor position
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
    showAiWriterAtCursor,
    handleAiWriterClose,
    handleAiToolClick,
  };
}
