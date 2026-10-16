// SD-4788: catalog previews say whether their font and color came from the
// theme, and the catalog reports the theme part's status.
import { describe, expect, it } from 'bun:test';
import { buildInternalContractSchemas } from '../contract/schemas.js';

type Schema = { properties?: Record<string, Schema>; items?: Schema; required?: string[]; enum?: unknown[] };

const output = buildInternalContractSchemas().operations['styles.getCatalog'].output as Schema;
const preview = output.properties!.items!.items!.properties!.preview!;

describe('styles.getCatalog theme-backed preview contract', () => {
  it('describes the origin of the preview font and color', () => {
    const sources = preview.properties!.sources!.properties!;

    expect(sources.fontFamily!.required).toEqual(['origin']);
    expect(sources.fontFamily!.properties!.origin!.enum).toEqual(['literal', 'theme']);
    expect(sources.fontFamily!.properties!.themeFont!.enum).toContain('majorHAnsi');
    expect(Object.keys(sources.color!.properties!)).toEqual(['origin', 'themeColor', 'tint', 'shade', 'fallback']);
    expect(sources.color!.properties!.themeColor!.enum).toContain('accent1');
  });

  it('keeps sources optional so existing preview consumers are unaffected', () => {
    expect(preview.required).toEqual(['available']);
  });

  it('reports the theme part status without making it required', () => {
    const sourceStatus = output.properties!.sourceStatus!;

    expect(sourceStatus.properties!.theme!.enum).toEqual(['present', 'missing', 'malformed']);
    expect(sourceStatus.required).not.toContain('theme');
  });
});
