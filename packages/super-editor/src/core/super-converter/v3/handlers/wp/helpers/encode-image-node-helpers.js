import { emuToPixels, rotToDegrees, polygonToObj } from '@converter/helpers.js';
import { carbonCopy } from '@core/utilities/carbonCopy.js';
import { extractStrokeWidth, extractStrokeColor, extractFillColor } from './vector-shape-helpers';

const DRAWING_XML_TAG = 'w:drawing';
const SHAPE_URI = 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape';
const GROUP_URI = 'http://schemas.microsoft.com/office/word/2010/wordprocessingGroup';

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

  if (uri === SHAPE_URI) {
    const shapeMarginOffset = {
      left: positionHValue,
      horizontal: positionHValue,
      top: positionVValue,
    };
    return handleShapeDrawing(params, node, graphicData, size, padding, shapeMarginOffset, anchorData, wrap, isAnchor);
  }

  if (uri === GROUP_URI) {
    const shapeMarginOffset = {
      left: positionHValue,
      horizontal: positionHValue,
      top: positionVValue,
    };
    return handleShapeGroup(params, node, graphicData, size, padding, shapeMarginOffset, anchorData, wrap);
  }

  const picture = graphicData?.elements.find((el) => el.name === 'pic:pic');
  if (!picture || !picture.elements) return null;

  const blipFill = picture.elements.find((el) => el.name === 'pic:blipFill');
  const blip = blipFill?.elements.find((el) => el.name === 'a:blip');
  if (!blip) return null;

  // Check for stretch fill mode
  const stretch = blipFill?.elements.find((el) => el.name === 'a:stretch');
  const fillRect = stretch?.elements.find((el) => el.name === 'a:fillRect');
  const shouldStretch = Boolean(stretch && fillRect);

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
      shouldStretch,
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
 * @param {Object|null} anchorData - Anchor positioning data.
 * @param {Object} wrap - Wrap configuration.
 * @param {boolean} isAnchor - Whether the shape is anchored.
 * @returns {Object|null} A contentBlock node representing the shape, or null when no content exists.
 */
const handleShapeDrawing = (params, node, graphicData, size, padding, marginOffset, anchorData, wrap, isAnchor) => {
  const wsp = graphicData.elements.find((el) => el.name === 'wps:wsp');
  const textBox = wsp.elements.find((el) => el.name === 'wps:txbx');
  const textBoxContent = textBox?.elements?.find((el) => el.name === 'w:txbxContent');

  // eslint-disable-next-line no-unused-vars
  const isGraphicContainer = node.elements.find((el) => el.name === 'wp:docPr');

  const spPr = wsp.elements.find((el) => el.name === 'wps:spPr');
  const prstGeom = spPr?.elements.find((el) => el.name === 'a:prstGeom');
  const shapeType = prstGeom?.attributes['prst'];

  if (shapeType === 'rect' && !textBoxContent) {
    return getRectangleShape(params, spPr, node);
  }

  if (shapeType && !textBoxContent) {
    const result = getVectorShape({ params, node, graphicData, marginOffset, anchorData, wrap, isAnchor });
    if (result) return result;
  }

  if (!textBoxContent) {
    return buildShapePlaceholder(node, size, padding, marginOffset, 'drawing');
  }

  return buildShapePlaceholder(node, size, padding, marginOffset, 'textbox');
};

/**
 * Handles a shape group (wpg:wgp) within a WordprocessingML graphic node.
 *
 * @param {{ nodes: Array }} params - Translator params including the surrounding drawing node.
 * @param {Object} node - The `wp:drawing` or related shape container node.
 * @param {Object} graphicData - The `a:graphicData` node containing the group elements.
 * @param {{ width?: number, height?: number }} size - Group bounding box in pixels.
 * @param {{ top?: number, right?: number, bottom?: number, left?: number }} padding - Distance attributes converted to pixels.
 * @param {{ horizontal?: number, left?: number, top?: number }} marginOffset - Group offsets relative to its anchor.
 * @returns {Object|null} A shapeGroup node representing the group, or null when no content exists.
 */
