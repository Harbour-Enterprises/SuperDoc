import { expect, describe } from 'vitest';
import { removeDuplicates } from './removeDuplicates';

describe('removeDuplicates', () => {
  it('should return empty for empty params', () => {
    expect(removeDuplicates([])).toEqual([]);
  });

  it('should return an unique array with only strings', () => {
    expect(removeDuplicates(['abc', 'abc', 'cde'])).toEqual(['abc', 'cde']);
  });

  it('should return an unique array with only numbers', () => {
    expect(removeDuplicates([123, 123, 999])).toEqual([123, 999]);
  });

  it('should return an unique array with mixed values', () => {
    expect(removeDuplicates([123, 123, 999, 'abc', 'abc', 'cde'])).toEqual([123, 999, 'abc', 'cde']);
  });
});
