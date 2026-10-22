import { describe, expect, it } from 'vite-plus/test';
import { composedNaturalLineHeight, extendFontLineMetricEnvelope } from './line-metric-composition.js';

describe('font line metric composition', () => {
  it('uses Word natural pitch across complementary Times emphasis faces', () => {
    const regular = { ascent: 14.5, descent: 3.5, naturalLineHeight: 18.4, naturalLineFamily: 'times new roman' };
    const italic = { ascent: 14, descent: 3.7, naturalLineHeight: 18.4, naturalLineFamily: 'times new roman' };
    const forward = extendFontLineMetricEnvelope(extendFontLineMetricEnvelope(undefined, regular), italic);
    const reverse = extendFontLineMetricEnvelope(extendFontLineMetricEnvelope(undefined, italic), regular);
    expect(forward).toEqual(reverse);
    expect(composedNaturalLineHeight(forward)).toBeCloseTo(18.4, 4);
    expect(forward.glyphAscent).toBe(14.5);
    expect(forward.glyphDescent).toBe(3.7);
  });

  it('retains complementary bounds when another family joins Times runs', () => {
    const times = { ascent: 14.5, descent: 3.5, naturalLineHeight: 18.4, naturalLineFamily: 'times new roman' };
    const other = { ascent: 13, descent: 5, naturalLineHeight: 18.4 };
    const forward = [times, other, times].reduce(extendFontLineMetricEnvelope, undefined);
    const reverse = [other, times, times].reduce(extendFontLineMetricEnvelope, undefined);
    expect(forward).toEqual(reverse);
    expect(forward!.naturalLineFamily).toBeUndefined();
    expect(composedNaturalLineHeight(forward!)).toBeGreaterThan(19.5);
  });

  it('keeps Word natural pitch separate from rounded Chrome glyph bounds', () => {
    // SD-5838: native Word's long 12pt Times paragraphs advance about 18.409px;
    // full Chrome rounds the same face's accented probe to 15px + 4px.
    const sample = { ascent: 15, descent: 4, naturalLineHeight: 18.4, naturalLineFamily: 'times new roman' };
    const envelope = extendFontLineMetricEnvelope(undefined, sample);

    expect(composedNaturalLineHeight(envelope)).toBeCloseTo(18.4, 4);
    expect(envelope.glyphAscent).toBe(15);
    expect(envelope.glyphDescent).toBe(4);
  });

  it('preserves a taller integer envelope for an uncalibrated family', () => {
    const envelope = extendFontLineMetricEnvelope(undefined, {
      ascent: 16,
      descent: 4,
      naturalLineHeight: 19.584,
    });
    expect(composedNaturalLineHeight(envelope)).toBe(20);
  });

  it('preserves complementary integer bounds after another family joins Times', () => {
    const times = { ascent: 15, descent: 4, naturalLineHeight: 18.4, naturalLineFamily: 'times new roman' };
    const other = { ascent: 14, descent: 5, naturalLineHeight: 19.4 };
    const forward = [times, other].reduce(extendFontLineMetricEnvelope, undefined);
    const reverse = [other, times].reduce(extendFontLineMetricEnvelope, undefined);
    expect(forward).toEqual(reverse);
    expect(composedNaturalLineHeight(forward!)).toBeGreaterThanOrEqual(20);
  });

  it('preserves a genuinely taller glyph envelope and fractional ink overflow', () => {
    const tall = extendFontLineMetricEnvelope(undefined, {
      ascent: 22,
      descent: 6,
      naturalLineHeight: 18.4,
      naturalLineFamily: 'times new roman',
    });
    const fractional = extendFontLineMetricEnvelope(undefined, {
      ascent: 15.1,
      descent: 4,
      naturalLineHeight: 18.4,
      naturalLineFamily: 'times new roman',
    });

    expect(composedNaturalLineHeight(tall)).toBe(28);
    expect(tall.glyphAscent).toBe(22);
    expect(tall.glyphDescent).toBe(6);
    expect(composedNaturalLineHeight(fractional)).toBeCloseTo(19.1, 4);
  });

  it('combines complementary face extents around one baseline independent of run order', () => {
    const times = { ascent: 12.5841, descent: 3.1639, naturalLineHeight: 16.8667 };
    const arial = { ascent: 12.577, descent: 3.2355, naturalLineHeight: 16.8667 };
    const timesThenArial = extendFontLineMetricEnvelope(extendFontLineMetricEnvelope(undefined, times), arial);
    const arialThenTimes = extendFontLineMetricEnvelope(extendFontLineMetricEnvelope(undefined, arial), times);

    expect(timesThenArial).toEqual(arialThenTimes);
    expect(composedNaturalLineHeight(timesThenArial)).toBeGreaterThan(times.naturalLineHeight);
    expect(composedNaturalLineHeight(timesThenArial)).toBeGreaterThan(arial.naturalLineHeight);
    expect(timesThenArial.glyphAscent).toBe(times.ascent);
    expect(timesThenArial.glyphDescent).toBe(arial.descent);
  });

  it('is idempotent for repeated runs from the same face', () => {
    const sample = { ascent: 12.5841, descent: 3.1639, naturalLineHeight: 16.8667 };
    const once = extendFontLineMetricEnvelope(undefined, sample);
    const twice = extendFontLineMetricEnvelope(once, sample);

    expect(twice).toEqual(once);
    expect(composedNaturalLineHeight(twice)).toBeCloseTo(sample.naturalLineHeight, 4);
  });
});
