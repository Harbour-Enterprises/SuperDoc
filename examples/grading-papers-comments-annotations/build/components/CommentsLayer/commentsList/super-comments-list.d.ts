/**
 * Comments list renderer (not floating comments)
 *
 * This renders a list of comments into an element, connected to main SuperDoc instance
 */
export class SuperComments {
    constructor(options: any, superdoc: any);
    element: any;
    config: {
        comments: any[];
        element: any;
        commentsStore: any;
    };
    app: import("vue").App<Element>;
    superdoc: any;
    createVueApp(): void;
    container: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}, {}, string, {}, {}, {}, string, import("vue").ComponentProvideOptions>, {}, {}, "", {}, any>;
    close(): void;
    open(): void;
}
//# sourceMappingURL=super-comments-list.d.ts.map