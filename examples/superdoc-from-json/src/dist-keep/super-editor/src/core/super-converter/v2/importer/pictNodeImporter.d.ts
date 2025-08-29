export function handleVRectImport({ rect, pNode }: {
    rect: any;
    pNode: any;
}): {
    type: string;
    content: {
        type: string;
        attrs: {
            attributes: any;
            style: string;
            size: {};
            background: any;
            vmlAttributes: {
                hralign: any;
                hrstd: any;
                hr: any;
                stroked: any;
            };
            horizontalRule: boolean;
        };
    }[];
    attrs: {
        spacing: {
            lineSpaceAfter: number;
            lineSpaceBefore: number;
            line: number;
            lineRule: any;
        };
        rsidRDefault: any;
        indent: {
            left: number;
            right: number;
            firstLine: number;
            hanging: number;
        };
    };
};
export function handleShapTextboxImport({ shape, params }: {
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
export function parsePointsToPixels(value: any): any;
export function handlePictNode(params: any): {
    nodes: {
        type: string;
        content: {
            type: string;
            attrs: {
                attributes: any;
                style: string;
                size: {};
                background: any;
                vmlAttributes: {
                    hralign: any;
                    hrstd: any;
                    hr: any;
                    stroked: any;
                };
                horizontalRule: boolean;
            };
        }[];
        attrs: {
            spacing: {
                lineSpaceAfter: number;
                lineSpaceBefore: number;
                line: number;
                lineRule: any;
            };
            rsidRDefault: any;
            indent: {
                left: number;
                right: number;
                firstLine: number;
                hanging: number;
            };
        };
    }[];
    consumed: number;
} | {
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
