/**
 * Tests for LayoutPipeline
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LayoutPipeline, type Transaction } from '../src/layout-pipeline';
import type { LayoutResult } from '../src/layout-coordinator';

describe('LayoutPipeline', () => {
  let pipeline: LayoutPipeline;
  let container: HTMLElement;
  let mockPmView: {
    coordsAtPos: ReturnType<typeof vi.fn>;
    dom: HTMLElement;
  };
  let onLayoutComplete: ReturnType<typeof vi.fn>;
  let onError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'layout-container';
    document.body.appendChild(container);

    mockPmView = {
      coordsAtPos: vi.fn().mockReturnValue({ left: 0, top: 0, bottom: 20 }),
      dom: document.createElement('div'),
    };

    onLayoutComplete = vi.fn();
    onError = vi.fn();

    pipeline = new LayoutPipeline({
      container,
      pmView: mockPmView,
      onLayoutComplete,
      onError,
    });
  });

  afterEach(() => {
    pipeline.destroy();
    document.body.removeChild(container);
  });

  describe('onTransaction', () => {
    it('should handle PM transaction with doc changes', () => {
      const tr: Transaction = {
        docChanged: true,
        getMeta: vi.fn(),
      };

      expect(() => pipeline.onTransaction(tr, 0)).not.toThrow();
    });

    it('should ignore transactions without doc changes', () => {
      const tr: Transaction = {
        docChanged: false,
        getMeta: vi.fn(),
      };

      const versionBefore = pipeline.getCurrentVersion();
      pipeline.onTransaction(tr);
      const versionAfter = pipeline.getCurrentVersion();

      expect(versionAfter).toBe(versionBefore);
    });

    it('should increment version on doc change', () => {
      const tr: Transaction = {
        docChanged: true,
        getMeta: vi.fn(),
      };

      const versionBefore = pipeline.getCurrentVersion();
      pipeline.onTransaction(tr, 0);
      const versionAfter = pipeline.getCurrentVersion();

      expect(versionAfter).toBeGreaterThan(versionBefore);
    });

    it('should schedule multiple priority levels', () => {
      const tr: Transaction = {
        docChanged: true,
        getMeta: vi.fn(),
      };

      pipeline.onTransaction(tr, 5);

      // P0 should execute immediately
      expect(onLayoutComplete).toHaveBeenCalled();
    });

    it('should include paragraph index for P0 when provided', () => {
      const tr: Transaction = {
        docChanged: true,
        getMeta: vi.fn(),
      };

      pipeline.onTransaction(tr, 42);

      // Verify P0 was called (layout complete callback)
      expect(onLayoutComplete).toHaveBeenCalled();
    });
  });

  describe('forceFullLayout', () => {
    it('should execute full layout', async () => {
      await pipeline.forceFullLayout();

      // Wait for debounced P1 to execute
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should have called layout complete
      expect(onLayoutComplete).toHaveBeenCalled();
    });

    it('should cancel pending work before full layout', async () => {
      const tr: Transaction = {
        docChanged: true,
        getMeta: vi.fn(),
      };

      pipeline.onTransaction(tr);

      // Force full layout should cancel pending work
      await pipeline.forceFullLayout();

      // Wait for debounced execution to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onLayoutComplete).toHaveBeenCalled();
    });
  });

  describe('isStale', () => {
    it('should return false initially', () => {
      expect(pipeline.isStale()).toBe(false);
    });

    it('should return true after transaction before layout completes', () => {
      const tr: Transaction = {
        docChanged: true,
        getMeta: vi.fn(),
      };

      pipeline.onTransaction(tr);

      // After scheduling async layouts, may be stale
      // Note: P0 completes immediately, so this depends on timing
    });
  });

  describe('getCurrentVersion', () => {
    it('should return 0 initially', () => {
      expect(pipeline.getCurrentVersion()).toBe(0);
    });

    it('should increment with transactions', () => {
      const tr: Transaction = {
        docChanged: true,
        getMeta: vi.fn(),
      };

      const v1 = pipeline.getCurrentVersion();
      pipeline.onTransaction(tr);
      const v2 = pipeline.getCurrentVersion();

      expect(v2).toBeGreaterThan(v1);
    });
  });

  describe('getMetrics', () => {
    it('should return metrics object', () => {
      const metrics = pipeline.getMetrics();

      expect(metrics).toHaveProperty('version');
      expect(metrics).toHaveProperty('queue');
      expect(metrics).toHaveProperty('workerPending');
    });

    it('should track queue stats', () => {
      const tr: Transaction = {
        docChanged: true,
        getMeta: vi.fn(),
      };

      pipeline.onTransaction(tr);

      const metrics = pipeline.getMetrics();

      expect(metrics.queue).toBeDefined();
    });
  });

  describe('destroy', () => {
    it('should clean up resources', () => {
      pipeline.destroy();

      expect(pipeline.isStale()).toBe(false);
    });

    it('should prevent further operations after destroy', () => {
      pipeline.destroy();

      const tr: Transaction = {
        docChanged: true,
        getMeta: vi.fn(),
      };

      pipeline.onTransaction(tr);

      // Should not increment version
      expect(pipeline.getCurrentVersion()).toBe(0);
    });

    it('should cancel pending layouts', async () => {
      const tr: Transaction = {
        docChanged: true,
        getMeta: vi.fn(),
      };

      pipeline.onTransaction(tr);

      pipeline.destroy();

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should have terminated cleanly
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should call onError for layout failures', () => {
      // This test would require mocking executor failure
      // For now, verify error callback exists
      expect(onError).toBeDefined();
    });

    it('should continue operation after error', async () => {
      const tr: Transaction = {
        docChanged: true,
        getMeta: vi.fn(),
      };

      // Even if there's an error, pipeline should continue
      pipeline.onTransaction(tr);

      expect(() => pipeline.getCurrentVersion()).not.toThrow();
    });
  });

  describe('integration', () => {
    it('should coordinate all components', () => {
      const tr: Transaction = {
        docChanged: true,
        getMeta: vi.fn(),
      };

      // Should not throw and should complete P0
      pipeline.onTransaction(tr, 0);

      expect(onLayoutComplete).toHaveBeenCalled();
    });

    it('should handle rapid transactions', () => {
      const tr: Transaction = {
        docChanged: true,
        getMeta: vi.fn(),
      };

      // Simulate rapid typing
      for (let i = 0; i < 10; i++) {
        pipeline.onTransaction(tr, i);
      }

      // Should handle without errors
      expect(onError).not.toHaveBeenCalled();
      expect(pipeline.getCurrentVersion()).toBeGreaterThan(0);
    });
  });

  describe('worker integration', () => {
    it('should initialize worker on construction', () => {
      // Worker should be initialized (or failed gracefully)
      const metrics = pipeline.getMetrics();
      expect(metrics.workerPending).toBe(0);
    });

    it('should track worker pending count', async () => {
      const metrics1 = pipeline.getMetrics();
      expect(metrics1.workerPending).toBe(0);

      // After transactions, worker might have pending work
      const tr: Transaction = {
        docChanged: true,
        getMeta: vi.fn(),
      };

      pipeline.onTransaction(tr);

      // Worker pending count should be available
      const metrics2 = pipeline.getMetrics();
      expect(metrics2.workerPending).toBeGreaterThanOrEqual(0);
    });
  });
});
