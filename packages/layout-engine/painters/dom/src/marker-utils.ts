/**
 * Calculates the CSS left position for a list marker element.
 *
 * Markers are positioned absolutely within a fragment that has paddingLeft and textIndent.
 * The calculation ensures the marker box ends where the first line text begins.
 *
 * In Word-style lists:
 * - Fragment has paddingLeft = indent.left (the hanging indent value)
 * - Fragment has textIndent = firstLine - hanging (usually negative to outdent first line)
 * - First line text starts at: paddingLeft + textIndent from the border edge
 * - Marker should end just before the text starts
 *
 * Since CSS absolute positioning is relative to the padding edge, we calculate:
 * markerLeft = textStartOffset - markerWidth
 *
 * Where textStartOffset = paddingLeft + (firstLine - hanging)
 *
 * @param indent - Paragraph indent properties
 * @param markerWidth - Width of the marker box in pixels
 * @returns CSS left position in pixels (typically negative)
 *
 * @example
 * // Standard hanging indent list (left=48px, firstLine=0, hanging=48px)
 * // Text starts at: 48 + (0 - 48) = 0px from border edge
 * // Marker ends at 0px, so starts at: 0 - 24 = -24px
 * calculateMarkerLeftPosition({ left: 48, firstLine: 0, hanging: 48 }, 24)
 * // Returns: -24
 *
 * @example
 * // List with additional first line indent (left=48, firstLine=24, hanging=48px)
 * // Text starts at: 48 + (24 - 48) = 24px from border edge
 * // Marker ends at 24px, so starts at: 24 - 24 = 0px
 * calculateMarkerLeftPosition({ left: 48, firstLine: 24, hanging: 48 }, 24)
 * // Returns: 0
 */
export const calculateMarkerLeftPosition = (
  indent: { left?: number; firstLine?: number; hanging?: number } | undefined,
  markerWidth: number,
): number => {
  const paddingLeft = indent?.left ?? 0;
  const firstLine = indent?.firstLine ?? 0;
  const hanging = indent?.hanging ?? 0;
  const textIndent = firstLine - hanging;
  const textStartOffset = paddingLeft + textIndent;

  return textStartOffset - markerWidth;
};
