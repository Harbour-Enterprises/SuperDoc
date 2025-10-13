/**
 * Checks if a given font can be rendered on the browser
 *
 * @param {string} fontName - The name of the font to check for availability.
 * @returns {boolean} True if the font can be rendered, false otherwise.
 *
 * @example
 * if (canRenderFont('Arial')) {
 *   // Use Arial font
 * }
 */

export function canRenderFont(
  fontName,
  fallbackFont = 'sans-serif',
  { foundLocalFonts = [] } = { foundLocalFonts: [] },
) {
  const _canRenderFont = (fontName, fallbackFont) => {
    // Create a canvas context to measure text
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    // Ensure the text baseline is top so we can properly measure the height.
    ctx.textBaseline = 'top';

    // A standard text string to measure
    const text = 'abcdefghijklmnopqrstuvwxyz0123456789';

    // Measure the text with a generic fallback font
    ctx.font = `72px ${fallbackFont}`;
    const initialTextMeasurement = ctx.measureText(text);
    const fallbackWidth = initialTextMeasurement.width;
    const fallbackHeight = initialTextMeasurement.actualBoundingBoxDescent;

    // Measure the text with given font
    ctx.font = `72px "${fontName}", ${fallbackFont}`;
    const customTextMeasurement = ctx.measureText(text);
    const customFontWidth = customTextMeasurement.width;
    const customFontHeight = customTextMeasurement.actualBoundingBoxDescent;

    // If the widths or height differ, the custom font should have been used.
    const isAvailable = customFontWidth !== fallbackWidth || customFontHeight !== fallbackHeight;
    return isAvailable;
  };

  if (_canRenderFont(fontName, fallbackFont)) {
    return true;
  }
  // This extra verification is for the case where the `fontName` is the actual fallback font.
  // If the browser renders Helvetica by default when the fallback is `sans-serif`, and the
  // font being tested here is also Helvetica, this would return `false` because the width
  // and height wouldn't change at all. To avoid that case, we check it again switching
  // the fallback font.
  const oppositeFallbackFont = fallbackFont === 'sans-serif' ? 'serif' : 'sans-serif';
  return _canRenderFont(fontName, oppositeFallbackFont);
}
