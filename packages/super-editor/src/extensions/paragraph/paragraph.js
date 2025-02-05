import { Node, Attribute } from '@core/index.js';
import { twipsToPixels } from '@converter/helpers.js';

export const Paragraph = Node.create({
  name: 'paragraph',

  priority: 1000,

  group: 'block',

  content: 'inline*',

  inline: false,

  addOptions() {
    return {
      htmlAttributes: {},
    };
  },

  addAttributes() {
    return {
      spacing: {
        renderDOM: (attrs) => {
          const { spacing } = attrs;
          if (!spacing) return {};

          const { lineSpaceBefore, lineSpaceAfter, line, lineRule } = spacing;
          const style = `
            ${lineSpaceBefore ? `margin-top: ${lineSpaceBefore}px;` : ''}
            ${lineSpaceAfter ? `margin-bottom: ${lineSpaceAfter}px;` : ''}
            ${line ? `line-height: ${line};` : ''}
          `.trim();

          if (style) return { style };
          return {};
        },
      },
      indent: {
        renderDOM: ({ indent }) => {
          if (!indent) return {};
          const { left, right, firstLine } = indent;

          let style = '';
          if (left) style += `margin-left: ${left}px;`;
          if (right) style += `margin-right: ${right}px;`;
          if (firstLine) style += `text-indent: ${firstLine}px;`;

          return { style };
        },
      },
      styleId: {
        rendered: false,
      },
      pageBreakBefore: {
        rendered: false,
      },
      attributes: {
        rendered: false,
      },
      filename: { rendered: false },
      rsidRDefault: { rendered: false },
    };
  },

  parseDOM() {
    return [{ tag: 'p' }];
  },

  renderDOM({ node, htmlAttributes }) {
    const { attrs = {} } = node;
    const { styleId } = attrs;

    const linkedStyle = getLinkedStyle(styleId, this.editor);
    if (linkedStyle) {
      htmlAttributes.style += linkedStyle;
    }

    const mergedAttrs = Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes);
    return ['p', mergedAttrs, 0];
  },
});

export const hasPageBreak = (styleId, editor) => {
  const linkedStyles = editor.converter?.linkedStyles || [];
  if (styleId && linkedStyles.length) {
    const linkedStyle = linkedStyles.find((style) => style.attributes['w:styleId'] === styleId);
    const pPr = linkedStyle.elements.find((el) => el.name === 'w:pPr');
    const pageBreak = pPr?.elements?.find((el) => el.name === 'w:pageBreakBefore');
    return pageBreak ? true : false;
  };
};

/**
 * Generate the linked style from the styleId
 * 
 * @param {string} styleId The styleId of the linked style
 * @param {Editor} editor The editor instance
 * @returns {string} The linked style
 */
export const getLinkedStyle = (styleId, editor) => {
  const linkedStyles = editor.converter?.linkedStyles || [];
  if (styleId && linkedStyles.length) {
    const linkedStyle = linkedStyles.find((style) => style.attributes['w:styleId'] === styleId);
    const pPr = linkedStyle.elements.find((el) => el.name === 'w:pPr');
    const rPr = linkedStyle.elements.find((el) => el.name === 'w:rPr');

    // TODO: Implement basedOn
    // const basedOn = linkedStyle.attributes['w:basedOn'];

    let style = '';
    const bold = rPr?.elements?.find((el) => el.name === 'w:b');
    if (bold) style += 'font-weight: bold;';

    const italic = rPr?.elements?.find((el) => el.name === 'w:i');
    if (italic) style += 'font-style: italic;';

    const fontSize = rPr?.elements?.find((el) => el.name === 'w:sz');
    const fontSizeCz = rPr?.elements?.find((el) => el.name === 'w:szCs');
    const fontSizeTag = fontSize || fontSizeCz;
    if (fontSizeTag) {
      const convertedSize = fontSizeTag.attributes['w:val'] / 2;
      style += `font-size: ${convertedSize}pt;`;
    };

    const spacing = pPr?.elements?.find((el) => el.name === 'w:spacing');
    if (spacing) {
      const { 'w:before': before, 'w:after': after, 'w:line': line } = spacing.attributes;
      if (before) style += `margin-top: ${twipsToPixels(before)}pt;`;
      if (after) style += `margin-bottom: ${twipsToPixels(after)}pt;`;
      if (line) style += `line-height: ${line};`;
    };

    return style;
  };

};