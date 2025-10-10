import { translateChildNodes } from '@converter/v2/exporter/helpers/translateChildNodes';

/**
 * Translate a document part object node to its XML representation.
 * @param {Object} params - The parameters for translation.
 * @returns {Object} The XML representation of the structured content block.
 */
export function translateDocumentPartObj(params) {
  const { node } = params;
  const { attrs = {} } = node;

  const childContent = translateChildNodes({ ...params, nodes: node.content });

  // We build the sdt node elements here, and re-add passthrough sdtPr node
  const nodeElements = [
    {
      name: 'w:sdtPr',
      elements: [
        {
          name: 'w:id',
          attributes: {
            'w:val': attrs.id,
          },
        },
        {
          name: 'w:docPartObj',
          elements: [
            {
              name: 'w:docPartGallery',
              attributes: {
                'w:val': attrs.docPartGallery,
              },
            },
            ...(attrs.docPartUnique
              ? [
                  {
                    name: 'w:docPartUnique',
                  },
                ]
              : []),
          ],
        },
      ],
    },
    {
      name: 'w:sdtContent',
      elements: childContent,
    },
  ];

  const result = {
    name: 'w:sdt',
    elements: nodeElements,
  };

  return result;
}
