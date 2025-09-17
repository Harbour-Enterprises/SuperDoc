import { describe, it, expect, vi } from 'vitest';
import { parseTagValueJSON } from './parse-tag-value-json';

describe('parseTagValueJSON', () => {
  it('should parse valid JSON string', () => {
    const validJSON = '{"name": "John", "age": 30}';
    const result = parseTagValueJSON(validJSON);

    expect(result).toEqual({ name: 'John', age: 30 });
  });

  it('should parse empty JSON object', () => {
    const validJSON = '{}';
    const result = parseTagValueJSON(validJSON);

    expect(result).toEqual({});
  });

  it('should return empty object for invalid JSON', () => {
    const invalidJSON = '{"name": "John", "age":}';
    const result = parseTagValueJSON(invalidJSON);

    expect(result).toEqual({});
  });

  it('should return empty object for plain string', () => {
    const plainString = 'just a string';
    const result = parseTagValueJSON(plainString);

    expect(result).toEqual({});
  });
});