const handleShapeGroup = (params, node, graphicData, size, padding, marginOffset, anchorData, wrap) => {
  const wgp = graphicData.elements.find((el) => el.name === 'wpg:wgp');
  if (!wgp) {
    return buildShapePlaceholder(node, size, padding, marginOffset, 'group');
  }

  // Extract group properties
  const grpSpPr = wgp.elements.find((el) => el.name === 'wpg:grpSpPr');
  const xfrm = grpSpPr?.elements?.find((el) => el.name === 'a:xfrm');

  // Get group transform data
  const groupTransform = {};
  if (xfrm) {
    const off = xfrm.elements?.find((el) => el.name === 'a:off');
    const ext = xfrm.elements?.find((el) => el.name === 'a:ext');
    const chOff = xfrm.elements?.find((el) => el.name === 'a:chOff');
    const chExt = xfrm.elements?.find((el) => el.name === 'a:chExt');

    if (off) {
      groupTransform.x = emuToPixels(off.attributes?.['x'] || 0);
      groupTransform.y = emuToPixels(off.attributes?.['y'] || 0);
    }
    if (ext) {
      groupTransform.width = emuToPixels(ext.attributes?.['cx'] || 0);
      groupTransform.height = emuToPixels(ext.attributes?.['cy'] || 0);
    }
    if (chOff) {
      groupTransform.childX = emuToPixels(chOff.attributes?.['x'] || 0);
      groupTransform.childY = emuToPixels(chOff.attributes?.['y'] || 0);
      // Store raw EMU values for coordinate transformation
      groupTransform.childOriginXEmu = parseFloat(chOff.attributes?.['x'] || 0);
      groupTransform.childOriginYEmu = parseFloat(chOff.attributes?.['y'] || 0);
    }
    if (chExt) {
      groupTransform.childWidth = emuToPixels(chExt.attributes?.['cx'] || 0);
      groupTransform.childHeight = emuToPixels(chExt.attributes?.['cy'] || 0);
    }
  }

  // Extract all child shapes
  const childShapes = wgp.elements.filter((el) => el.name === 'wps:wsp');
  const shapes = childShapes
    .map((wsp) => {
      const spPr = wsp.elements?.find((el) => el.name === 'wps:spPr');
      if (!spPr) return null;

      // Extract shape kind
      const prstGeom = spPr.elements?.find((el) => el.name === 'a:prstGeom');
      const shapeKind = prstGeom?.attributes?.['prst'];

      // Extract size and transformations
      const shapeXfrm = spPr.elements?.find((el) => el.name === 'a:xfrm');
      const shapeOff = shapeXfrm?.elements?.find((el) => el.name === 'a:off');
      const shapeExt = shapeXfrm?.elements?.find((el) => el.name === 'a:ext');

      // Get raw child coordinates in EMU
      const rawX = shapeOff?.attributes?.['x'] ? parseFloat(shapeOff.attributes['x']) : 0;
      const rawY = shapeOff?.attributes?.['y'] ? parseFloat(shapeOff.attributes['y']) : 0;
      const rawWidth = shapeExt?.attributes?.['cx'] ? parseFloat(shapeExt.attributes['cx']) : 914400;
      const rawHeight = shapeExt?.attributes?.['cy'] ? parseFloat(shapeExt.attributes['cy']) : 914400;

      // Transform from child coordinate space to parent space if group transform exists
      let x, y, width, height;
      if (groupTransform.childWidth && groupTransform.childHeight) {
        // Calculate scale factors
        const scaleX = groupTransform.width / groupTransform.childWidth;
        const scaleY = groupTransform.height / groupTransform.childHeight;

        // Get child origin in EMU (default to 0 if not set)
        const childOriginX = groupTransform.childOriginXEmu || 0;
        const childOriginY = groupTransform.childOriginYEmu || 0;

        // Transform to parent space: ((childPos - childOrigin) * scale) + groupPos
        x = groupTransform.x + emuToPixels((rawX - childOriginX) * scaleX);
        y = groupTransform.y + emuToPixels((rawY - childOriginY) * scaleY);
        width = emuToPixels(rawWidth * scaleX);
        height = emuToPixels(rawHeight * scaleY);
      } else {
        // Fallback: no transformation
        x = emuToPixels(rawX);
        y = emuToPixels(rawY);
        width = emuToPixels(rawWidth);
        height = emuToPixels(rawHeight);
      }
      const rotation = shapeXfrm?.attributes?.['rot'] ? rotToDegrees(shapeXfrm.attributes['rot']) : 0;
      const flipH = shapeXfrm?.attributes?.['flipH'] === '1';
      const flipV = shapeXfrm?.attributes?.['flipV'] === '1';

      // Extract colors
      const style = wsp.elements?.find((el) => el.name === 'wps:style');
      const fillColor = extractFillColor(spPr, style);
      const strokeColor = extractStrokeColor(spPr, style);
      const strokeWidth = extractStrokeWidth(spPr);

      // Get shape ID and name
      const cNvPr = wsp.elements?.find((el) => el.name === 'wps:cNvPr');
      const shapeId = cNvPr?.attributes?.['id'];
      const shapeName = cNvPr?.attributes?.['name'];

      // Extract textbox content if present
      const textBox = wsp.elements?.find((el) => el.name === 'wps:txbx');
      const textBoxContent = textBox?.elements?.find((el) => el.name === 'w:txbxContent');
      let textContent = null;

      if (textBoxContent) {
        // Extract text from all paragraphs in the textbox
        textContent = extractTextFromTextBox(textBoxContent);
      }

      // Extract horizontal alignment from text content (defaults to 'left' if not specified)
      // Note: bodyPr 'anchor' attribute is for vertical alignment (t/ctr/b), not horizontal
      const textAlign = textContent?.horizontalAlign || 'left';

      return {
        shapeType: 'vectorShape',
        attrs: {
          kind: shapeKind,
          x,
          y,
          width,
          height,
          rotation,
          flipH,
          flipV,
          fillColor,
          strokeColor,
          strokeWidth,
          shapeId,
          shapeName,
          textContent,
          textAlign,
        },
      };
    })
    .filter(Boolean);

  const schemaAttrs = {};
  const drawingNode = params.nodes?.[0];
  if (drawingNode?.name === DRAWING_XML_TAG) {
    schemaAttrs.drawingContent = drawingNode;
  }

  const result = {
    type: 'shapeGroup',
    attrs: {
      ...schemaAttrs,
      groupTransform,
      shapes,
      size,
      padding,
      marginOffset,
      anchorData,
      wrap,
      originalAttributes: node?.attributes,
    },
  };

  return result;
};

