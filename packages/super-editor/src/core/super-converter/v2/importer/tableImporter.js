import { eigthPointsToPixels, halfPointToPoints } from '../../helpers.js';
import { generateV2HandlerEntity } from '@converter/v3/handlers/utils.js';
import { translator as tableTranslator } from '@converter/v3/handlers/w/tbl/tbl-translator.js';

/**
 * @type {import("docxImporter").NodeHandlerEntry}
 */
export const tableNodeHandlerEntity = generateV2HandlerEntity('tableNodeHandler', tableTranslator);

/**
 *
 * @param tblStyleTag
 * @param {ParsedDocx} docx
 * @param {NodeListHandler} nodeListHandler
 * @returns {{uiPriotity: *, borders: {}, name: *, rowBorders: {}, basedOn: *}|null}
 */
export function getReferencedTableStyles(tblStyleTag, docx) {
  if (!tblStyleTag) return null;

  const stylesToReturn = {};
  const { attributes = {} } = tblStyleTag;
  const tableStyleReference = attributes['w:val'];
  if (!tableStyleReference) return null;

  const styles = docx['word/styles.xml'];
  const { elements } = styles.elements[0];
  const styleElements = elements.filter((el) => el.name === 'w:style');
  const styleTag = styleElements.find((el) => el.attributes['w:styleId'] === tableStyleReference);
  if (!styleTag) return null;

  stylesToReturn.name = styleTag.elements.find((el) => el.name === 'w:name');

  // TODO: Do we need this?
  const basedOn = styleTag.elements.find((el) => el.name === 'w:basedOn');

  let baseTblPr;
  if (basedOn?.attributes) {
    const baseStyles = styleElements.find((el) => el.attributes['w:styleId'] === basedOn.attributes['w:val']);
    baseTblPr = baseStyles ? baseStyles.elements.find((el) => el.name === 'w:tblPr') : {};
  }

  const pPr = styleTag.elements.find((el) => el.name === 'w:pPr');
  if (pPr) {
    const justification = pPr.elements.find((el) => el.name === 'w:jc');
    if (justification?.attributes) stylesToReturn.justification = justification.attributes['w:val'];
  }

  const rPr = styleTag?.elements.find((el) => el.name === 'w:rPr');
  if (rPr) {
    const fonts = rPr.elements.find((el) => el.name === 'w:rFonts');
    if (fonts) {
      const { 'w:ascii': ascii, 'w:hAnsi': hAnsi, 'w:cs': cs } = fonts.attributes;
      stylesToReturn.fonts = { ascii, hAnsi, cs };
    }

    const fontSize = rPr.elements.find((el) => el.name === 'w:sz');
    if (fontSize?.attributes) stylesToReturn.fontSize = halfPointToPoints(fontSize.attributes['w:val']) + 'pt';
  }

  const tblPr = styleTag.elements.find((el) => el.name === 'w:tblPr');
  if (tblPr && tblPr.elements) {
    if (baseTblPr && baseTblPr.elements) {
      tblPr.elements.push(...baseTblPr.elements);
    }

    const tableBorders = tblPr?.elements?.find((el) => el.name === 'w:tblBorders');
    const { elements: borderElements = [] } = tableBorders || {};
    const { borders, rowBorders } = processTableBorders(borderElements);
    if (borders) stylesToReturn.borders = borders;
    if (rowBorders) stylesToReturn.rowBorders = rowBorders;

    const tableCellMargin = tblPr?.elements.find((el) => el.name === 'w:tblCellMar');
    if (tableCellMargin) {
      const marginLeft = tableCellMargin.elements.find((el) => el.name === 'w:left');
      const marginRight = tableCellMargin.elements.find((el) => el.name === 'w:right');
      const marginTop = tableCellMargin.elements.find((el) => el.name === 'w:top');
      const marginBottom = tableCellMargin.elements.find((el) => el.name === 'w:bottom');
      stylesToReturn.cellMargins = {
        marginLeft: marginLeft?.attributes['w:w'],
        marginRight: marginRight?.attributes['w:w'],
        marginTop: marginTop?.attributes['w:w'],
        marginBottom: marginBottom?.attributes['w:w'],
      };
    }
  }

  return stylesToReturn;
}

/**
 * Process the table borders
 * @param {Object[]} borderElements
 * @returns
 */
function processTableBorders(borderElements) {
  const borders = {};
  const rowBorders = {};
  borderElements.forEach((borderElement) => {
    const { name } = borderElement;
    const borderName = name.split('w:')[1];
    const { attributes } = borderElement;

    const attrs = {};
    const color = attributes['w:color'];
    const size = attributes['w:sz'];
    if (color && color !== 'auto') attrs['color'] = color.startsWith('#') ? color : `#${color}`;
    if (size && size !== 'auto') attrs['size'] = eigthPointsToPixels(size);

    const rowBorderNames = ['insideH', 'insideV'];
    if (rowBorderNames.includes(borderName)) rowBorders[borderName] = attrs;
    borders[borderName] = attrs;
  });

  return {
    borders,
    rowBorders,
  };
}
