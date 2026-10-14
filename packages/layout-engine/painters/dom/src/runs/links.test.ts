import { describe, expect, it } from 'vite-plus/test';
import { buildLinkRenderData } from './links.js';

describe('imported bookmark links', () => {
  for (const input of [{ anchor: '_heading=h198104667' }, { href: '#_heading=h198104667' }]) {
    it(`preserves equals in ${Object.keys(input)[0]} destinations`, () => {
      expect(buildLinkRenderData({ version: 2, ...input })).toMatchObject({ href: '#_heading=h198104667' });
    });
  }
  it('preserves square bracket encoding alongside equals', () => {
    expect(buildLinkRenderData({ version: 2, anchor: 'Target[1]=Clause' })).toMatchObject({
      href: '#Target%5B1%5D%3DClause',
    });
  });
  for (const input of [
    { anchor: 'bad=" onclick="alert(1)' },
    { href: '#bad=<script>' },
    { href: 'javascript:alert(1)' },
    { anchor: 'bad:name' },
    { anchor: '' },
  ]) {
    it(`blocks unsafe or empty destination ${JSON.stringify(input)}`, () => {
      expect(buildLinkRenderData({ version: 2, ...input })).toMatchObject({ blocked: true });
    });
  }
});
