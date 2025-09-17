export function refreshAllListItemNodeViews(): void;
export class ListItemNodeView {
    constructor(node: any, getPos: any, decorations: any, editor: any);
    node: any;
    editor: any;
    decorations: any;
    view: any;
    getPos: any;
    dom: HTMLLIElement;
    numberingDOM: HTMLSpanElement;
    contentDOM: HTMLDivElement;
    refreshIndentStyling(): void;
    handleNumberingClick: (event: any) => void;
    update(node: any, decorations: any): void;
    destroy(): void;
    #private;
}
export function getVisibleIndent(stylePpr: DocxNode, numDefPpr: DocxNode, inlineIndent: any): IndentObject;
export type IndentObject = {
    /**
     * - The left indent value
     */
    left?: number;
    /**
     * - The right indent value
     */
    right?: number;
    /**
     * - The first line indent value
     */
    firstLine?: number;
    /**
     * - The hanging indent value
     */
    hanging?: number;
};
//# sourceMappingURL=ListItemNodeView.d.ts.map