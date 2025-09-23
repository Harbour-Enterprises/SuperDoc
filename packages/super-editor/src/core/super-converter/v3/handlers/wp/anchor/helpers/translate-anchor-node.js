import { translateImageNode } from '@converter/v3/handlers/wp/helpers/decode-image-node-helpers.js';
import { pixelsToEmu } from '@converter/helpers.js';

/**
 * Translates anchor image
 * @param {Object} params - The parameters for translation.
 * @returns {Object} The XML representation.
 */
export function translateAnchorNode(params) {
  const { attrs } = params.node;
  const anchorElements = [];
  const wrapElements = [];

  if (attrs.simplePos) {
    anchorElements.push({
      name: 'wp:simplePos',
      attributes: {
        x: 0,
        y: 0,
      },
    });
  }

  if (attrs.anchorData) {
    const hElements = [];
    if (attrs.marginOffset.left !== undefined) {
      hElements.push({
        name: 'wp:posOffset',
        elements: [{ type: 'text', text: pixelsToEmu(attrs.marginOffset.left).toString() }],
      });
    }
    if (attrs.anchorData.alignH) {
      hElements.push({
        name: 'wp:align',
        elements: [{ type: 'text', text: attrs.anchorData.alignH }],
      });
    }
    anchorElements.push({
      name: 'wp:positionH',
      attributes: { relativeFrom: attrs.anchorData.hRelativeFrom },
      ...(hElements.length && { elements: hElements }),
    });

    const vElements = [];
    if (attrs.marginOffset.top !== undefined) {
      vElements.push({
        name: 'wp:posOffset',
        elements: [{ type: 'text', text: pixelsToEmu(attrs.marginOffset.top).toString() }],
      });
    }
    if (attrs.anchorData.alignV) {
      vElements.push({
        name: 'wp:align',
        elements: [{ type: 'text', text: attrs.anchorData.alignV }],
      });
    }

    anchorElements.push({
      name: 'wp:positionV',
      attributes: { relativeFrom: attrs.anchorData.vRelativeFrom },
      ...(vElements.length && { elements: vElements }),
    });
  }

  if (attrs.wrapText) {
    wrapElements.push({
      name: 'wp:wrapSquare',
      attributes: {
        wrapText: attrs.wrapText,
      },
    });
  }

  if (attrs.wrapTopAndBottom) {
    wrapElements.push({
      name: 'wp:wrapTopAndBottom',
    });
  }

  // Important: wp:anchor will break if no wrapping is specified. We need to use wrapNone.
  if (!wrapElements.length) {
    wrapElements.push({
      name: 'wp:wrapNone',
    });
  }

  const nodeElements = translateImageNode(params);

  const inlineAttrs = {
    ...nodeElements.attributes,
    simplePos: attrs.originalAttributes?.simplePos,
    relativeHeight: 1,
    behindDoc: attrs.originalAttributes?.behindDoc,
    locked: attrs.originalAttributes?.locked,
    layoutInCell: attrs.originalAttributes?.layoutInCell,
    allowOverlap: attrs.originalAttributes?.allowOverlap,
  };

  const effectIndex = nodeElements.elements.findIndex((el) => el.name === 'wp:effectExtent');
  const elementsWithWrap = [
    ...nodeElements.elements.slice(0, effectIndex + 1),
    ...wrapElements,
    ...nodeElements.elements.slice(effectIndex + 1),
  ];

  return {
    name: 'wp:anchor',
    attributes: inlineAttrs,
    elements: [...anchorElements, ...elementsWithWrap],
  };
}
