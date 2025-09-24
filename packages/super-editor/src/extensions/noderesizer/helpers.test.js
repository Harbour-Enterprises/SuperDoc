import { describe, expect, it } from 'vitest';
import { queryWithinRoot, findInEventPath } from './helpers.js';

describe('node resizer helpers', () => {
  it('queryWithinRoot finds element within shadow root when available', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const target = document.createElement('span');
    target.className = 'inside-shadow';
    shadow.appendChild(target);
    document.body.appendChild(host);

    expect(queryWithinRoot(host, '.inside-shadow')).toBe(target);

    document.body.removeChild(host);
  });

  it('queryWithinRoot falls back to document query when no shadow root present', () => {
    const fallback = document.createElement('div');
    fallback.className = 'outside';
    document.body.appendChild(fallback);

    expect(queryWithinRoot(null, '.outside')).toBe(fallback);

    document.body.removeChild(fallback);
  });

  it('findInEventPath returns matching node from composedPath', () => {
    const button = document.createElement('button');
    button.className = 'click-me';
    const fakeEvent = {
      composedPath: () => [button, document.body],
    };

    expect(findInEventPath(fakeEvent, '.click-me')).toBe(button);
  });

  it('findInEventPath returns undefined when nothing matches', () => {
    const fakeEvent = {
      composedPath: () => [document.body],
    };

    expect(findInEventPath(fakeEvent, '.missing')).toBeUndefined();
  });
});