/**
 * Extracts text content from a textbox
 * @param {Object} textBoxContent - The w:txbxContent element
 * @returns {Object|null} Text content with formatting information
 */
function extractTextFromTextBox(textBoxContent) {
  if (!textBoxContent || !textBoxContent.elements) return null;

  const paragraphs = textBoxContent.elements.filter((el) => el.name === 'w:p');
  const textParts = [];
  let horizontalAlign = null; // Extract from first paragraph with alignment

  paragraphs.forEach((paragraph) => {
    // Extract paragraph alignment (w:jc) if not already found
    if (!horizontalAlign) {
      const pPr = paragraph.elements?.find((el) => el.name === 'w:pPr');
      const jc = pPr?.elements?.find((el) => el.name === 'w:jc');
      if (jc) {
        const jcVal = jc.attributes?.['val'] || jc.attributes?.['w:val'];
        // Map Word alignment values to our format
        if (jcVal === 'left' || jcVal === 'start') horizontalAlign = 'left';
        else if (jcVal === 'right' || jcVal === 'end') horizontalAlign = 'right';
        else if (jcVal === 'center') horizontalAlign = 'center';
      }
    }

    const runs = paragraph.elements?.filter((el) => el.name === 'w:r') || [];
    runs.forEach((run) => {
      const textEl = run.elements?.find((el) => el.name === 'w:t');
      if (textEl && textEl.elements) {
        const text = textEl.elements.find((el) => el.type === 'text');
        if (text) {
          // Extract formatting from run properties
          const rPr = run.elements?.find((el) => el.name === 'w:rPr');
          const formatting = {};

          if (rPr) {
            const bold = rPr.elements?.find((el) => el.name === 'w:b');
            const italic = rPr.elements?.find((el) => el.name === 'w:i');
            const color = rPr.elements?.find((el) => el.name === 'w:color');
            const sz = rPr.elements?.find((el) => el.name === 'w:sz');

            if (bold) formatting.bold = true;
            if (italic) formatting.italic = true;
            if (color) formatting.color = color.attributes?.['val'] || color.attributes?.['w:val'];
            if (sz) formatting.fontSize = parseInt(sz.attributes?.['val'] || sz.attributes?.['w:val'], 10) / 2; // half-points to points
          }

          textParts.push({
            text: text.text,
            formatting,
          });
        }
      }
    });
  });

  if (textParts.length === 0) return null;

  return {
    parts: textParts,
    horizontalAlign: horizontalAlign || 'left', // Default to left if not specified
  };
}

