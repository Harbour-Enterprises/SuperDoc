// SD-4789: query.match reports cascade-resolved values under `styles.effective`
// with their origin, and explains an unresolved result in `meta.diagnostics`.
import { describe, expect, it } from 'bun:test';
import { buildInternalContractSchemas } from '../contract/schemas.js';

type Schema = {
  properties?: Record<string, Schema>;
  items?: Schema;
  required?: string[];
  enum?: unknown[];
  $ref?: string;
};

const schemas = buildInternalContractSchemas();
const output = schemas.operations['query.match'].output as Schema;
const matchRun = schemas.$defs!.MatchRun as Schema;
const effective = matchRun.properties!.styles!.properties!.effective!;

describe('query.match effective formatting contract', () => {
  it('adds optional resolved values to effective without changing its required toggles', () => {
    expect(effective.required).toEqual(['bold', 'italic', 'underline', 'strike']);
    expect(Object.keys(effective.properties!)).toEqual(
      expect.arrayContaining(['color', 'highlight', 'fontFamily', 'fontSizePt', 'sources']),
    );
  });

  it('describes the origin of the effective font and color', () => {
    const sources = effective.properties!.sources!.properties!;

    expect(sources.fontFamily!.properties!.origin!.enum).toEqual(['literal', 'theme']);
    expect(sources.fontFamily!.properties!.themeFont!.enum).toContain('majorHAnsi');
    expect(sources.color!.properties!.origin!.enum).toEqual(['literal', 'theme', 'default']);
    expect(Object.keys(sources.color!.properties!)).toEqual(['origin', 'themeColor', 'tint', 'shade', 'fallback']);
  });

  it('keeps diagnostics optional on meta', () => {
    const meta = output.properties!.meta!;

    expect(meta.required).toEqual(['effectiveResolved']);
    expect(meta.properties!.diagnostics!.items!.required).toEqual(['code', 'message']);
    expect(meta.properties!.diagnostics!.items!.properties!.code!.enum).toEqual([
      'tracked-view-unresolved',
      'theme-fallback',
      'style-parts-unavailable',
      'run-projection-unavailable',
    ]);
  });
});
