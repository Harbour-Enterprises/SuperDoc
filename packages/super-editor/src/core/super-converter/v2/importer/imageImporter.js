import { emuToPixels } from '../../helpers.js';

/**
 * @type {import("docxImporter").NodeHandler}
 */
export const handleDrawingNode = (params) => {
  const { nodes, filename } = params;
  if (nodes.length === 0 || nodes[0].name !== 'w:drawing') {
    return { nodes: [], consumed: 0 };
  }
  const node = nodes[0];

  let result;
  const { elements } = node;

  const currentFileName = filename || null;

  // Some images are identified by wp:anchor
  const isAnchor = elements.find((el) => el.name === 'wp:anchor');
  if (isAnchor) result = handleImageImport(elements[0], currentFileName, params);

  // Others, wp:inline
  const inlineImage = elements.find((el) => el.name === 'wp:inline');
  if (inlineImage) result = handleImageImport(inlineImage, currentFileName, params);
  return { nodes: result ? [result] : [], consumed: 1 };
};

export function handleImageImport(node, currentFileName, params) {
  const { docx } = params;
  const { attributes } = node;
  const isAnchor = node.name === 'wp:anchor';
  const behindDoc = attributes.behindDoc === '1' || attributes.behindDoc === 'true';

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

  const picture = graphicData.elements.find((el) => el.name === 'pic:pic');
  if (!picture || !picture.elements) return null;

  const blipFill = picture.elements.find((el) => el.name === 'pic:blipFill');
  const blip = blipFill.elements.find((el) => el.name === 'a:blip');

  const positionHTag = node.elements.find((el) => el.name === 'wp:positionH');
  const positionH = positionHTag?.elements.find((el) => el.name === 'wp:posOffset');
  const positionHValue = emuToPixels(positionH?.elements[0]?.text);

  const positionVTag = node.elements.find((el) => el.name === 'wp:positionV');
  const positionV = positionVTag?.elements.find((el) => el.name === 'wp:posOffset');
  const positionVValue = emuToPixels(positionV?.elements[0]?.text);

  const marginOffset = {
    left: positionHValue,
    top: positionVValue,
  };

  const { attributes: blipAttributes } = blip;
  const rEmbed = blipAttributes['r:embed'];
  const currentFile = currentFileName || 'document.xml';
  let rels = docx[`word/_rels/${currentFile}.rels`];
  if (!rels) rels = docx[`word/_rels/document.xml.rels`];

  const relationships = rels.elements.find((el) => el.name === 'Relationships');
  const { elements } = relationships;

  const rel = elements.find((el) => el.attributes['Id'] === rEmbed);
  const { attributes: relAttributes } = rel;

  const path = `word/${relAttributes['Target']}`;

  return {
    type: 'image',
    attrs: {
      src: path,
      alt: 'Image',
      inline: true,
      padding,
      marginOffset,
      size,
      originalPadding: {
        distT: attributes['distT'],
        distB: attributes['distB'],
        distL: attributes['distL'],
        distR: attributes['distR'],
      },
      rId: relAttributes['Id'],
      isAnchor,
      behindDoc,
    },
  };
}

/**
 * @type {import("docxImporter").NodeHandlerEntry}
 */
export const drawingNodeHandlerEntity = {
  handlerName: 'drawingNodeHandler',
  handler: handleDrawingNode,
};
