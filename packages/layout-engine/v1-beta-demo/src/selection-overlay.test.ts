import { describe, it, expect, beforeEach } from 'vitest';
import { SelectionOverlay } from './selection-overlay';
import { createSampleDoc } from './test-utils';

describe('SelectionOverlay', () => {
  let root: HTMLElement;
  let layoutContainer: HTMLElement;
  let overlay: SelectionOverlay;
  const sample = createSampleDoc();

  beforeEach(() => {
    root = document.createElement('div');
    layoutContainer = document.createElement('div');

    // Create mock page elements for testing
    const page0 = document.createElement('div');
    page0.className = 'superdoc-page';
    page0.dataset.pageIndex = '0'; // Note: pageIndex is 0-indexed, stable across sections
    page0.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 612,
        bottom: 792,
        width: 612,
        height: 792,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    layoutContainer.appendChild(page0);

    root.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 612,
        bottom: 792,
        width: 612,
        height: 792,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    document.body.appendChild(layoutContainer);
    document.body.appendChild(root);
    overlay = new SelectionOverlay(root, layoutContainer);
  });

  it('renders selection rectangles for range selections', () => {
    overlay.update({
      layout: sample.layout,
      blocks: sample.blocks,
      measures: sample.measures,
      selection: { from: 2, to: 4 },
    });
    expect(root.querySelectorAll('.selection-overlay__rect')).toHaveLength(1);
  });

  it('renders a caret for collapsed selections', () => {
    overlay.update({
      layout: sample.layout,
      blocks: sample.blocks,
      measures: sample.measures,
      selection: { from: 3, to: 3 },
    });
    expect(root.querySelector('.selection-overlay__caret')).toBeTruthy();
  });
});
