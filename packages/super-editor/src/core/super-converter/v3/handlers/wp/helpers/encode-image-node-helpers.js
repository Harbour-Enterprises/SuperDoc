import { emuToPixels, rotToDegrees, polygonToObj } from '@converter/helpers.js';
import { carbonCopy } from '@core/utilities/carbonCopy.js';

const DRAWING_XML_TAG = 'w:drawing';

/**
 * Encodes image xml into Editor node
 * @param {Object} params
 * @returns {Object|null}
 */
export function handleImageNode(node, params, isAnchor) {
  const { docx, filename } = params;
  const { attributes } = node;
  const padding = {
    top: emuToPixels(attributes['distT']),
    bottom: emuToPixels(attributes['distB']),
    left: emuToPixels(attributes['distL']),
    right: emuToPixels(attributes['distR']),
  };

  const extent = node.elements.find((el) => el.name === 'wp:extent');
  const size = {
    width: emuToPixels(extent?.attributes?.cx),
    height: emuToPixels(extent?.attributes?.cy),
  };

  let transformData = {};
  const effectExtent = node.elements.find((el) => el.name === 'wp:effectExtent');
  if (effectExtent) {
    const sanitizeEmuValue = (value) => {
      if (value === null || value === undefined) return 0;
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : 0;
    };

    transformData.sizeExtension = {
      left: emuToPixels(sanitizeEmuValue(effectExtent.attributes?.['l'])),
      top: emuToPixels(sanitizeEmuValue(effectExtent.attributes?.['t'])),
      right: emuToPixels(sanitizeEmuValue(effectExtent.attributes?.['r'])),
      bottom: emuToPixels(sanitizeEmuValue(effectExtent.attributes?.['b'])),
    };
  }

  const positionHTag = node.elements.find((el) => el.name === 'wp:positionH');
  const positionH = positionHTag?.elements.find((el) => el.name === 'wp:posOffset');
  const positionHValue = emuToPixels(positionH?.elements[0]?.text);
  const hRelativeFrom = positionHTag?.attributes?.relativeFrom;
  const alignH = positionHTag?.elements.find((el) => el.name === 'wp:align')?.elements?.[0]?.text;

  const positionVTag = node.elements.find((el) => el.name === 'wp:positionV');
  const positionV = positionVTag?.elements?.find((el) => el.name === 'wp:posOffset');
  const positionVValue = emuToPixels(positionV?.elements[0]?.text);
  const vRelativeFrom = positionVTag?.attributes?.relativeFrom;
  const alignV = positionVTag?.elements?.find((el) => el.name === 'wp:align')?.elements?.[0]?.text;

  const marginOffset = {
    horizontal: positionHValue,
    top: positionVValue,
  };

  const simplePos = node.elements.find((el) => el.name === 'wp:simplePos');

  // Look for one of <wp:wrapNone>,<wp:wrapSquare>,<wp:wrapThrough>,<wp:wrapTight>,<wp:wrapTopAndBottom>
  const wrapNode = isAnchor
    ? node.elements.find((el) =>
        ['wp:wrapNone', 'wp:wrapSquare', 'wp:wrapThrough', 'wp:wrapTight', 'wp:wrapTopAndBottom'].includes(el.name),
      )
    : null;
  const wrap = isAnchor ? { type: wrapNode?.name.slice(7) || 'None', attrs: {} } : { type: 'Inline' };

  switch (wrap.type) {
    case 'Square':
      if (wrapNode?.attributes?.wrapText) {
        wrap.attrs.wrapText = wrapNode.attributes.wrapText;
      }
      if ('distB' in (wrapNode?.attributes || {})) {
        wrap.attrs.distBottom = emuToPixels(wrapNode.attributes.distB);
      }
      if ('distL' in (wrapNode?.attributes || {})) {
        wrap.attrs.distLeft = emuToPixels(wrapNode.attributes.distL);
      }
      if ('distR' in (wrapNode?.attributes || {})) {
        wrap.attrs.distRight = emuToPixels(wrapNode.attributes.distR);
      }
      if ('distT' in (wrapNode?.attributes || {})) {
        wrap.attrs.distTop = emuToPixels(wrapNode.attributes.distT);
      }
      break;
    case 'Tight':
    case 'Through': {
      if ('distL' in (wrapNode?.attributes || {})) {
        wrap.attrs.distLeft = emuToPixels(wrapNode.attributes.distL);
      }
      if ('distR' in (wrapNode?.attributes || {})) {
        wrap.attrs.distRight = emuToPixels(wrapNode.attributes.distR);
      }
      if ('distT' in (wrapNode?.attributes || {})) {
        wrap.attrs.distTop = emuToPixels(wrapNode.attributes.distT);
      }
      if ('distB' in (wrapNode?.attributes || {})) {
        wrap.attrs.distBottom = emuToPixels(wrapNode.attributes.distB);
      }
      if ('wrapText' in (wrapNode?.attributes || {})) {
        wrap.attrs.wrapText = wrapNode.attributes.wrapText;
      }
      const polygon = wrapNode?.elements?.find((el) => el.name === 'wp:wrapPolygon');
      if (polygon) {
        wrap.attrs.polygon = polygonToObj(polygon);
        if (polygon.attributes?.edited !== undefined) {
          wrap.attrs.polygonEdited = polygon.attributes.edited;
        }
      }
      break;
    }
    case 'TopAndBottom':
      if ('distB' in (wrapNode?.attributes || {})) {
        wrap.attrs.distBottom = emuToPixels(wrapNode.attributes.distB);
      }
      if ('distT' in (wrapNode?.attributes || {})) {
        wrap.attrs.distTop = emuToPixels(wrapNode.attributes.distT);
      }
      break;
    case 'None':
      wrap.attrs.behindDoc = node.attributes?.behindDoc === '1';
      break;
    case 'Inline':
      break;
    default:
      break;
  }

  const docPr = node.elements.find((el) => el.name === 'wp:docPr');

  let anchorData = null;
  if (hRelativeFrom || alignH || vRelativeFrom || alignV) {
    anchorData = {
      hRelativeFrom,
      vRelativeFrom,
      alignH,
      alignV,
    };
  }

  const graphic = node.elements.find((el) => el.name === 'a:graphic');
  const graphicData = graphic?.elements.find((el) => el.name === 'a:graphicData');
  const { uri } = graphicData?.attributes || {};
  const shapeURI = 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape';
  if (!!uri && uri === shapeURI) {
    const shapeMarginOffset = {
      left: positionHValue,
      horizontal: positionHValue,
      top: positionVValue,
    };
    return handleShapeDrawing(params, node, graphicData, size, padding, shapeMarginOffset);
  }

  const picture = graphicData?.elements.find((el) => el.name === 'pic:pic');
  if (!picture || !picture.elements) return null;

  const blipFill = picture.elements.find((el) => el.name === 'pic:blipFill');
  const blip = blipFill?.elements.find((el) => el.name === 'a:blip');
  if (!blip) return null;

  const spPr = picture.elements.find((el) => el.name === 'pic:spPr');
  if (spPr) {
    const xfrm = spPr.elements.find((el) => el.name === 'a:xfrm');
    if (xfrm?.attributes) {
      transformData = {
        ...transformData,
        rotation: rotToDegrees(xfrm.attributes['rot']),
        verticalFlip: xfrm.attributes['flipV'] === '1',
        horizontalFlip: xfrm.attributes['flipH'] === '1',
      };
    }
  }

  const { attributes: blipAttributes = {} } = blip;
  const rEmbed = blipAttributes['r:embed'];
  if (!rEmbed) return null;

  const currentFile = filename || 'document.xml';
  let rels = docx[`word/_rels/${currentFile}.rels`];
  if (!rels) rels = docx[`word/_rels/document.xml.rels`];

  const relationships = rels?.elements.find((el) => el.name === 'Relationships');
  const { elements } = relationships || [];

  const rel = elements?.find((el) => el.attributes['Id'] === rEmbed);
  if (!rel) return null;

  const { attributes: relAttributes } = rel;
  const targetPath = relAttributes['Target'];

  let path = `word/${targetPath}`;

  // Some images may appear out of the word folder
  if (targetPath.startsWith('/word') || targetPath.startsWith('/media')) path = targetPath.substring(1);
  const extension = targetPath.substring(targetPath.lastIndexOf('.') + 1);

  return {
    type: 'image',
    attrs: {
      src: path,
      alt: ['emf', 'wmf'].includes(extension) ? 'Unable to render EMF/WMF image' : docPr?.attributes?.name || 'Image',
      extension,
      id: docPr?.attributes?.id || '',
      title: docPr?.attributes?.descr || 'Image',
      inline: true,
      padding,
      marginOffset,
      size,
      anchorData,
      isAnchor,
      transformData,
      ...(simplePos && {
        simplePos: {
          x: simplePos.attributes.x,
          y: simplePos.attributes.y,
        },
      }),
      wrap,
      ...(wrap.type === 'Square' && wrap.attrs.wrapText
        ? {
            wrapText: wrap.attrs.wrapText,
          }
        : {}),
      wrapTopAndBottom: wrap.type === 'TopAndBottom',
      originalPadding: {
        distT: attributes['distT'],
        distB: attributes['distB'],
        distL: attributes['distL'],
        distR: attributes['distR'],
      },
      originalAttributes: node.attributes,
      rId: relAttributes['Id'],
    },
  };
}