/**
 * Translates a rectangle shape (`a:prstGeom` with `prst="rect"`) into a contentBlock node.
 *
 * @param {Object} params - Parameters object containing the current nodes.
 * @param {Object} node - The `a:spPr` node containing shape properties.
 * @returns {Object} An object of type `contentBlock` with size and optional background color.
 */
const getRectangleShape = (params, spPr, node) => {
  const schemaAttrs = {};

  const drawingNode = params.nodes?.[0];

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
    attrs: {
      ...schemaAttrs,
      originalAttributes: node?.attributes,
    },
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

/**
 * Extracts vector shape data.
 * Parses shape geometry, transformations, and styling information.
 * @param {Object} options - Options
 * @param {Object} options.params - Translator params
 * @param {Object} options.graphicData - The graphicData node
 * @returns {Object|null} A vectorShape node with extracted attributes
 */
export function getVectorShape({ params, node, graphicData, marginOffset, anchorData, wrap, isAnchor }) {
  const schemaAttrs = {};

  const drawingNode = params.nodes?.[0];
  if (drawingNode?.name === 'w:drawing') {
    schemaAttrs.drawingContent = drawingNode;
  }

  const wsp = graphicData.elements?.find((el) => el.name === 'wps:wsp');
  if (!wsp) {
    return null;
  }

  const spPr = wsp.elements?.find((el) => el.name === 'wps:spPr');
  if (!spPr) {
    return null;
  }

  // Extract shape kind
  const prstGeom = spPr.elements?.find((el) => el.name === 'a:prstGeom');
  const shapeKind = prstGeom?.attributes?.['prst'];
  if (!shapeKind) {
    console.warn('Shape kind not found');
  }
  schemaAttrs.kind = shapeKind;

  // Extract size and transformations
  const xfrm = spPr.elements?.find((el) => el.name === 'a:xfrm');
  const extent = xfrm?.elements?.find((el) => el.name === 'a:ext');

  const width = extent?.attributes?.['cx'] ? emuToPixels(extent.attributes['cx']) : 100;
  const height = extent?.attributes?.['cy'] ? emuToPixels(extent.attributes['cy']) : 100;
  const rotation = xfrm?.attributes?.['rot'] ? rotToDegrees(xfrm.attributes['rot']) : 0;
  const flipH = xfrm?.attributes?.['flipH'] === '1';
  const flipV = xfrm?.attributes?.['flipV'] === '1';

  // Extract colors
  const style = wsp.elements?.find((el) => el.name === 'wps:style');
  const fillColor = extractFillColor(spPr, style);
  const strokeColor = extractStrokeColor(spPr, style);
  const strokeWidth = extractStrokeWidth(spPr);

  return {
    type: 'vectorShape',
    attrs: {
      ...schemaAttrs,
      width,
      height,
      rotation,
      flipH,
      flipV,
      fillColor,
      strokeColor,
      strokeWidth,
      marginOffset,
      anchorData,
      wrap,
      isAnchor,
      originalAttributes: node?.attributes,
    },
  };
}
