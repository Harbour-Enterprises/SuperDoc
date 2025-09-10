import { parseMarks } from '@converter/v2/importer/index.js';
import { twipsToLines, twipsToPixels } from '@converter/helpers.js';
import { kebabCase } from '@harbour-enterprises/common';

/**
 * Gets the default style definition.
 * @param {string} defaultStyleId - The default style ID.
 * @param {Object} docx - The DOCX document.
 * @returns {Object} The default style definition.
 */
export const getDefaultStyleDefinition = (defaultStyleId, docx) => {
  const result = { lineSpaceBefore: null, lineSpaceAfter: null };
  if (!defaultStyleId) return result;

  const styles = docx['word/styles.xml'];
  if (!styles) return result;

  const { elements } = styles.elements[0];
  const elementsWithId = elements.filter((el) => {
    const { attributes } = el;
    return attributes && attributes['w:styleId'] === defaultStyleId;
  });

  const firstMatch = elementsWithId[0];
  if (!firstMatch) return result;

  const qFormat = elementsWithId.find((el) => {
    const qFormat = el.elements.find((innerEl) => innerEl.name === 'w:qFormat');
    return qFormat;
  });

  const name = elementsWithId
    .find((el) => el.elements.some((inner) => inner.name === 'w:name'))
    ?.elements.find((inner) => inner.name === 'w:name')?.attributes['w:val'];

  // pPr
  const pPr = firstMatch.elements.find((el) => el.name === 'w:pPr');
  const spacing = pPr?.elements?.find((el) => el.name === 'w:spacing');
  const justify = pPr?.elements?.find((el) => el.name === 'w:jc');
  const indent = pPr?.elements?.find((el) => el.name === 'w:ind');

  let lineSpaceBefore, lineSpaceAfter, line;
  if (spacing) {
    lineSpaceBefore = twipsToPixels(spacing?.attributes['w:before']);
    lineSpaceAfter = twipsToPixels(spacing?.attributes['w:after']);
    line = twipsToLines(spacing?.attributes['w:line']);
  }

  let textAlign, leftIndent, rightIndent, firstLine;
  if (indent) {
    textAlign = justify?.attributes['w:val'];
    leftIndent = twipsToPixels(indent?.attributes['w:left']);
    rightIndent = twipsToPixels(indent?.attributes['w:right']);
    firstLine = twipsToPixels(indent?.attributes['w:firstLine']);
  }

  const keepNext = pPr?.elements?.find((el) => el.name === 'w:keepNext');
  const keepLines = pPr?.elements?.find((el) => el.name === 'w:keepLines');

  const outlineLevel = pPr?.elements?.find((el) => el.name === 'w:outlineLvl');
  const outlineLvlValue = outlineLevel?.attributes['w:val'];

  const pageBreakBefore = pPr?.elements?.find((el) => el.name === 'w:pageBreakBefore');
  let pageBreakBeforeVal = 0;
  if (pageBreakBefore) {
    if (!pageBreakBefore.attributes?.['w:val']) pageBreakBeforeVal = 1;
    else pageBreakBeforeVal = Number(pageBreakBefore?.attributes?.['w:val']);
  }
  const pageBreakAfter = pPr?.elements?.find((el) => el.name === 'w:pageBreakAfter');
  let pageBreakAfterVal;
  if (pageBreakAfter) {
    if (!pageBreakAfter.attributes?.['w:val']) pageBreakAfterVal = 1;
    else pageBreakAfterVal = Number(pageBreakAfter?.attributes?.['w:val']);
  }

  const basedOn = elementsWithId
    .find((el) => el.elements.some((inner) => inner.name === 'w:basedOn'))
    ?.elements.find((inner) => inner.name === 'w:basedOn')?.attributes['w:val'];

  const parsedAttrs = {
    name,
    qFormat: qFormat ? true : false,
    keepNext: keepNext ? true : false,
    keepLines: keepLines ? true : false,
    outlineLevel: outlineLevel ? parseInt(outlineLvlValue) : null,
    pageBreakBefore: pageBreakBeforeVal ? true : false,
    pageBreakAfter: pageBreakAfterVal ? true : false,
    basedOn: basedOn ?? null,
  };

  // rPr
  const rPr = firstMatch.elements.find((el) => el.name === 'w:rPr');
  const parsedMarks = parseMarks(rPr, [], docx) || [];
  const parsedStyles = {
    spacing: { lineSpaceAfter, lineSpaceBefore, line },
    textAlign,
    indent: { leftIndent, rightIndent, firstLine },
  };

  parsedMarks.forEach((mark) => {
    const { type, attrs } = mark;
    if (type === 'textStyle') {
      Object.entries(attrs).forEach(([key, value]) => {
        parsedStyles[kebabCase(key)] = value;
      });
      return;
    }

    parsedStyles[type] = attrs;
  });

  // pPr marks
  return {
    attrs: parsedAttrs,
    styles: parsedStyles,
  };
};