/**
 * Handles a shape drawing within a WordprocessingML graphic node.
 *
 * @param {{ nodes: Array }} params - Translator params including the surrounding drawing node.
 * @param {Object} node - The `wp:drawing` or related shape container node.
 * @param {Object} graphicData - The `a:graphicData` node containing the shape elements.
 * @param {{ width?: number, height?: number }} size - Shape bounding box in pixels.
 * @param {{ top?: number, right?: number, bottom?: number, left?: number }} padding - Distance attributes converted to pixels.
 * @param {{ horizontal?: number, left?: number, top?: number }} marginOffset - Shape offsets relative to its anchor.
 * @returns {Object|null} A contentBlock node representing the shape, or null when no content exists.
 */
const handleShapeDrawing = (params, node, graphicData, size, padding, marginOffset) => {
  const wsp = graphicData.elements.find((el) => el.name === 'wps:wsp');
  const textBox = wsp.elements.find((el) => el.name === 'wps:txbx');
  const textBoxContent = textBox?.elements?.find((el) => el.name === 'w:txbxContent');

  // eslint-disable-next-line no-unused-vars
  const isGraphicContainer = node.elements.find((el) => el.name === 'wp:docPr');

  const spPr = wsp.elements.find((el) => el.name === 'wps:spPr');
  const prstGeom = spPr?.elements.find((el) => el.name === 'a:prstGeom');

  if (!!prstGeom && prstGeom.attributes['prst'] === 'rect' && !textBoxContent) {
    return getRectangleShape(params, spPr);
  }

  if (!textBoxContent) {
    return buildShapePlaceholder(node, size, padding, marginOffset, 'drawing');
  }

  return buildShapePlaceholder(node, size, padding, marginOffset, 'textbox');
};

