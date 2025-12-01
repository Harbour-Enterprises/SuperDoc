import { Editor } from '../Editor.js';
import type { EditorOptions } from '../types/EditorConfig.js';
import type { ListDefinitionsPayload } from '../types/EditorEvents.js';

/**
 * Creates a linked child editor based on the current editor.
 * This function checks if the current editor is already a child editor,
 * and if not, it creates a new editor instance with the specified options.
 * The new editor will have pagination disabled and will link to the parent editor's list definitions change handler.
 */
export const createLinkedChildEditor = (currentEditor: Editor, options: Partial<EditorOptions> = {}): Editor | null => {
  if (currentEditor.options.isChildEditor) {
    return null;
  }

  const editorOptions = {
    ...currentEditor.options,
    pagination: false,
    suppressDefaultDocxStyles: true,
    ydoc: null,
    collaborationProvider: null,
    fileSource: null,
    initialState: null,
    documentId: null,
    isCommentsEnabled: false,
    isNewFile: false,
    fragment: null,
    onCreate: () => null,
    onListDefinitionsChange: linkListDefinitionsChange,

    // Options overrides
    ...options,
    isChildEditor: true,
    parentEditor: currentEditor,
  } as Partial<EditorOptions>;

  const editor = new Editor(editorOptions);

  return editor;
};

/**
 * Default handler for when the list definitions change in a linked child editor.
 * This function updates the parent editor's converter with the new numbering definitions
 * and dispatches a transaction to update the list item node views.
 */
const linkListDefinitionsChange = (params: ListDefinitionsPayload): void => {
  const { editor, numbering } = params;
  if (!editor || !(editor instanceof Editor)) return;
  const { parentEditor } = editor.options;
  if (!parentEditor) return;

  const { converter: parentConverter } = parentEditor;
  if (!parentConverter) return;

  parentConverter.numbering = numbering;

  const { tr } = parentEditor.state;
  const { dispatch } = parentEditor.view;
  tr.setMeta('updatedListItemNodeViews', true);
  dispatch(tr);
};
