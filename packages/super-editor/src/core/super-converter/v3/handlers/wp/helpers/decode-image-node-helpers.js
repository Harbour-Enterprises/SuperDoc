import { emuToPixels, pixelsToEmu } from '@converter/helpers.js';
import { getFallbackImageNameFromDataUri, sanitizeDocxMediaName } from '@converter/helpers/mediaHelpers.js';
import { prepareTextAnnotation } from '@converter/v3/handlers/w/sdt/helpers/translate-field-annotation.js';
import { generateDocxRandomId } from '@core/helpers/index.js';

/**
 * Decodes image into export XML
 * @typedef {Object} ExportParams
 * @property {Object} node JSON node to translate (from PM schema)
 * @property {Object} bodyNode The stored body node to restore, if available
 * @property {Object[]} relationships The relationships to add to the document
 * @returns {Object} The XML representation.
 */

export const translateImageNode = (params) => {
  const {
    node: { attrs = {} },
    tableCell,
    imageSize,
  } = params;

  let imageId = attrs.rId;

  const src = attrs.src || attrs.imageSrc;
  const { originalWidth, originalHeight } = getPngDimensions(src);

  let imageName;
  if (params.node.type === 'image') {
    if (src?.startsWith('data:')) {
      imageName = getFallbackImageNameFromDataUri(src);
    } else {
      imageName = src?.split('/').pop();
    }
  } else {
    imageName = attrs.fieldId;
  }
  imageName = sanitizeDocxMediaName(imageName);

  let size = attrs.size
    ? {
        w: pixelsToEmu(attrs.size.width),
        h: pixelsToEmu(attrs.size.height),
      }
    : imageSize;

  if (originalWidth && originalHeight) {
    const boxWidthPx = emuToPixels(size.w);
    const boxHeightPx = emuToPixels(size.h);
    const { scaledWidth, scaledHeight } = getScaledSize(originalWidth, originalHeight, boxWidthPx, boxHeightPx);
    size = {
      w: pixelsToEmu(scaledWidth),
      h: pixelsToEmu(scaledHeight),
    };
  }

  if (tableCell) {
    // Image inside tableCell
    const colwidthSum = tableCell.attrs.colwidth.reduce((acc, curr) => acc + curr, 0);
    const leftMargin = tableCell.attrs.cellMargins?.left || 8;
    const rightMargin = tableCell.attrs.cellMargins?.right || 8;
    const maxWidthEmu = pixelsToEmu(colwidthSum - (leftMargin + rightMargin));
    const { width: w, height: h } = resizeKeepAspectRatio(size.w, size.h, maxWidthEmu);
    if (w && h) size = { w, h };
  }

  if (params.node.type === 'image' && !imageId) {
    const path = src?.split('word/')[1];
    imageId = addNewImageRelationship(params, path);
  } else if (params.node.type === 'fieldAnnotation' && !imageId) {
    const type = src?.split(';')[0].split('/')[1];
    if (!type) {
      return prepareTextAnnotation(params);
    }

    const sanitizedHash = sanitizeDocxMediaName(attrs.hash, generateDocxRandomId(4));
    const fileName = `${imageName}_${sanitizedHash}.${type}`;
    const relationshipTarget = `media/${fileName}`;
    const packagePath = `word/${relationshipTarget}`;

    imageId = addNewImageRelationship(params, relationshipTarget);
    params.media[packagePath] = src;
  }

  const inlineAttrs = attrs.originalPadding || {
    distT: 0,
    distB: 0,
    distL: 0,
    distR: 0,
  };

  const drawingXmlns = 'http://schemas.openxmlformats.org/drawingml/2006/main';
  const pictureXmlns = 'http://schemas.openxmlformats.org/drawingml/2006/picture';

  return {
    attributes: inlineAttrs,
    elements: [
      {
        name: 'wp:extent',
        attributes: {
          cx: size.w,
          cy: size.h,
        },
      },
      {
        name: 'wp:effectExtent',
        attributes: {
          l: 0,
          t: 0,
          r: 0,
          b: 0,
        },
      },
      {
        name: 'wp:docPr',
        attributes: {
          id: attrs.id || 0,
          name: attrs.alt || `Picture ${imageName}`,
        },
      },
      {
        name: 'wp:cNvGraphicFramePr',
        elements: [
          {
            name: 'a:graphicFrameLocks',
            attributes: {
              'xmlns:a': drawingXmlns,
              noChangeAspect: 1,
            },
          },
        ],
      },
      {
        name: 'a:graphic',
        attributes: { 'xmlns:a': drawingXmlns },
        elements: [
          {
            name: 'a:graphicData',
            attributes: { uri: pictureXmlns },
            elements: [
              {
                name: 'pic:pic',
                attributes: { 'xmlns:pic': pictureXmlns },
                elements: [
                  {
                    name: 'pic:nvPicPr',
                    elements: [
                      {
                        name: 'pic:cNvPr',
                        attributes: {
                          id: attrs.id || 0,
                          name: attrs.title || `Picture ${imageName}`,
                        },
                      },
                      {
                        name: 'pic:cNvPicPr',
                        elements: [
                          {
                            name: 'a:picLocks',
                            attributes: {
                              noChangeAspect: 1,
                              noChangeArrowheads: 1,
                            },
                          },
                        ],
                      },
                    ],
                  },
                  {
                    name: 'pic:blipFill',
                    elements: [
                      {
                        name: 'a:blip',
                        attributes: {
                          'r:embed': imageId,
                        },
                      },
                      {
                        name: 'a:stretch',
                        elements: [{ name: 'a:fillRect' }],
                      },
                    ],
                  },
                  {
                    name: 'pic:spPr',
                    attributes: {
                      bwMode: 'auto',
                    },
                    elements: [
                      {
                        name: 'a:xfrm',
                        elements: [
                          {
                            name: 'a:ext',
                            attributes: {
                              cx: size.w,
                              cy: size.h,
                            },
                          },
                          {
                            name: 'a:off',
                            attributes: {
                              x: 0,
                              y: 0,
                            },
                          },
                        ],
                      },
                      {
                        name: 'a:prstGeom',
                        attributes: { prst: 'rect' },
                        elements: [{ name: 'a:avLst' }],
                      },
                      {
                        name: 'a:noFill',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
};

function getPngDimensions(base64) {
  if (!base64) return {};

  const type = base64.split(';')[0].split('/')[1];
  if (!base64 || type !== 'png') {
    return {
      originalWidth: undefined,
      originalHeight: undefined,
    };
  }

  let header = base64.split(',')[1].slice(0, 50);
  let uint8 = Uint8Array.from(atob(header), (c) => c.charCodeAt(0));
  let dataView = new DataView(uint8.buffer, 0, 28);

  return {
    originalWidth: dataView.getInt32(16),
    originalHeight: dataView.getInt32(20),
  };
}

function getScaledSize(originalWidth, originalHeight, maxWidth, maxHeight) {
  let scaledWidth = originalWidth;
  let scaledHeight = originalHeight;

  // Calculate aspect ratio
  let ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);

  // Scale dimensions
  scaledWidth = Math.round(scaledWidth * ratio);
  scaledHeight = Math.round(scaledHeight * ratio);

  return { scaledWidth, scaledHeight };
}

function resizeKeepAspectRatio(width, height, maxWidth) {
  if (width > maxWidth) {
    let scale = maxWidth / width;
    let newHeight = Math.round(height * scale);
    return { width: maxWidth, height: newHeight };
  }
  return { width, height };
}

/**
 * Create a new image relationship and add it to the relationships array
 *
 * @param {ExportParams} params
 * @param {string} imagePath The path to the image
 * @returns {string} The new relationship ID
 */
function addNewImageRelationship(params, imagePath) {
  const newId = 'rId' + generateDocxRandomId();
  const newRel = {
    type: 'element',
    name: 'Relationship',
    attributes: {
      Id: newId,
      Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
      Target: imagePath,
    },
  };
  params.relationships.push(newRel);
  return newId;
}
