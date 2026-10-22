/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { DOCX } from '@superdoc/common';
import { SuperDoc } from './SuperDoc.js';

const mountedInstances: SuperDoc[] = [];

function createMountedInstance(): SuperDoc {
  const selector = document.createElement('div');
  document.body.append(selector);
  const instance = new SuperDoc({ selector, telemetry: { enabled: false } });
  mountedInstances.push(instance);
  const editor = { editorVersion: 2, commands: null, state: null, view: null, doc: {} };
  const doc = { id: 'doc', type: DOCX, getEditor: () => editor };
  (instance as unknown as { superdocStore: { documents: unknown[] } }).superdocStore = { documents: [doc] };
  (instance as unknown as { activeEditor: unknown }).activeEditor = editor;
  return instance;
}

afterEach(() => {
  for (const instance of mountedInstances.splice(0)) instance.destroy();
  document.body.innerHTML = '';
});

describe('v1 instance methods with a mounted v2 editor', () => {
  it('search and goToSearchResult return undefined', () => {
    const instance = createMountedInstance();
    const match = { from: 0, to: 1, text: 'a' } as unknown as Parameters<SuperDoc['goToSearchResult']>[0];

    expect(instance.search('a')).toBeUndefined();
    expect(instance.goToSearchResult(match)).toBeUndefined();
  });

  it('getHTML returns an empty list instead of throwing, and says so', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(createMountedInstance().getHTML()).toEqual([]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('doc.getHtml'));
  });
});
