export const PageNumber: Node;
export const TotalPageCount: Node;
export class AutoPageNumberNodeView {
    constructor(node: any, getPos: any, decorations: any, editor: any, htmlAttributes?: {});
    node: any;
    editor: any;
    view: any;
    getPos: any;
    dom: HTMLSpanElement;
    update(node: any): boolean;
    #private;
}
import { Node } from '@core/index.js';
