import { describe, it, expect } from 'vitest';
import { Schema } from 'prosemirror-model';
import { isList } from './is-list.js';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'text*', renderDOM: () => ['p', 0], parseDOM: () => [{ tag: 'p' }] },
    text: { group: 'inline' },
    orderedList: { content: 'listItem+', group: 'block', renderDOM: () => ['ol', 0], parseDOM: () => [{ tag: 'ol' }] },
    bulletList: { content: 'listItem+', group: 'block', renderDOM: () => ['ul', 0], parseDOM: () => [{ tag: 'ul' }] },
    listItem: { content: 'paragraph+', renderDOM: () => ['li', 0], parseDOM: () => [{ tag: 'li' }] },
  },
});

describe('isList', () => {
  it('returns true for orderedList nodes', () => {
    const node = schema.nodes.orderedList.createAndFill();
    expect(isList(node)).toBe(true);
  });

  it('returns true for bulletList nodes', () => {
    const node = schema.nodes.bulletList.createAndFill();
    expect(isList(node)).toBe(true);
  });

  it('returns false for non-list nodes', () => {
    const para = schema.nodes.paragraph.create();
    expect(isList(para)).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isList(null)).toBe(false);
    expect(isList(undefined)).toBe(false);
  });
});
