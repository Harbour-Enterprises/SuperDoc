import { translateImageNode } from '@converter/v3/handlers/wp/helpers/decode-image-node-helpers.js';
import { pixelsToEmu, objToPolygon } from '@converter/helpers.js';

/**
 * Translates anchor image
 * @param {Object} params - The parameters for translation.
 * @returns {Object} The XML representation.
 */
export function translateAnchorNode(params) {
  const { attrs } = params.node;
  const anchorElements = [];

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
    if (attrs.marginOffset.horizontal !== undefined) {
      hElements.push({
        name: 'wp:posOffset',
        elements: [{ type: 'text', text: pixelsToEmu(attrs.marginOffset.horizontal).toString() }],
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

  const nodeElements = translateImageNode(params);

  const inlineAttrs = {
    ...nodeElements.attributes,
    simplePos: attrs.originalAttributes?.simplePos,
    relativeHeight: 1,
    locked: attrs.originalAttributes?.locked,
    layoutInCell: attrs.originalAttributes?.layoutInCell,
    allowOverlap: attrs.originalAttributes?.allowOverlap,
  };

  const wrapElement = {
    name: `wp:wrap${attrs.wrap?.type || 'None'}`, // Important: wp:anchor will break if no wrapping is specified. We need to use wrapNone.
  };
  switch (attrs.wrap?.type) {
    case 'Square':
      wrapElement.attributes = {
        wrapText: attrs.wrap.attrs.wrapText,
      };
      if ('distBottom' in (attrs.wrap.attrs || {})) {
        wrapElement.attributes.distB = pixelsToEmu(attrs.wrap.attrs.distBottom);
      }
      if ('distLeft' in (attrs.wrap.attrs || {})) {
        wrapElement.attributes.distL = pixelsToEmu(attrs.wrap.attrs.distLeft);
      }
      if ('distRight' in (attrs.wrap.attrs || {})) {
        wrapElement.attributes.distR = pixelsToEmu(attrs.wrap.attrs.distRight);
      }
      if ('distTop' in (attrs.wrap.attrs || {})) {
        wrapElement.attributes.distT = pixelsToEmu(attrs.wrap.attrs.distTop);
      }
      break;
    case 'TopAndBottom': {
      const attributes = {};
      let hasKeys = false;
      if ('distBottom' in (attrs.wrap.attrs || {})) {
        attributes.distB = pixelsToEmu(attrs.wrap.attrs.distBottom);
        hasKeys = true;
      }
      if ('distTop' in (attrs.wrap.attrs || {})) {
        attributes.distT = pixelsToEmu(attrs.wrap.attrs.distTop);
        hasKeys = true;
      }
      if (hasKeys) {
        wrapElement.attributes = attributes;
      }
      break;
    }
    case 'Through':
    case 'Tight': {
      const attributes = {};
      let hasKeys = false;
      if ('distLeft' in (attrs.wrap.attrs || {})) {
        attributes.distL = pixelsToEmu(attrs.wrap.attrs.distLeft);
        hasKeys = true;
      }
      if ('distRight' in (attrs.wrap.attrs || {})) {
        attributes.distR = pixelsToEmu(attrs.wrap.attrs.distRight);
        hasKeys = true;
      }
      if ('distTop' in (attrs.wrap.attrs || {})) {
        attributes.distT = pixelsToEmu(attrs.wrap.attrs.distTop);
        hasKeys = true;
      }
      if ('distBottom' in (attrs.wrap.attrs || {})) {
        attributes.distB = pixelsToEmu(attrs.wrap.attrs.distBottom);
        hasKeys = true;
      }
      if (hasKeys) {
        wrapElement.attributes = attributes;
      }

      // Add polygon if present
      if (attrs.wrap.attrs?.polygon) {
        const polygonNode = objToPolygon(attrs.wrap.attrs.polygon);
        if (polygonNode) {
          wrapElement.elements = [polygonNode];
        }
      }
      break;
    }
    case 'None':
      inlineAttrs.behindDoc = attrs.wrap.attrs?.behindDoc ? '1' : '0';
      break;
    default:
      break;
  }

  const effectIndex = nodeElements.elements.findIndex((el) => el.name === 'wp:effectExtent');
  const elementsWithWrap = [
    ...nodeElements.elements.slice(0, effectIndex + 1),
    wrapElement,
    ...nodeElements.elements.slice(effectIndex + 1),
  ];

  return {
    name: 'wp:anchor',
    attributes: inlineAttrs,
    elements: [...anchorElements, ...elementsWithWrap],
  };
}
