import { describe, expect, it } from 'vitest';
import { hasParagraphStyleContext, hasTableStyleContext } from './converter-context.js';
import type { ConverterContext } from './converter-context.js';

describe('hasParagraphStyleContext', () => {
  it('should return false when context is undefined', () => {
    const result = hasParagraphStyleContext(undefined);
    expect(result).toBe(false);
  });

  it('should return true when context.docx is present but context.numbering is undefined', () => {
    const context: ConverterContext = {
      docx: { styles: {}, docDefaults: {} },
    };
    const result = hasParagraphStyleContext(context);
    expect(result).toBe(true);
  });

  it('should return true when both context.docx and context.numbering are present', () => {
    const context: ConverterContext = {
      docx: { styles: {}, docDefaults: {} },
      numbering: { definitions: {}, abstracts: {} },
    };
    const result = hasParagraphStyleContext(context);
    expect(result).toBe(true);
  });

  it('should return false when only context.numbering is present', () => {
    const context: ConverterContext = {
      numbering: { definitions: {}, abstracts: {} },
    };
    const result = hasParagraphStyleContext(context);
    expect(result).toBe(false);
  });

  it('should return false when context is empty object', () => {
    const context: ConverterContext = {};
    const result = hasParagraphStyleContext(context);
    expect(result).toBe(false);
  });

  it('should return false when context.docx is undefined', () => {
    const context: ConverterContext = {
      docx: undefined,
      numbering: { definitions: {}, abstracts: {} },
    };
    const result = hasParagraphStyleContext(context);
    expect(result).toBe(false);
  });
});

describe('hasTableStyleContext', () => {
  it('should return false when context is undefined', () => {
    const result = hasTableStyleContext(undefined);
    expect(result).toBe(false);
  });

  it('should return true when context.docx is present', () => {
    const context: ConverterContext = {
      docx: { styles: {} },
    };
    const result = hasTableStyleContext(context);
    expect(result).toBe(true);
  });

  it('should return false when context.docx is missing', () => {
    const context: ConverterContext = {
      numbering: { definitions: {}, abstracts: {} },
    };
    const result = hasTableStyleContext(context);
    expect(result).toBe(false);
  });
});
