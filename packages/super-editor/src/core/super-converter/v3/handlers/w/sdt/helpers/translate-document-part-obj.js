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

  // Build sdtPr with passthrough support
  const sdtPr = generateSdtPrForDocPartObj(attrs);

  const nodeElements = [
    sdtPr,
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

/**
 * Generate sdtPr element for document part object with passthrough support.
 * Builds core w:id and w:docPartObj elements, then appends any additional
 * elements from the original sdtPr that are not explicitly managed.
 * @param {Object} attrs - The node attributes
 * @param {string} attrs.id - Document part ID
 * @param {string} attrs.docPartGallery - Gallery type (e.g., "Table of Contents")
 * @param {boolean} attrs.docPartUnique - Whether document part is unique
 * @param {Object} [attrs.sdtPr] - Original sdtPr element for passthrough preservation
 * @returns {Object} The complete sdtPr element with name and elements array
 */
function generateSdtPrForDocPartObj(attrs) {
  const existingDocPartObj = attrs.sdtPr?.elements?.find((el) => el.name === 'w:docPartObj');
  const existingDocPartGallery = existingDocPartObj?.elements?.find((el) => el.name === 'w:docPartGallery')
    ?.attributes?.['w:val'];
  const docPartGallery = attrs.docPartGallery ?? existingDocPartGallery ?? null;
  const id = attrs.id ?? attrs.sdtPr?.elements?.find((el) => el.name === 'w:id')?.attributes?.['w:val'] ?? '';
  // Per OOXML spec: presence of w:docPartUnique element = true, absence = false
  const docPartUnique =
    attrs.docPartUnique ?? existingDocPartObj?.elements?.some((el) => el.name === 'w:docPartUnique') ?? false;

  // If we do not know the gallery type, prefer full passthrough to avoid emitting invalid XML
  if (docPartGallery === null) {
    if (attrs.sdtPr) {
      return attrs.sdtPr;
    }
    return {
      name: 'w:sdtPr',
      elements: [
        {
          name: 'w:id',
          attributes: {
            'w:val': id,
          },
        },
        {
          name: 'w:docPartObj',
          elements: [],
        },
      ],
    };
  }

  // Build the core w:docPartObj element
  const docPartObjElements = [
    {
      name: 'w:docPartGallery',
      attributes: {
        'w:val': docPartGallery,
      },
    },
  ];

  if (docPartUnique) {
    docPartObjElements.push({ name: 'w:docPartUnique' });
  }

  // Start with explicitly managed elements
  const sdtPrElements = [
    {
      name: 'w:id',
      attributes: {
        'w:val': id,
      },
    },
    {
      name: 'w:docPartObj',
      elements: docPartObjElements,
    },
  ];

  // Passthrough: preserve any sdtPr elements not explicitly managed
  if (attrs.sdtPr?.elements && Array.isArray(attrs.sdtPr.elements)) {
    const elementsToExclude = ['w:id', 'w:docPartObj'];
    const passthroughElements = attrs.sdtPr.elements.filter(
      (el) => el && el.name && !elementsToExclude.includes(el.name),
    );
    sdtPrElements.push(...passthroughElements);
  }

  return {
    name: 'w:sdtPr',
    elements: sdtPrElements,
  };
}
