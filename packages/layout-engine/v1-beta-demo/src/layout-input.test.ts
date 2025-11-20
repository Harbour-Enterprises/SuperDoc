import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LayoutInput } from './layout-input';
import * as layoutBridge from '../../layout-bridge/src/index';
import { createSampleDoc } from './test-utils';

describe('LayoutInput', () => {
  let layoutRoot: HTMLElement;
  let page: HTMLElement;
  const sample = createSampleDoc();

  beforeEach(() => {
    layoutRoot = document.createElement('div');
    layoutRoot.style.width = '400px';
    layoutRoot.style.height = '400px';
    layoutRoot.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 400,
        bottom: 400,
        width: 400,
        height: 400,
        x: 0,
        y: 0,
        toJSON() {
          return {};
        },
      }) as DOMRect;
    page = document.createElement('div');
    page.className = 'superdoc-page';
    page.dataset.pageIndex = '0';
    page.getBoundingClientRect = () =>
      ({
        left: 10,
        top: 20,
        right: 210,
        bottom: 820,
        width: 200,
        height: 800,
        x: 10,
        y: 20,
        toJSON() {
          return {};
        },
      }) as DOMRect;
    layoutRoot.appendChild(page);
    document.body.appendChild(layoutRoot);
  });

  afterEach(() => {
    layoutRoot.remove();
  });

  it('maps clicks to selection updates', () => {
    const onUpdate = vi.fn();
    const onFocus = vi.fn();
    const clickSpy = vi
      .spyOn(layoutBridge, 'clickToPosition')
      .mockReturnValue({ pos: 4, pageIndex: 0, column: 0, lineIndex: 0 } as any);
    const input = new LayoutInput({
      layoutRoot,
      layout: () => sample.layout,
      blocks: () => sample.blocks,
      measures: () => sample.measures,
      onUpdateSelection: onUpdate,
      onRequestFocus: onFocus,
    });
    input.enable();

    const fakeEvent = {
      button: 0,
      clientX: 30,
      clientY: 40,
      target: page,
      preventDefault: vi.fn(),
    } as unknown as MouseEvent;
    (input as any).handleMouseDown(fakeEvent);

    expect(onUpdate).toHaveBeenCalledWith(4, 4);
    expect(onFocus).toHaveBeenCalled();
    clickSpy.mockRestore();
    input.disable();
  });
});
