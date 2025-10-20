import { emuToPixels } from '@converter/helpers';

/**
 * Converts a theme color name to its corresponding hex color value.
 * Uses the default Office theme color palette.
 * @param {string} name - The theme color name
 * @returns {string} Hex color value
 */
export function getThemeColor(name) {
  const colors = {
    accent1: '#5b9bd5',
    accent2: '#ed7d31',
    accent3: '#a5a5a5',
    accent4: '#ffc000',
    accent5: '#4472c4',
    accent6: '#70ad47',
    dk1: '#000000',
    lt1: '#ffffff',
    dk2: '#1f497d',
    lt2: '#eeece1',
    text1: '#000000',
    text2: '#1f497d',
    background1: '#ffffff',
    background2: '#eeece1',
  };
  return colors[name] ?? '#000000';
}

/**
 * Applies a color modifier to a hex color.
 * Used to transform Office theme colors according to DrawingML specifications.
 * @param {string} hexColor - The hex color to modify
 * @param {'shade'|'tint'|'lumMod'|'lumOff'} modifier - The type of color modification to apply
 * @param {string|number} value - The modifier value in Office format
 * @returns {string} The modified hex color
 */
export function applyColorModifier(hexColor, modifier, value) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const percent = parseInt(value) / 100000;

  let newR, newG, newB;
  if (modifier === 'shade' || modifier === 'lumMod') {
    newR = r * percent;
    newG = g * percent;
    newB = b * percent;
  } else if (modifier === 'tint') {
    newR = r + (255 - r) * (1 - percent);
    newG = g + (255 - g) * (1 - percent);
    newB = b + (255 - b) * (1 - percent);
  } else if (modifier === 'lumOff') {
    const offset = 255 * percent;
    newR = r + offset;
    newG = g + offset;
    newB = b + offset;
  } else {
    return hexColor;
  }

  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  const toHex = (n) => n.toString(16).padStart(2, '0');

  newR = clamp(newR);
  newG = clamp(newG);
  newB = clamp(newB);

  const result = `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
  return result;
}

/**
 * Extracts the stroke width from a shape's properties (spPr).
 * @param {Object} spPr - The shape properties element
 * @returns {number} The stroke width in pixels, or 1 if not found
 */
export function extractStrokeWidth(spPr) {
  const ln = spPr?.elements?.find((el) => el.name === 'a:ln');
  const w = ln?.attributes?.['w'];
  return w ? emuToPixels(w) : 1;
}

/**
 * Extracts the stroke color from a shape's properties.
 * Checks direct stroke definition in spPr first, then falls back to style reference.
 * @param {Object} spPr - The shape properties element
 * @param {Object} style - The shape style element (wps:style)
 * @returns {string|null} Hex color value
 */
export function extractStrokeColor(spPr, style) {
  const ln = spPr?.elements?.find((el) => el.name === 'a:ln');

  if (ln) {
    const noFill = ln.elements?.find((el) => el.name === 'a:noFill');
    if (noFill) return null;

    const solidFill = ln.elements?.find((el) => el.name === 'a:solidFill');
    if (solidFill) {
      const schemeClr = solidFill.elements?.find((el) => el.name === 'a:schemeClr');

      if (schemeClr) {
        const themeName = schemeClr.attributes?.['val'];
        let color = getThemeColor(themeName);

        const modifiers = schemeClr.elements || [];
        modifiers.forEach((mod) => {
          if (mod.name === 'a:shade') {
            color = applyColorModifier(color, 'shade', mod.attributes['val']);
          } else if (mod.name === 'a:tint') {
            color = applyColorModifier(color, 'tint', mod.attributes['val']);
          } else if (mod.name === 'a:lumMod') {
            color = applyColorModifier(color, 'lumMod', mod.attributes['val']);
          }
        });
        return color;
      }

      const srgbClr = solidFill.elements?.find((el) => el.name === 'a:srgbClr');
      if (srgbClr) {
        return '#' + srgbClr.attributes?.['val'];
      }
    }
  }

  if (!style) return '#000000';

  const lnRef = style.elements?.find((el) => el.name === 'a:lnRef');
  if (!lnRef) return '#000000';

  const schemeClr = lnRef.elements?.find((el) => el.name === 'a:schemeClr');
  if (!schemeClr) return '#000000';

  const themeName = schemeClr.attributes?.['val'];
  let color = getThemeColor(themeName);

  const modifiers = schemeClr.elements || [];
  modifiers.forEach((mod) => {
    if (mod.name === 'a:shade') {
      color = applyColorModifier(color, 'shade', mod.attributes['val']);
    } else if (mod.name === 'a:tint') {
      color = applyColorModifier(color, 'tint', mod.attributes['val']);
    } else if (mod.name === 'a:lumMod') {
      color = applyColorModifier(color, 'lumMod', mod.attributes['val']);
    } else if (mod.name === 'a:lumOff') {
      color = applyColorModifier(color, 'lumOff', mod.attributes['val']);
    }
  });

  return color;
}

/**
 * Extracts the fill color from a shape's properties.
 * Checks direct fill definition in spPr first, then falls back to style reference.
 * @param {Object} spPr - The shape properties element
 * @param {Object} style - The shape style element (wps:style)
 * @returns {string|null} Hex color value
 */
export function extractFillColor(spPr, style) {
  const noFill = spPr?.elements?.find((el) => el.name === 'a:noFill');
  if (noFill) return null;

  const solidFill = spPr?.elements?.find((el) => el.name === 'a:solidFill');
  if (solidFill) {
    const schemeClr = solidFill.elements?.find((el) => el.name === 'a:schemeClr');

    if (schemeClr) {
      const themeName = schemeClr.attributes?.['val'];
      let color = getThemeColor(themeName);

      const modifiers = schemeClr.elements || [];
      modifiers.forEach((mod) => {
        if (mod.name === 'a:shade') {
          color = applyColorModifier(color, 'shade', mod.attributes['val']);
        } else if (mod.name === 'a:tint') {
          color = applyColorModifier(color, 'tint', mod.attributes['val']);
        } else if (mod.name === 'a:lumMod') {
          color = applyColorModifier(color, 'lumMod', mod.attributes['val']);
        } else if (mod.name === 'a:lumOff') {
          color = applyColorModifier(color, 'lumOff', mod.attributes['val']);
        }
      });
      return color;
    }

    const srgbClr = solidFill.elements?.find((el) => el.name === 'a:srgbClr');
    if (srgbClr) {
      return '#' + srgbClr.attributes?.['val'];
    }
  }

  const gradFill = spPr?.elements?.find((el) => el.name === 'a:gradFill');
  if (gradFill) {
    return '#cccccc'; // placeholder color for now
  }

  const blipFill = spPr?.elements?.find((el) => el.name === 'a:blipFill');
  if (blipFill) {
    return '#cccccc'; // placeholder color for now
  }

  if (!style) return '#5b9bd5';

  const fillRef = style.elements?.find((el) => el.name === 'a:fillRef');
  if (!fillRef) return '#5b9bd5';

  const schemeClr = fillRef.elements?.find((el) => el.name === 'a:schemeClr');
  if (!schemeClr) return '#5b9bd5';

  const themeName = schemeClr.attributes?.['val'];
  let color = getThemeColor(themeName);

  const modifiers = schemeClr.elements || [];
  modifiers.forEach((mod) => {
    if (mod.name === 'a:shade') {
      color = applyColorModifier(color, 'shade', mod.attributes['val']);
    } else if (mod.name === 'a:tint') {
      color = applyColorModifier(color, 'tint', mod.attributes['val']);
    } else if (mod.name === 'a:lumMod') {
      color = applyColorModifier(color, 'lumMod', mod.attributes['val']);
    }
  });

  return color;
}
