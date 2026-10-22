/** Physical font metrics normalized into a Word-compatible natural line box. */
export type FontLineMetricEnvelope = {
  glyphAscent: number;
  glyphDescent: number;
  naturalAscent: number;
  naturalDescent: number;
  naturalLineFamily?: string;
  familyNaturalLineHeight?: number;
};

export type FontLineMetricSample = {
  ascent: number;
  descent: number;
  naturalLineHeight: number;
  naturalLineFamily?: string;
};

function naturalHeightWithGlyphBounds(
  height: number,
  ascent: number,
  descent: number,
  naturalLineFamily?: string,
): number {
  const glyphHeight = ascent + descent;
  const roundedBoundsFit =
    naturalLineFamily === 'times new roman' &&
    Number.isInteger(ascent) &&
    Number.isInteger(descent) &&
    glyphHeight <= Math.ceil(height);
  return roundedBoundsFit ? height : Math.max(glyphHeight, height);
}

/**
 * Add one font face to a line's shared baseline envelope.
 *
 * Word composes a line from the maximum ascent and maximum descent of every
 * participating face. Selecting one run loses the small but cumulative
 * Times/Arial baseline difference. Scale each face's physical ascent/descent
 * to its natural line height before merging so intrinsic leading stays on the
 * correct side of the baseline.
 */
export function extendFontLineMetricEnvelope(
  current: FontLineMetricEnvelope | undefined,
  sample: FontLineMetricSample,
): FontLineMetricEnvelope {
  const glyphAscent = Math.max(0, sample.ascent);
  const glyphDescent = Math.max(0, sample.descent);
  const glyphHeight = glyphAscent + glyphDescent;
  const naturalLineHeight = naturalHeightWithGlyphBounds(
    sample.naturalLineHeight,
    glyphAscent,
    glyphDescent,
    sample.naturalLineFamily,
  );
  const scale = glyphHeight > 0 ? naturalLineHeight / glyphHeight : 1;
  const naturalAscent = glyphAscent * scale;
  const naturalDescent = glyphDescent * scale;

  if (!current) {
    return {
      glyphAscent,
      glyphDescent,
      naturalAscent,
      naturalDescent,
      ...(sample.naturalLineFamily
        ? {
            naturalLineFamily: sample.naturalLineFamily,
            familyNaturalLineHeight: naturalLineHeight,
          }
        : {}),
    };
  }

  return {
    glyphAscent: Math.max(current.glyphAscent, glyphAscent),
    glyphDescent: Math.max(current.glyphDescent, glyphDescent),
    naturalAscent: Math.max(current.naturalAscent, naturalAscent),
    naturalDescent: Math.max(current.naturalDescent, naturalDescent),
    ...(current.naturalLineFamily && current.naturalLineFamily === sample.naturalLineFamily
      ? {
          naturalLineFamily: current.naturalLineFamily,
          familyNaturalLineHeight: Math.max(current.familyNaturalLineHeight!, naturalLineHeight),
        }
      : {}),
  };
}

export function composedNaturalLineHeight(envelope: FontLineMetricEnvelope): number {
  return naturalHeightWithGlyphBounds(
    envelope.familyNaturalLineHeight ?? envelope.naturalAscent + envelope.naturalDescent,
    envelope.glyphAscent,
    envelope.glyphDescent,
    envelope.naturalLineFamily,
  );
}
