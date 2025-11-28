import { computed, type ComputedRef, type Ref } from 'vue';
import type { Editor } from '../core/types';

/**
 * Return type of the useSelectedText composable
 */
export interface UseSelectedTextReturn {
  /** The currently selected text from the editor */
  selectedText: ComputedRef<string>;
}

/**
 * Vue composable to get the currently selected text from an editor
 *
 * This composable provides a reactive computed property that returns the
 * text currently selected in the editor. It automatically updates when
 * the editor selection changes.
 *
 * @param editorRef - Ref to the editor instance
 * @returns An object containing the selected text as a computed property
 *
 * @example
 * const editorRef = ref<Editor | null>(null);
 * const { selectedText } = useSelectedText(editorRef);
 * console.log(selectedText.value); // Selected text or empty string
 */
export function useSelectedText(editorRef: Ref<Editor | null>): UseSelectedTextReturn {
  // Create a computed property that will update when the editor selection changes
  const selectedText = computed<string>(() => {
    const editor = editorRef.value;
    if (!editor || !editor.state) return '';

    return editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ');
  });

  return {
    selectedText,
  };
}
