import { describe, it, expect } from 'vitest';
import { getUnderlineCssString } from './underline-css.js';

describe('getUnderlineCssString', () => {
  it('returns none for type "none"', () => {
    expect(getUnderlineCssString({ type: 'none' })).toBe('text-decoration: none');
  });

  it('returns none for type "0"', () => {
    expect(getUnderlineCssString({ type: '0' })).toBe('text-decoration: none');
  });

  it('defaults to single underline when no type provided', () => {
    expect(getUnderlineCssString({})).toBe('text-decoration-line: underline');
  });

  it('maps double to text-decoration-style: double', () => {
    expect(getUnderlineCssString({ type: 'double' })).toBe(
      'text-decoration-line: underline; text-decoration-style: double',
    );
  });

  it('maps thick to text-decoration-thickness with default value', () => {
    expect(getUnderlineCssString({ type: 'thick' })).toBe(
      'text-decoration-line: underline; text-decoration-thickness: 0.15em',
    );
  });

  it('applies explicit thickness for thick and heavy variants', () => {
    expect(getUnderlineCssString({ type: 'thick', thickness: '3px' })).toBe(
      'text-decoration-line: underline; text-decoration-thickness: 3px',
    );
    expect(getUnderlineCssString({ type: 'dashedHeavy', thickness: '3px' })).toBe(
      'text-decoration-line: underline; text-decoration-style: dashed; text-decoration-thickness: 3px',
    );
  });

  it('maps dotted/dashed and their heavy variants', () => {
    expect(getUnderlineCssString({ type: 'dotted' })).toBe(
      'text-decoration-line: underline; text-decoration-style: dotted',
    );
    expect(getUnderlineCssString({ type: 'dashed' })).toBe(
      'text-decoration-line: underline; text-decoration-style: dashed',
    );
    expect(getUnderlineCssString({ type: 'dottedHeavy' })).toBe(
      'text-decoration-line: underline; text-decoration-style: dotted; text-decoration-thickness: 0.2em',
    );
    expect(getUnderlineCssString({ type: 'dashedHeavy' })).toBe(
      'text-decoration-line: underline; text-decoration-style: dashed; text-decoration-thickness: 0.2em',
    );
  });

  it('approximates dotdash-like variants to dashed and heavy thickness when approximate=true', () => {
    expect(getUnderlineCssString({ type: 'dotdash' })).toBe(
      'text-decoration-line: underline; text-decoration-style: dashed',
    );
    expect(getUnderlineCssString({ type: 'dotdotdash' })).toBe(
      'text-decoration-line: underline; text-decoration-style: dashed',
    );
    expect(getUnderlineCssString({ type: 'dashLong' })).toBe(
      'text-decoration-line: underline; text-decoration-style: dashed',
    );
    expect(getUnderlineCssString({ type: 'dashLongHeavy' })).toBe(
      'text-decoration-line: underline; text-decoration-style: dashed; text-decoration-thickness: 0.2em',
    );
  });

  it('does not approximate special variants when approximate=false', () => {
    expect(getUnderlineCssString({ type: 'dotdash', approximate: false })).toBe(
      'text-decoration-line: underline',
    );
    expect(getUnderlineCssString({ type: 'dashlongheavy', approximate: false })).toBe(
      'text-decoration-line: underline',
    );
    expect(getUnderlineCssString({ type: 'wavydouble', approximate: false })).toBe(
      'text-decoration-line: underline',
    );
  });

  it('maps wavy and wavyHeavy', () => {
    expect(getUnderlineCssString({ type: 'wavy' })).toBe(
      'text-decoration-line: underline; text-decoration-style: wavy',
    );
    expect(getUnderlineCssString({ type: 'wavyHeavy' })).toBe(
      'text-decoration-line: underline; text-decoration-style: wavy; text-decoration-thickness: 0.2em',
    );
  });

  it('adds color when provided', () => {
    expect(getUnderlineCssString({ type: 'dashed', color: '#ff0000' })).toBe(
      'text-decoration-line: underline; text-decoration-style: dashed; text-decoration-color: #ff0000',
    );
  });

  it('handles case-insensitive types', () => {
    expect(getUnderlineCssString({ type: 'DaShEd' })).toBe(
      'text-decoration-line: underline; text-decoration-style: dashed',
    );
  });

  it('keeps basic underline for unknown types and for words', () => {
    expect(getUnderlineCssString({ type: 'words' })).toBe('text-decoration-line: underline');
    expect(getUnderlineCssString({ type: 'fancy' })).toBe('text-decoration-line: underline');
  });
});

