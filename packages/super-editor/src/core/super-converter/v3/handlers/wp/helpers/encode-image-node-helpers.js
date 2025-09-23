import { emuToPixels, rotToDegrees } from '@converter/helpers.js';

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
    width: emuToPixels(extent.attributes?.cx),
    height: emuToPixels(extent.attributes?.cy),
  };

  const graphic = node.elements.find((el) => el.name === 'a:graphic');
  const graphicData = graphic.elements.find((el) => el.name === 'a:graphicData');
  const { uri } = graphicData?.attributes || {};
  const shapeURI = 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape';
  if (!!uri && uri === shapeURI) {
    return handleShapeDrawing(params, node, graphicData);
  }

  const picture = graphicData.elements.find((el) => el.name === 'pic:pic');
  if (!picture || !picture.elements) return null;

  const blipFill = picture.elements.find((el) => el.name === 'pic:blipFill');
  const blip = blipFill.elements.find((el) => el.name === 'a:blip');

  const spPr = picture.elements.find((el) => el.name === 'pic:spPr');
  let transformData = {};
  if (spPr) {
    const xfrm = spPr.elements.find((el) => el.name === 'a:xfrm');
    if (xfrm?.attributes) {
      transformData = {
        rotation: rotToDegrees(xfrm.attributes['rot']),
        verticalFlip: xfrm.attributes['flipV'] === '1',
        horizontalFlip: xfrm.attributes['flipH'] === '1',
      };
    }
  }

  const effectExtent = node.elements.find((el) => el.name === 'wp:effectExtent');
  if (effectExtent) {
    const sanitizeEmuValue = (value) => {
      if (value === null || value === undefined) return 0;
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : 0;
    };

    transformData.sizeExtension = {
      left: emuToPixels(sanitizeEmuValue(effectExtent.attributes['l'])),
      top: emuToPixels(sanitizeEmuValue(effectExtent.attributes['t'])),
      right: emuToPixels(sanitizeEmuValue(effectExtent.attributes['r'])),
      bottom: emuToPixels(sanitizeEmuValue(effectExtent.attributes['b'])),
    };
  }

  const positionHTag = node.elements.find((el) => el.name === 'wp:positionH');
  const positionH = positionHTag?.elements.find((el) => el.name === 'wp:posOffset');
  const positionHValue = emuToPixels(positionH?.elements[0]?.text);
  const hRelativeFrom = positionHTag?.attributes.relativeFrom;
  const alignH = positionHTag?.elements.find((el) => el.name === 'wp:align')?.elements[0]?.text;

  const positionVTag = node.elements.find((el) => el.name === 'wp:positionV');
  const positionV = positionVTag?.elements?.find((el) => el.name === 'wp:posOffset');
  const positionVValue = emuToPixels(positionV?.elements[0]?.text);
  const vRelativeFrom = positionVTag?.attributes.relativeFrom;
  const alignV = positionVTag?.elements?.find((el) => el.name === 'wp:align')?.elements[0]?.text;

  const simplePos = node.elements.find((el) => el.name === 'wp:simplePos');
  const wrapSquare = node.elements.find((el) => el.name === 'wp:wrapSquare');
  const wrapTopAndBottom = node.elements.find((el) => el.name === 'wp:wrapTopAndBottom');

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

  const marginOffset = {
    left: positionHValue,
    top: positionVValue,
  };

  const { attributes: blipAttributes = {} } = blip;
  const rEmbed = blipAttributes['r:embed'];
  if (!rEmbed) return null;

  const currentFile = filename || 'document.xml';
  let rels = docx[`word/_rels/${currentFile}.rels`];
  if (!rels) rels = docx[`word/_rels/document.xml.rels`];

  const relationships = rels.elements.find((el) => el.name === 'Relationships');
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
      alt: ['emf', 'wmf'].includes(extension) ? 'Unable to render EMF/WMF image' : docPr?.attributes.name || 'Image',
      extension,
      id: docPr?.attributes.id || '',
      title: docPr?.attributes.descr || 'Image',
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
      ...(wrapSquare && {
        wrapText: wrapSquare.attributes.wrapText,
      }),
      wrapTopAndBottom: !!wrapTopAndBottom,
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
 
 * @param {Object} params - Parameters object.
 * @param {Object} node - The `wp:drawing` node or similar containing the shape.
 * @param {Object} graphicData - The `a:graphicData` node containing the shape elements.
 * @returns {Object|null} The translated node or contentBlock, or null if no content exists.
 */
const handleShapeDrawing = (params, node, graphicData) => {
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
    return null;
  }

  const { nodeListHandler } = params;
  const translatedElement = nodeListHandler.handler({
    ...params,
    node: textBoxContent.elements[0],
    nodes: textBoxContent.elements,
    path: [...(params.path || []), textBoxContent],
  });

  return translatedElement[0];
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

  if (drawingNode?.name === 'w:drawing') {
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
