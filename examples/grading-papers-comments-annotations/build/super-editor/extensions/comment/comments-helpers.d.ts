export function removeCommentsById({ commentId, state, tr, dispatch }: {
    commentId: string;
}): void;
export function getCommentPositionsById(commentId: string, doc: import("prosemirror-model").Node): any[];
export function prepareCommentsForExport(doc: import("prosemirror-model").Node, tr: import("prosemirror-state").Transaction, schema: import("prosemirror-model").Schema, comments?: any): void;
export function getPreparedComment(attrs: any): any;
export function prepareCommentsForImport(doc: import("prosemirror-model").Node, tr: import("prosemirror-state").Transaction, schema: import("prosemirror-model").Schema, converter: any): void;
export function translateFormatChangesToEnglish(attrs?: any): string;
export function getHighlightColor({ activeThreadId, threadId, isInternal, editor }: {
    activeThreadId: string;
    threadId: string;
    isInternal: boolean;
    editor: EditorView;
}): string;
//# sourceMappingURL=comments-helpers.d.ts.map