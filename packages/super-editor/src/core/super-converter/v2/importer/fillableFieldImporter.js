import { getElementName, parseProperties } from './importerHelpers.js';

export const handleFillableFieldNode = (params) => {
    const { nodes } = params;

    if (!nodes.length) return { nodes: [], consumed: 0 };
    const node = nodes[0];

    const { attributes, elements = [], marks = [] } = parseProperties(node);

    // We expect the node to have a fillable label as text
    let label = '';
    if (elements.length === 1 && typeof elements[0].text === 'string') {
        label = elements[0].text;
    } else if (typeof node.text === 'string') {
        label = node.text;
    } else {
        return { nodes: [], consumed: 0 };
    }

    return {
        nodes: [
            {
                type: 'fillableField',
                attrs: {
                    label,
                    ...(attributes || {}),
                },
                marks,
            },
        ],
        consumed: 1,
    };
};

/**
 * @type {import("docxImporter").NodeHandlerEntry}
 */
export const fillableFieldNodeHandlerEntity = {
    handlerName: 'fillableFieldNodeHandler',
    handler: handleFillableFieldNode,
};