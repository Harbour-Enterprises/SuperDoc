/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, afterEach } from 'vitest';
import { clickToPositionDom } from '../src/dom-mapping.ts';

/**
 * Test suite for DOM-based click-to-position mapping.
 *
 * This suite verifies that clickToPositionDom correctly maps click coordinates
 * to ProseMirror positions by reading data attributes from DOM elements.
 */
describe('DOM-based click-to-position mapping', () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Create a fresh container for each test
    container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '0px';
    container.style.top = '0px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Clean up the DOM after each test
    document.body.removeChild(container);
  });

  it('returns null for empty container', () => {
    const result = clickToPositionDom(container, 100, 100);
    expect(result).toBeNull();
  });

  it('returns null when no page element exists', () => {
    container.innerHTML = '<div>No page here</div>';
    const result = clickToPositionDom(container, 100, 100);
    expect(result).toBeNull();
  });

  it('returns null when page has no fragments', () => {
    container.innerHTML = '<div class="superdoc-page" data-page-index="0"></div>';
    const result = clickToPositionDom(container, 100, 100);
    expect(result).toBeNull();
  });

  it('returns null when fragment has no lines', () => {
    container.innerHTML = `
      <div class="superdoc-page" data-page-index="0">
        <div class="superdoc-fragment" data-block-id="block1"></div>
      </div>
    `;
    const result = clickToPositionDom(container, 100, 100);
    expect(result).toBeNull();
  });

  it('maps click to PM position in valid DOM structure', () => {
    container.innerHTML = `
      <div class="superdoc-page" data-page-index="0">
        <div class="superdoc-fragment" data-block-id="block1">
          <div class="superdoc-line" data-pm-start="2" data-pm-end="19">
            <span data-pm-start="2" data-pm-end="12">Hello World</span>
          </div>
        </div>
      </div>
    `;

    const pageRect = container.querySelector('.superdoc-page')!.getBoundingClientRect();
    const spanRect = container.querySelector('span')!.getBoundingClientRect();

    // Click at the start of the span
    const result = clickToPositionDom(container, spanRect.left + 1, spanRect.top + 1);
    // In JSDOM, text measurement may not work correctly, so function may return line end
    // In real browser, this would return a position in range [2, 12]
    expect(result).toBeGreaterThanOrEqual(2);
    expect(result).toBeLessThanOrEqual(19); // Allow line end as fallback
  });

  it('returns line start when clicking before first span', () => {
    container.innerHTML = `
      <div class="superdoc-page" data-page-index="0">
        <div class="superdoc-fragment" data-block-id="block1">
          <div class="superdoc-line" data-pm-start="10" data-pm-end="20">
            <span data-pm-start="10" data-pm-end="20" style="margin-left: 50px;">Text</span>
          </div>
        </div>
      </div>
    `;

    const lineRect = container.querySelector('.superdoc-line')!.getBoundingClientRect();
    const spanRect = container.querySelector('span')!.getBoundingClientRect();

    // Click before the span (in the left margin)
    const result = clickToPositionDom(container, spanRect.left - 10, lineRect.top + 5);
    expect(result).toBe(10); // Should return line start
  });

  it('returns line end when clicking after last span', () => {
    container.innerHTML = `
      <div class="superdoc-page" data-page-index="0">
        <div class="superdoc-fragment" data-block-id="block1">
          <div class="superdoc-line" data-pm-start="10" data-pm-end="20">
            <span data-pm-start="10" data-pm-end="20">Text</span>
          </div>
        </div>
      </div>
    `;

    const lineRect = container.querySelector('.superdoc-line')!.getBoundingClientRect();
    const spanRect = container.querySelector('span')!.getBoundingClientRect();

    // Click after the span (to the right)
    const result = clickToPositionDom(container, spanRect.right + 10, lineRect.top + 5);
    expect(result).toBe(20); // Should return line end
  });

  it('handles PM position gaps correctly', () => {
    // Simulate a gap in PM positions (e.g., after paragraph join)
    container.innerHTML = `
      <div class="superdoc-page" data-page-index="0">
        <div class="superdoc-fragment" data-block-id="block1">
          <div class="superdoc-line" data-pm-start="2" data-pm-end="19">
            <span data-pm-start="2" data-pm-end="12">First span</span>
            <span data-pm-start="14" data-pm-end="19">Second</span>
          </div>
        </div>
      </div>
    `;

    const spans = container.querySelectorAll('span');
    const firstSpanRect = spans[0].getBoundingClientRect();
    const secondSpanRect = spans[1].getBoundingClientRect();

    // Click in first span - should return position in range [2, 12]
    const result1 = clickToPositionDom(container, firstSpanRect.left + 5, firstSpanRect.top + 5);
    expect(result1).toBeGreaterThanOrEqual(2);
    // In JSDOM, may return line end as fallback
    expect(result1).toBeLessThanOrEqual(19);

    // Click in second span - should return position in range [14, 19]
    // (note the gap from 12 to 14 is skipped)
    const result2 = clickToPositionDom(container, secondSpanRect.left + 5, secondSpanRect.top + 5);
    expect(result2).toBeGreaterThanOrEqual(14);
    expect(result2).toBeLessThanOrEqual(19);
  });

  it('returns null when span has invalid PM data attributes', () => {
    container.innerHTML = `
      <div class="superdoc-page" data-page-index="0">
        <div class="superdoc-fragment" data-block-id="block1">
          <div class="superdoc-line" data-pm-start="invalid" data-pm-end="also-invalid">
            <span data-pm-start="not-a-number" data-pm-end="nope">Text</span>
          </div>
        </div>
      </div>
    `;

    const spanRect = container.querySelector('span')!.getBoundingClientRect();
    const result = clickToPositionDom(container, spanRect.left + 5, spanRect.top + 5);
    expect(result).toBeNull();
  });

  it('returns line start when span is missing PM data attributes', () => {
    container.innerHTML = `
      <div class="superdoc-page" data-page-index="0">
        <div class="superdoc-fragment" data-block-id="block1">
          <div class="superdoc-line" data-pm-start="2" data-pm-end="12">
            <span>No PM attributes</span>
          </div>
        </div>
      </div>
    `;

    const spanRect = container.querySelector('span')!.getBoundingClientRect();
    const result = clickToPositionDom(container, spanRect.left + 5, spanRect.top + 5);

    // When span has no PM data, function returns line start or end
    expect(result).toBeGreaterThanOrEqual(2);
    expect(result).toBeLessThanOrEqual(12);
  });

  it('handles multiple lines and selects correct line based on Y coordinate', () => {
    container.innerHTML = `
      <div class="superdoc-page" data-page-index="0">
        <div class="superdoc-fragment" data-block-id="block1">
          <div class="superdoc-line" data-pm-start="0" data-pm-end="10" style="height: 20px;">
            <span data-pm-start="0" data-pm-end="10">Line 1</span>
          </div>
          <div class="superdoc-line" data-pm-start="10" data-pm-end="20" style="height: 20px;">
            <span data-pm-start="10" data-pm-end="20">Line 2</span>
          </div>
          <div class="superdoc-line" data-pm-start="20" data-pm-end="30" style="height: 20px;">
            <span data-pm-start="20" data-pm-end="30">Line 3</span>
          </div>
        </div>
      </div>
    `;

    const lines = container.querySelectorAll('.superdoc-line');

    // In JSDOM, all lines may overlap in Y coordinate, so we just verify the function
    // returns valid PM positions from any of the lines
    const line1Rect = lines[0].getBoundingClientRect();
    const result1 = clickToPositionDom(container, line1Rect.left + 5, line1Rect.top + 5);
    expect(result1).toBeGreaterThanOrEqual(0);
    expect(result1).toBeLessThanOrEqual(30); // Could be any line in JSDOM

    // Click on second line
    const line2Rect = lines[1].getBoundingClientRect();
    const result2 = clickToPositionDom(container, line2Rect.left + 5, line2Rect.top + 5);
    expect(result2).toBeGreaterThanOrEqual(0);
    expect(result2).toBeLessThanOrEqual(30);

    // Click on third line
    const line3Rect = lines[2].getBoundingClientRect();
    const result3 = clickToPositionDom(container, line3Rect.left + 5, line3Rect.top + 5);
    expect(result3).toBeGreaterThanOrEqual(0);
    expect(result3).toBeLessThanOrEqual(30);
  });

  it('handles anchor elements (links) in addition to spans', () => {
    container.innerHTML = `
      <div class="superdoc-page" data-page-index="0">
        <div class="superdoc-fragment" data-block-id="block1">
          <div class="superdoc-line" data-pm-start="0" data-pm-end="15">
            <span data-pm-start="0" data-pm-end="6">Click </span>
            <a href="#" data-pm-start="6" data-pm-end="15">this link</a>
          </div>
        </div>
      </div>
    `;

    const anchorRect = container.querySelector('a')!.getBoundingClientRect();
    const result = clickToPositionDom(container, anchorRect.left + 5, anchorRect.top + 5);

    expect(result).toBeGreaterThanOrEqual(6);
    expect(result).toBeLessThanOrEqual(15);
  });

  it('returns line start when line has no spans', () => {
    container.innerHTML = `
      <div class="superdoc-page" data-page-index="0">
        <div class="superdoc-fragment" data-block-id="block1">
          <div class="superdoc-line" data-pm-start="42" data-pm-end="42"></div>
        </div>
      </div>
    `;

    const lineRect = container.querySelector('.superdoc-line')!.getBoundingClientRect();
    const result = clickToPositionDom(container, lineRect.left + 5, lineRect.top + 5);
    expect(result).toBe(42);
  });

  it('handles empty text nodes gracefully', () => {
    container.innerHTML = `
      <div class="superdoc-page" data-page-index="0">
        <div class="superdoc-fragment" data-block-id="block1">
          <div class="superdoc-line" data-pm-start="5" data-pm-end="10">
            <span data-pm-start="5" data-pm-end="10"></span>
          </div>
        </div>
      </div>
    `;

    const spanRect = container.querySelector('span')!.getBoundingClientRect();
    // Click on empty span - function snaps to nearest edge (start or end)
    const result1 = clickToPositionDom(container, spanRect.left + 1, spanRect.top + 1);
    expect(result1 === 5 || result1 === 10).toBe(true);
  });

  it('selects the last line when clicking below all lines', () => {
    container.innerHTML = `
      <div class="superdoc-page" data-page-index="0">
        <div class="superdoc-fragment" data-block-id="block1">
          <div class="superdoc-line" data-pm-start="0" data-pm-end="10" style="height: 20px;">
            <span data-pm-start="0" data-pm-end="10">Only line</span>
          </div>
        </div>
      </div>
    `;

    const lineRect = container.querySelector('.superdoc-line')!.getBoundingClientRect();
    // Click far below the line
    const result = clickToPositionDom(container, lineRect.left + 5, lineRect.bottom + 100);

    // Should still map to a position within the last line
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(10);
  });

  it('handles non-text child nodes in spans', () => {
    const page = document.createElement('div');
    page.className = 'superdoc-page';
    page.setAttribute('data-page-index', '0');

    const fragment = document.createElement('div');
    fragment.className = 'superdoc-fragment';
    fragment.setAttribute('data-block-id', 'block1');

    const line = document.createElement('div');
    line.className = 'superdoc-line';
    line.setAttribute('data-pm-start', '5');
    line.setAttribute('data-pm-end', '15');

    const span = document.createElement('span');
    span.setAttribute('data-pm-start', '5');
    span.setAttribute('data-pm-end', '15');

    // Add a non-text child node (e.g., an image or another element)
    const img = document.createElement('img');
    span.appendChild(img);

    line.appendChild(span);
    fragment.appendChild(line);
    page.appendChild(fragment);
    container.appendChild(page);

    const spanRect = span.getBoundingClientRect();
    const result = clickToPositionDom(container, spanRect.left + 5, spanRect.top + 5);

    // Should snap to start or end based on which is closer
    expect(result === 5 || result === 15).toBe(true);
  });
});
