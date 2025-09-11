import { describe, it, expect } from 'vitest';
import { createTranslatedRun } from './create-translated-run.js';

describe('createTranslatedRun', () => {
  it('creates translated object with content and attrs', () => {
    const content = [{ type: 'text', text: 'hi' }];
    const runProps = { runProperties: [{ xmlName: 'w:b' }] };
    const out = createTranslatedRun(content, runProps, {});
    expect(out).toEqual({ type: 'run', content, attrs: runProps });
  });

  it('merges encodedAttrs into attrs when provided', () => {
    const content = [];
    const runProps = { runProperties: [{ xmlName: 'w:i' }] };
    const encoded = { something: 1 };
    const out = createTranslatedRun(content, runProps, encoded);
    expect(out.attrs).toEqual({ ...runProps, ...encoded });
  });
});
