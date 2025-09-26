// @ts-check
import { normalizeBool } from './helpers.js';
import { normalizeHexColor } from '@converter/helpers.js';
import { SuperConverter } from '../../../../../SuperConverter.js';

/**
 * @param {Array<{ xmlName?: string, attributes?: Record<string, any> }>} [entries]
 * @returns {{ remainingProps: any[], inlineMarks: any[], textStyleAttrs: Record<string, any>|null, runStyleId: string|null }}
 */
export const splitRunProperties = (entries = [], docx = null) => {
  const remainingProps = [];
  const inlineMarks = [];
  const textStyleAttrs = {};
  let hasTextStyle = false;
  let highlightColor = null;
  let runStyleId = null;

  entries.forEach((entry) => {
    if (!entry || !entry.xmlName) return;
    const attributes = entry.attributes || {};
    switch (entry.xmlName) {
      case 'w:b': {
        const val = normalizeBool(attributes['w:val']);
        inlineMarks.push(val ? { type: 'bold' } : { type: 'bold', attrs: { value: '0' } });
        break;
      }
      case 'w:i': {
        const val = normalizeBool(attributes['w:val']);
        inlineMarks.push(val ? { type: 'italic' } : { type: 'italic', attrs: { value: '0' } });
        break;
      }
      case 'w:u': {
        const rawVal = attributes['w:val'];
        const underlineType = rawVal == null || rawVal === '' ? 'single' : String(rawVal);
        const attrs = {};
        if (underlineType.toLowerCase() === 'none' || underlineType === '0') {
          attrs.underlineType = 'none';
        } else {
          attrs.underlineType = underlineType;
          const colorRaw = attributes['w:color'];
          if (typeof colorRaw === 'string' && colorRaw.toLowerCase() !== 'auto') {
            const normalizedColor = normalizeHexColor(colorRaw);
            if (normalizedColor) attrs.underlineColor = `#${normalizedColor}`;
          }
        }
        if (attributes['w:themeColor']) attrs.underlineThemeColor = attributes['w:themeColor'];
        if (attributes['w:themeTint']) attrs.underlineThemeTint = attributes['w:themeTint'];
        if (attributes['w:themeShade']) attrs.underlineThemeShade = attributes['w:themeShade'];
        inlineMarks.push({ type: 'underline', attrs });
        break;
      }
      case 'w:color': {
        const raw = attributes['w:val'];
        if (typeof raw === 'string' && raw) {
          hasTextStyle = true;
          textStyleAttrs.color = `#${raw.replace('#', '').toUpperCase()}`;
        }
        break;
      }
      case 'w:rFonts': {
        const asciiFamily =
          attributes['w:ascii'] ||
          attributes['w:hAnsi'] ||
          (attributes['w:eastAsia'] ? undefined : attributes['w:val']);
        const eastAsiaFamily = attributes['w:eastAsia'];

        if (asciiFamily) {
          hasTextStyle = true;
          textStyleAttrs.fontFamily = SuperConverter.toCssFontFamily(asciiFamily, docx);
        }

        if (eastAsiaFamily) {
          hasTextStyle = true;
          const eastAsiaCss = SuperConverter.toCssFontFamily(eastAsiaFamily, docx);
          if (!asciiFamily || eastAsiaCss !== textStyleAttrs.fontFamily) {
            textStyleAttrs.eastAsiaFontFamily = eastAsiaCss;
          }
        }

        break;
      }
      case 'w:sz':
      case 'w:szCs': {
        const rawSize = Number(attributes['w:val']);
        const attrName = entry.xmlName === 'w:sz' ? 'fontSize' : 'fontSizeCs';
        if (Number.isFinite(rawSize) && rawSize > 0) {
          hasTextStyle = true;
          textStyleAttrs[attrName] = `${rawSize / 2}pt`;
        }
        break;
      }
      case 'w:strike': {
        const val = normalizeBool(attributes['w:val']);
        inlineMarks.push(val ? { type: 'strike' } : { type: 'strike', attrs: { value: '0' } });
        break;
      }
      case 'w:highlight': {
        const color = attributes['w:val'];
        if (typeof color === 'string' && color) {
          highlightColor = color.toLowerCase() === 'none' ? 'transparent' : color;
        }
        break;
      }
      case 'w:shd': {
        const fill = attributes['w:fill'];
        const shdVal = attributes['w:val'];
        if (fill && String(fill).toLowerCase() !== 'auto') {
          highlightColor = `#${String(fill).replace('#', '')}`;
        } else if (typeof shdVal === 'string') {
          const normalized = shdVal.toLowerCase();
          if (normalized === 'clear' || normalized === 'nil' || normalized === 'none') {
            highlightColor = 'transparent';
          }
        }
        break;
      }
      case 'w:rStyle': {
        if (typeof attributes['w:val'] === 'string') runStyleId = attributes['w:val'];
        remainingProps.push({ xmlName: entry.xmlName, attributes: { ...attributes } });
        break;
      }
      default: {
        remainingProps.push({ xmlName: entry.xmlName, attributes: { ...attributes } });
      }
    }
  });

  if (highlightColor) inlineMarks.push({ type: 'highlight', attrs: { color: highlightColor } });

  return {
    remainingProps,
    inlineMarks,
    textStyleAttrs: hasTextStyle ? textStyleAttrs : null,
    runStyleId,
  };
};
