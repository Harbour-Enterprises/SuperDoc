// @ts-check

/**
 * Normalize run properties from rPr translator into style flags and a filtered list.
 * @param {Array<{xmlName: string, attributes: Record<string, any>}>} runPropsArray
 */
export const parseRunProperties = (runPropsArray = []) => {
  const normalizeBool = (v) => {
    if (v === undefined || v === null) return true;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    const s = String(v).trim().toLowerCase();
    if (s === '0' || s === 'false' || s === 'off') return false;
    if (s === '1' || s === 'true' || s === 'on') return true;
    return true;
  };

  let isBold = false,
    isBoldOff = false,
    isItalic = false,
    isItalicOff = false,
    underlineType = null,
    underlineColor = null,
    underlineOff = false,
    fontFamily = null,
    textColor = null,
    fontSizePt = null,
    strikeOn = false,
    strikeOff = false,
    highlightColor = null,
    rStyleId = null;

  const filteredRunProps = [];

  runPropsArray.forEach((entry) => {
    if (!entry || !entry.xmlName) return;
    const { xmlName, attributes = {} } = entry;
    switch (xmlName) {
      case 'w:b': {
        const v = normalizeBool(attributes['w:val']);
        if (v) isBold = true;
        else isBoldOff = true;
        break;
      }
      case 'w:i': {
        const v = normalizeBool(attributes['w:val']);
        if (v) isItalic = true;
        else isItalicOff = true;
        break;
      }
      case 'w:u': {
        const raw = attributes['w:val'];
        const val = raw == null || raw === '' ? 'single' : String(raw);
        const colorRaw = attributes['w:color'];
        if (colorRaw && typeof colorRaw === 'string' && colorRaw.toLowerCase() !== 'auto') underlineColor = `#${colorRaw.toUpperCase()}`;
        if (val.toLowerCase() === 'none' || val === '0') underlineOff = true;
        else underlineType = val;
        break;
      }
      case 'w:color': {
        const raw = attributes['w:val'];
        const theme = attributes['w:themeColor'];
        if (raw && typeof raw === 'string' && raw.toLowerCase() !== 'auto') {
          textColor = `#${raw.toUpperCase()}`;
          break;
        }
        if (raw && typeof raw === 'string' && raw.toLowerCase() === 'auto') {
          textColor = 'auto';
          break;
        }
        if (theme && typeof theme === 'string') {
          textColor = `theme:${theme}`;
          break;
        }
        filteredRunProps.push(entry);
        break;
      }
      case 'w:rStyle': {
        const sid = attributes['w:val'];
        if (sid) rStyleId = String(sid);
        filteredRunProps.push(entry);
        break;
      }
      case 'w:rFonts': {
        const a = attributes || {};
        fontFamily = a['w:ascii'] || a['w:eastAsia'] || a['w:hAnsi'] || a['w:val'] || null;
        break;
      }
      case 'w:sz':
      case 'w:szCs': {
        const raw = attributes['w:val'];
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0) fontSizePt = `${n / 2}pt`;
        break;
      }
      case 'w:strike': {
        const v = normalizeBool(attributes['w:val']);
        if (v) strikeOn = true;
        else strikeOff = true;
        break;
      }
      case 'w:highlight': {
        const raw = attributes['w:val'];
        if (typeof raw === 'string') highlightColor = raw.toLowerCase() === 'none' ? 'transparent' : raw;
        break;
      }
      case 'w:shd': {
        const fill = (attributes['w:fill'] || '').toString().toLowerCase();
        const shdVal = (attributes['w:val'] || '').toString().toLowerCase();
        if (fill && fill !== 'auto') highlightColor = `#${String(attributes['w:fill']).replace('#', '')}`;
        else if (shdVal === 'clear' || shdVal === 'nil' || shdVal === 'none') highlightColor = 'transparent';
        break;
      }
      default:
        filteredRunProps.push(entry);
    }
  });

  return {
    filteredRunProps,
    style: {
      isBold,
      isBoldOff,
      isItalic,
      isItalicOff,
      underlineType,
      underlineColor,
      underlineOff,
      fontFamily,
      textColor,
      fontSizePt,
      strikeOn,
      strikeOff,
      highlightColor,
      rStyleId,
    },
  };
};

