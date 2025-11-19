import { describe, expect, test } from 'vitest';

import { generateParams, parseCookie } from '../collaboration/helpers.js';

describe('generateParams', () => {
  test('merges params, query string, cookies, and metadata', () => {
    const request = {
      url: '/collab/doc-42?role=editor&theme=dark',
      params: { documentId: 'doc-42', user: 'alice' },
      headers: { cookie: 'session=abc123; quoted="%7Bjson%7D"; bad=%E0%A4%; incomplete' },
    };
    const instance = {
      name: 'service-instance',
    } as unknown as import('../collaboration/collaboration.js').SuperDocCollaboration;

    const result = generateParams(request, instance);

    expect(result.documentId).toBe('doc-42');
    expect(result.instance).toBe(instance);
    expect(result.headers).toBe(request.headers);
    expect(result.connection).toEqual({});
    expect(result.params).toEqual({ user: 'alice', role: 'editor', theme: 'dark' });
    expect(result.cookies).toEqual({
      session: 'abc123',
      quoted: '{json}',
      bad: '%E0%A4%',
    });
  });

  test('works without headers or query string', () => {
    const request = {
      url: '/collab/doc-99',
      params: { documentId: 'doc-99', region: 'us-west' },
    };

    const result = generateParams(request);

    expect(result.documentId).toBe('doc-99');
    expect(result.headers).toEqual({});
    expect(result.cookies).toEqual({});
    expect(result.params).toEqual({ region: 'us-west' });
  });
});

describe('parseCookie', () => {
  test('returns empty object for missing cookie header', () => {
    expect(parseCookie(undefined)).toEqual({});
    expect(parseCookie('')).toEqual({});
  });

  test('parses and decodes values while ignoring invalid pairs', () => {
    const cookies = parseCookie(' session = value ; quoted="hello%20world" ; bad=%E0%A4% ; flag ');

    expect(cookies).toEqual({
      session: 'value',
      quoted: 'hello world',
      bad: '%E0%A4%',
    });
  });
});
