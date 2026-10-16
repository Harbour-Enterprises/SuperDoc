import { describe, expect, it } from 'bun:test';
import { buildInternalContractSchemas } from './schemas.js';

// SD-4786: doc.get() output carries document-level style data and diagnostics.
describe('get contract schema', () => {
  it('advertises styles, theme, docDefaults and diagnostics on the output', () => {
    const output = buildInternalContractSchemas().operations.get.output;

    expect(output).toBeDefined();
    expect(output!.additionalProperties).toBe(false);
    expect(Object.keys(output!.properties as Record<string, unknown>)).toEqual(
      expect.arrayContaining(['modelVersion', 'body', 'styles', 'theme', 'docDefaults', 'diagnostics']),
    );
    expect(output!.required).toEqual(['modelVersion', 'body']);
  });
});
