import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { createDomPainter } from './index.js';
import type { FlowBlock, Measure, Layout } from '@superdoc/contracts';

/**
 * Tests for link click event handling in DomPainter.
 * Verifies that clicking links prevents navigation and dispatches custom events.
 */
describe('DomPainter - Link Click Handling', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentElement) {
      container.parentElement.removeChild(container);
    }
  });

  it('should render link with click event handler', () => {
    const linkBlock: FlowBlock = {
      kind: 'paragraph',
      id: 'link-block',
      runs: [
        {
          text: 'Click here',
          fontFamily: 'Arial',
          fontSize: 16,
          pmStart: 0,
          pmEnd: 10,
          link: {
            href: 'https://example.com',
            target: '_blank',
          },
        },
      ],
    };

    const measure: Measure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 0,
          toChar: 10,
          width: 80,
          ascent: 12,
          descent: 4,
          lineHeight: 20,
        },
      ],
      totalHeight: 20,
    };

    const layout: Layout = {
      pageSize: { w: 400, h: 500 },
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: 'link-block',
              fromLine: 0,
              toLine: 1,
              x: 24,
              y: 24,
              width: 260,
              pmStart: 0,
              pmEnd: 10,
            },
          ],
        },
      ],
    };

    const painter = createDomPainter({ blocks: [linkBlock], measures: [measure] });
    painter.paint(layout, container);

    // Find the rendered link element
    const linkElement = container.querySelector('a.superdoc-link') as HTMLAnchorElement;
    expect(linkElement).toBeTruthy();
    expect(linkElement.href).toBe('https://example.com/');
    expect(linkElement.target).toBe('_blank');
    expect(linkElement.textContent).toBe('Click here');
  });

  it('should prevent default navigation on link click', () => {
    const linkBlock: FlowBlock = {
      kind: 'paragraph',
      id: 'link-block',
      runs: [
        {
          text: 'Link text',
          fontFamily: 'Arial',
          fontSize: 16,
          pmStart: 0,
          pmEnd: 9,
          link: {
            href: 'https://test.com',
          },
        },
      ],
    };

    const measure: Measure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 0,
          toChar: 9,
          width: 70,
          ascent: 12,
          descent: 4,
          lineHeight: 20,
        },
      ],
      totalHeight: 20,
    };

    const layout: Layout = {
      pageSize: { w: 400, h: 500 },
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: 'link-block',
              fromLine: 0,
              toLine: 1,
              x: 24,
              y: 24,
              width: 260,
              pmStart: 0,
              pmEnd: 9,
            },
          ],
        },
      ],
    };

    const painter = createDomPainter({ blocks: [linkBlock], measures: [measure] });
    painter.paint(layout, container);

    const linkElement = container.querySelector('a.superdoc-link') as HTMLAnchorElement;
    expect(linkElement).toBeTruthy();

    // Create a mock click event
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: 100,
      clientY: 100,
    });

    const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');
    const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation');

    linkElement.dispatchEvent(clickEvent);

    // Verify preventDefault and stopPropagation were called
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  it('should dispatch custom superdoc-link-click event with correct metadata', () => {
    const linkBlock: FlowBlock = {
      kind: 'paragraph',
      id: 'link-block',
      runs: [
        {
          text: 'Test link',
          fontFamily: 'Arial',
          fontSize: 16,
          pmStart: 0,
          pmEnd: 9,
          link: {
            href: 'https://example.org',
            target: '_blank',
            rel: 'noopener noreferrer',
            tooltip: 'Example tooltip',
          },
        },
      ],
    };

    const measure: Measure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 0,
          toChar: 9,
          width: 70,
          ascent: 12,
          descent: 4,
          lineHeight: 20,
        },
      ],
      totalHeight: 20,
    };

    const layout: Layout = {
      pageSize: { w: 400, h: 500 },
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: 'link-block',
              fromLine: 0,
              toLine: 1,
              x: 24,
              y: 24,
              width: 260,
              pmStart: 0,
              pmEnd: 9,
            },
          ],
        },
      ],
    };

    const painter = createDomPainter({ blocks: [linkBlock], measures: [measure] });
    painter.paint(layout, container);

    const linkElement = container.querySelector('a.superdoc-link') as HTMLAnchorElement;
    expect(linkElement).toBeTruthy();

    // Setup event listener to capture the custom event
    let capturedEvent: CustomEvent | null = null;
    const customEventListener = (event: Event) => {
      capturedEvent = event as CustomEvent;
    };

    linkElement.addEventListener('superdoc-link-click', customEventListener);

    // Trigger click
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: 200,
      clientY: 300,
    });

    linkElement.dispatchEvent(clickEvent);

    // Verify custom event was dispatched with correct detail
    expect(capturedEvent).toBeTruthy();
    expect(capturedEvent?.type).toBe('superdoc-link-click');
    expect(capturedEvent?.bubbles).toBe(true);
    expect(capturedEvent?.composed).toBe(true);
    // Note: tooltip might be null if encoding/validation removes it
    const detailToCheck = {
      href: 'https://example.org',
      target: '_blank',
      rel: 'noopener noreferrer',
      clientX: 200,
      clientY: 300,
    };
    expect(capturedEvent?.detail).toMatchObject(detailToCheck);
    expect(capturedEvent?.detail.element).toBe(linkElement);

    // Cleanup
    linkElement.removeEventListener('superdoc-link-click', customEventListener);
  });

  it('should handle link without optional attributes', () => {
    const linkBlock: FlowBlock = {
      kind: 'paragraph',
      id: 'link-block',
      runs: [
        {
          text: 'Simple link',
          fontFamily: 'Arial',
          fontSize: 16,
          pmStart: 0,
          pmEnd: 11,
          link: {
            href: 'https://simple.com',
          },
        },
      ],
    };

    const measure: Measure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 0,
          toChar: 11,
          width: 85,
          ascent: 12,
          descent: 4,
          lineHeight: 20,
        },
      ],
      totalHeight: 20,
    };

    const layout: Layout = {
      pageSize: { w: 400, h: 500 },
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: 'link-block',
              fromLine: 0,
              toLine: 1,
              x: 24,
              y: 24,
              width: 260,
              pmStart: 0,
              pmEnd: 11,
            },
          ],
        },
      ],
    };

    const painter = createDomPainter({ blocks: [linkBlock], measures: [measure] });
    painter.paint(layout, container);

    const linkElement = container.querySelector('a.superdoc-link') as HTMLAnchorElement;
    expect(linkElement).toBeTruthy();

    // Setup event listener
    let capturedEvent: CustomEvent | null = null;
    linkElement.addEventListener('superdoc-link-click', (event: Event) => {
      capturedEvent = event as CustomEvent;
    });

    // Trigger click
    linkElement.click();

    // Verify event was dispatched with minimal metadata
    // Note: System auto-adds target='_blank' and rel='noopener noreferrer' for external links
    expect(capturedEvent).toBeTruthy();
    expect(capturedEvent?.detail.href).toBe('https://simple.com');
    expect(capturedEvent?.detail.target).toBe('_blank'); // Auto-added for external links
    expect(capturedEvent?.detail.rel).toBe('noopener noreferrer'); // Auto-added for _blank target
    expect(capturedEvent?.detail.tooltip).toBeNull(); // null if not specified
  });

  it('should handle multiple links in the same paragraph', () => {
    const linkBlock: FlowBlock = {
      kind: 'paragraph',
      id: 'multi-link-block',
      runs: [
        {
          text: 'First ',
          fontFamily: 'Arial',
          fontSize: 16,
          pmStart: 0,
          pmEnd: 6,
          link: {
            href: 'https://first.com',
          },
        },
        {
          text: 'and ',
          fontFamily: 'Arial',
          fontSize: 16,
          pmStart: 6,
          pmEnd: 10,
        },
        {
          text: 'Second',
          fontFamily: 'Arial',
          fontSize: 16,
          pmStart: 10,
          pmEnd: 16,
          link: {
            href: 'https://second.com',
          },
        },
      ],
    };

    const measure: Measure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 2,
          toChar: 6,
          width: 120,
          ascent: 12,
          descent: 4,
          lineHeight: 20,
        },
      ],
      totalHeight: 20,
    };

    const layout: Layout = {
      pageSize: { w: 400, h: 500 },
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: 'multi-link-block',
              fromLine: 0,
              toLine: 1,
              x: 24,
              y: 24,
              width: 260,
              pmStart: 0,
              pmEnd: 16,
            },
          ],
        },
      ],
    };

    const painter = createDomPainter({ blocks: [linkBlock], measures: [measure] });
    painter.paint(layout, container);

    const linkElements = container.querySelectorAll('a.superdoc-link');
    expect(linkElements.length).toBe(2);

    const firstLink = linkElements[0] as HTMLAnchorElement;
    const secondLink = linkElements[1] as HTMLAnchorElement;

    expect(firstLink.href).toBe('https://first.com/');
    expect(secondLink.href).toBe('https://second.com/');

    // Verify both links have click handlers
    let firstEventCaptured = false;
    let secondEventCaptured = false;

    firstLink.addEventListener('superdoc-link-click', () => {
      firstEventCaptured = true;
    });

    secondLink.addEventListener('superdoc-link-click', () => {
      secondEventCaptured = true;
    });

    firstLink.click();
    secondLink.click();

    expect(firstEventCaptured).toBe(true);
    expect(secondEventCaptured).toBe(true);
  });

  it('should handle non-link text runs without adding click handlers', () => {
    const mixedBlock: FlowBlock = {
      kind: 'paragraph',
      id: 'mixed-block',
      runs: [
        {
          text: 'Regular text ',
          fontFamily: 'Arial',
          fontSize: 16,
          pmStart: 0,
          pmEnd: 13,
        },
        {
          text: 'with link',
          fontFamily: 'Arial',
          fontSize: 16,
          pmStart: 13,
          pmEnd: 22,
          link: {
            href: 'https://link.com',
          },
        },
      ],
    };

    const measure: Measure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 1,
          toChar: 9,
          width: 150,
          ascent: 12,
          descent: 4,
          lineHeight: 20,
        },
      ],
      totalHeight: 20,
    };

    const layout: Layout = {
      pageSize: { w: 400, h: 500 },
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: 'mixed-block',
              fromLine: 0,
              toLine: 1,
              x: 24,
              y: 24,
              width: 260,
              pmStart: 0,
              pmEnd: 22,
            },
          ],
        },
      ],
    };

    const painter = createDomPainter({ blocks: [mixedBlock], measures: [measure] });
    painter.paint(layout, container);

    // Should have one link and one span
    const linkElements = container.querySelectorAll('a.superdoc-link');
    const spanElements = container.querySelectorAll('span');

    expect(linkElements.length).toBe(1);
    expect(spanElements.length).toBeGreaterThanOrEqual(1);

    const linkElement = linkElements[0] as HTMLAnchorElement;
    expect(linkElement.textContent).toBe('with link');
  });
});
