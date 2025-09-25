import { describe, it, expect, vi, afterEach } from 'vitest';
import { Fragment } from 'prosemirror-model';
import { schema } from 'prosemirror-test-builder';
import { createNodeFromContent } from './createNodeFromContent.js';

const paragraphJSON = {
  type: 'paragraph',
  content: [{ type: 'text', text: 'Hello' }],
};

describe('createNodeFromContent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a node from JSON content', () => {
    const node = createNodeFromContent(paragraphJSON, schema);
    expect(node.type.name).toBe('paragraph');
  });

  it('creates a fragment when JSON content is an array', () => {
    const fragment = createNodeFromContent([paragraphJSON], schema);
    expect(fragment).toBeInstanceOf(Fragment);
    expect(fragment.childCount).toBe(1);
  });

  it('falls back gracefully when invalid JSON is provided', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => createNodeFromContent({ type: 'unknown' }, schema)).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('parses HTML content with or without slicing', () => {
    const fragment = createNodeFromContent('<p>Slice</p>', schema);
    expect(fragment.childCount).toBeGreaterThan(0);

    const node = createNodeFromContent('<p>No slice</p>', schema, { slice: false });
    expect(node.type.name).toBe('doc');
  });

  it('throws when invalid HTML is supplied with errorOnInvalidContent', () => {
    expect(() => createNodeFromContent('<unknown></unknown>', schema, { errorOnInvalidContent: true })).toThrow();
  });
});