/**
 * Translates a rectangle shape (`a:prstGeom` with `prst="rect"`) into a contentBlock node.
 *
 * @param {Object} params - Parameters object containing the current nodes.
 * @param {Object} node - The `a:spPr` node containing shape properties.
 * @returns {Object} An object of type `contentBlock` with size and optional background color.
 */
const getRectangleShape = (params, node) => {
  const schemaAttrs = {};

  const [drawingNode] = params.nodes;

  if (drawingNode?.name === DRAWING_XML_TAG) {
    schemaAttrs.drawingContent = drawingNode;
  }

  const xfrm = node.elements.find((el) => el.name === 'a:xfrm');
  const start = xfrm.elements.find((el) => el.name === 'a:off');
  const size = xfrm.elements.find((el) => el.name === 'a:ext');
  const solidFill = node.elements.find((el) => el.name === 'a:solidFill');

  // TODO: We should handle this
  // eslint-disable-next-line no-unused-vars
  const outline = node.elements.find((el) => el.name === 'a:ln');

  const rectangleSize = {
    top: emuToPixels(start.attributes['y']),
    left: emuToPixels(start.attributes['x']),
    width: emuToPixels(size.attributes['cx']),
    height: emuToPixels(size.attributes['cy']),
  };
  schemaAttrs.size = rectangleSize;

  const background = solidFill?.elements[0]?.attributes['val'];

  if (background) {
    schemaAttrs.background = '#' + background;
  }

  return {
    type: 'contentBlock',
    attrs: schemaAttrs,
  };
};

/**
 * Builds a contentBlock placeholder for shapes that we cannot fully translate yet.
 *
 * @param {Object} node - Original shape `wp:drawing` node to snapshot for round-tripping.
 * @param {{ width?: number, height?: number }} size - Calculated size of the shape in pixels.
 * @param {{ top?: number, right?: number, bottom?: number, left?: number }} padding - Padding around the shape in pixels.
 * @param {{ horizontal?: number, left?: number, top?: number }} marginOffset - Offset of the anchored shape relative to its origin in pixels.
 * @param {'drawing'|'textbox'} shapeType - Identifier describing the kind of shape placeholder.
 * @returns {{ type: 'contentBlock', attrs: Object }} Placeholder node that retains the original XML.
 */
const buildShapePlaceholder = (node, size, padding, marginOffset, shapeType) => {
  const attrs = {
    drawingContent: {
      name: DRAWING_XML_TAG,
      elements: [carbonCopy(node)],
    },
    attributes: {
      'data-shape-type': shapeType,
    },
  };

  if (size && (Number.isFinite(size.width) || Number.isFinite(size.height))) {
    attrs.size = {
      ...(Number.isFinite(size.width) ? { width: size.width } : {}),
      ...(Number.isFinite(size.height) ? { height: size.height } : {}),
    };
  }

  if (padding) {
    const paddingData = {};
    if (Number.isFinite(padding.top)) paddingData['data-padding-top'] = padding.top;
    if (Number.isFinite(padding.right)) paddingData['data-padding-right'] = padding.right;
    if (Number.isFinite(padding.bottom)) paddingData['data-padding-bottom'] = padding.bottom;
    if (Number.isFinite(padding.left)) paddingData['data-padding-left'] = padding.left;
    if (Object.keys(paddingData).length) {
      attrs.attributes = {
        ...attrs.attributes,
        ...paddingData,
      };
    }
  }

  if (marginOffset) {
    const offsetData = {};
    const horizontal = Number.isFinite(marginOffset.horizontal)
      ? marginOffset.horizontal
      : Number.isFinite(marginOffset.left)
        ? marginOffset.left
        : undefined;
    if (Number.isFinite(horizontal)) offsetData['data-offset-x'] = horizontal;
    if (Number.isFinite(marginOffset.top)) offsetData['data-offset-y'] = marginOffset.top;
    if (Object.keys(offsetData).length) {
      attrs.attributes = {
        ...attrs.attributes,
        ...offsetData,
      };
    }
  }

  return {
    type: 'contentBlock',
    attrs,
  };
};
