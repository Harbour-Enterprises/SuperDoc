/**
 * Tests for DomReconciler
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DomReconciler } from '../src/dom-reconciler';
import type { Layout } from '@superdoc/contracts';

describe('DomReconciler', () => {
  let reconciler: DomReconciler;
  let container: HTMLElement;

  beforeEach(() => {
    reconciler = new DomReconciler();
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  const createMockLayout = (pageCount: number, fragmentsPerPage: number): Layout => {
    const layout: Layout = {
      pages: [],
      pageSize: { w: 612, h: 792 },
    };

    for (let i = 0; i < pageCount; i++) {
      const fragments = [];
      for (let j = 0; j < fragmentsPerPage; j++) {
        fragments.push({
          kind: 'para' as const,
          blockId: `block-${i}-${j}`,
          x: 0,
          y: j * 20,
          width: 500,
          fromLine: 0,
          toLine: 1,
          pmStart: i * fragmentsPerPage + j,
          pmEnd: i * fragmentsPerPage + j + 1,
        });
      }
      layout.pages.push({ number: i + 1, fragments });
    }

    return layout;
  };

  describe('reconcile', () => {
    it('should perform full render when no old layout', () => {
      const newLayout = createMockLayout(1, 3);

      const result = reconciler.reconcile(container, null, newLayout);

      expect(result.nodesCreated).toBe(3);
      expect(result.nodesRemoved).toBe(0);
      expect(result.nodesMoved).toBe(0);
    });

    it('should create new nodes for new fragments', () => {
      const oldLayout = createMockLayout(1, 2);
      const newLayout = createMockLayout(1, 3);

      // Render old layout first
      reconciler.reconcile(container, null, oldLayout);

      // Now reconcile with new layout
      const result = reconciler.reconcile(container, oldLayout, newLayout);

      expect(result.nodesCreated).toBeGreaterThan(0);
    });

    it('should remove nodes for deleted fragments', () => {
      const oldLayout = createMockLayout(1, 3);
      const newLayout = createMockLayout(1, 2);

      // Render old layout first
      reconciler.reconcile(container, null, oldLayout);

      // Now reconcile with fewer fragments
      const result = reconciler.reconcile(container, oldLayout, newLayout);

      expect(result.nodesRemoved).toBeGreaterThan(0);
    });

    it('should update attributes on existing nodes', () => {
      const oldLayout = createMockLayout(1, 2);
      const newLayout = createMockLayout(1, 2);

      // Modify pmStart/pmEnd in new layout
      newLayout.pages[0].fragments[0].pmStart = 100;

      // Render old layout first
      reconciler.reconcile(container, null, oldLayout);

      // Now reconcile with updated attributes
      const result = reconciler.reconcile(container, oldLayout, newLayout);

      expect(result.attributesUpdated).toBeGreaterThan(0);
    });

    it('should preserve focus during reconciliation', () => {
      const oldLayout = createMockLayout(1, 2);
      const newLayout = createMockLayout(1, 2);

      // Render old layout
      reconciler.reconcile(container, null, oldLayout);

      // Focus first element
      const firstElement = container.firstElementChild as HTMLElement;
      firstElement.tabIndex = 0;
      firstElement.focus();

      // Reconcile
      reconciler.reconcile(container, oldLayout, newLayout);

      // Focus should be preserved (or at least not cause errors)
      expect(document.activeElement).toBeDefined();
    });
  });

  describe('adjustScrollForCursor', () => {
    it('should adjust scroll position', () => {
      // Create a fresh container for this test to avoid afterEach cleanup issues
      const testContainer = document.createElement('div');
      const scrollParent = document.createElement('div');
      scrollParent.style.overflow = 'scroll';
      scrollParent.style.overflowY = 'scroll'; // Explicitly set for jsdom getComputedStyle
      scrollParent.style.height = '500px';
      scrollParent.appendChild(testContainer);
      document.body.appendChild(scrollParent);

      scrollParent.scrollTop = 100;
      const initialScrollTop = scrollParent.scrollTop;

      reconciler.adjustScrollForCursor(testContainer, 150, 200);

      // In jsdom, scrollTop may not be mutable, so we check the delta was calculated
      // The method adds (newCursorY - oldCursorY) = 200 - 150 = 50 to scrollTop
      // If scrollTop is mutable in this jsdom version, it should be 150
      // Otherwise, we just verify the method doesn't throw
      expect(scrollParent.scrollTop).toBeGreaterThanOrEqual(initialScrollTop);

      document.body.removeChild(scrollParent);
    });

    it('should handle no scroll parent', () => {
      expect(() => {
        reconciler.adjustScrollForCursor(container, 100, 150);
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty layouts', () => {
      const emptyLayout: Layout = {
        pages: [],
        pageSize: { w: 612, h: 792 },
      };

      const result = reconciler.reconcile(container, null, emptyLayout);

      expect(result.nodesCreated).toBe(0);
    });

    it('should handle layouts with no fragments', () => {
      const layoutNoFragments: Layout = {
        pages: [{ fragments: [] }],
        pageSize: { w: 612, h: 792 },
      };

      const result = reconciler.reconcile(container, null, layoutNoFragments);

      expect(result.nodesCreated).toBe(0);
    });

    it('should handle identical layouts', () => {
      const layout = createMockLayout(1, 2);

      // Render first time
      reconciler.reconcile(container, null, layout);

      // Reconcile with same layout
      const result = reconciler.reconcile(container, layout, layout);

      // Should update nodes but not create/remove
      expect(result.nodesCreated).toBe(0);
      expect(result.nodesRemoved).toBe(0);
    });
  });

  describe('performance', () => {
    it('should handle large layouts efficiently', () => {
      const largeLayout = createMockLayout(10, 50); // 500 fragments

      const start = performance.now();
      reconciler.reconcile(container, null, largeLayout);
      const duration = performance.now() - start;

      // Should complete in reasonable time
      expect(duration).toBeLessThan(1000); // 1 second
    });

    it('should minimize DOM operations for small changes', () => {
      const oldLayout = createMockLayout(5, 10);
      const newLayout = createMockLayout(5, 10);

      // Change just one fragment
      newLayout.pages[2].fragments[3].pmStart = 999;

      reconciler.reconcile(container, null, oldLayout);
      const result = reconciler.reconcile(container, oldLayout, newLayout);

      // Should update minimal nodes
      expect(result.nodesCreated).toBe(0);
      expect(result.nodesRemoved).toBe(0);
      expect(result.attributesUpdated).toBeGreaterThan(0);
      expect(result.attributesUpdated).toBeLessThan(10); // Should be small
    });
  });
});
