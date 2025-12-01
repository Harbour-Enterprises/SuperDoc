import type { Editor as SuperEditor } from '@core/Editor.js';

export interface CreateHeaderFooterEditorParams {
  editor: SuperEditor;
  data: unknown;
  editorContainer: HTMLDivElement;
  appendToBody?: boolean;
  sectionId?: string;
  type?: string;
  availableHeight?: number;
  currentPageNumber?: number;
}

export interface OnHeaderFooterDataUpdateParams {
  editor: SuperEditor;
  transaction?: { selection?: unknown };
}

export function createHeaderFooterEditor(params: CreateHeaderFooterEditorParams): SuperEditor;
export function onHeaderFooterDataUpdate(
  params: OnHeaderFooterDataUpdateParams,
  mainEditor: SuperEditor,
  sectionId?: string,
  type?: string,
): Promise<void>;
