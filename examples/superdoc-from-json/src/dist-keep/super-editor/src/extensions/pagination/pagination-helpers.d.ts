export const PaginationPluginKey: PluginKey<any>;
export function initPaginationData(editor: SuperEditor): any;
export function createHeaderFooterEditor({ editor, data, editorContainer, appendToBody, sectionId, type, availableHeight, currentPageNumber, }: {
    editor: any;
    data: any;
    editorContainer: any;
    appendToBody?: boolean;
    sectionId: any;
    type: any;
    availableHeight: any;
    currentPageNumber: any;
}): SuperEditor;
export function broadcastEditorEvents(editor: any, sectionEditor: any): void;
export function toggleHeaderFooterEditMode({ editor, focusedSectionEditor, isEditMode, documentMode }: {
    editor: any;
    focusedSectionEditor: any;
    isEditMode: any;
    documentMode: any;
}): void;
export function onHeaderFooterDataUpdate({ editor, transaction }: {
    editor: any;
    transaction: any;
}, mainEditor: any, sectionId: any, type: any): Promise<void>;
import { PluginKey } from 'prosemirror-state';
import { Editor as SuperEditor } from '@core/Editor.js';
