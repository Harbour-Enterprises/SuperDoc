export function handleShapTextboxImport({ pict, pNode, shape, params }: {
    pict: any;
    pNode: any;
    shape: any;
    params: any;
}): {
    type: string;
    attrs: {
        attributes: any;
        fillcolor: any;
        style: string;
        wrapAttributes: any;
    };
    content: {
        type: string;
        attrs: {
            attributes: any;
        };
        content: any;
    }[];
};
export function handlePictNode(params: any): {
    nodes: {
        type: string;
        attrs: {
            attributes: any;
            fillcolor: any;
            style: string;
            wrapAttributes: any;
        };
        content: {
            type: string;
            attrs: {
                attributes: any;
            };
            content: any;
        }[];
    }[];
    consumed: number;
};
export namespace pictNodeHandlerEntity {
    export let handlerName: string;
    export { handlePictNode as handler };
}
//# sourceMappingURL=pictNodeImporter.d.ts.map