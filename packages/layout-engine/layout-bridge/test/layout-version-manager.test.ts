import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LayoutVersionManager } from '../src/layout-version-manager';

describe('LayoutVersionManager', () => {
  let manager: LayoutVersionManager;

  beforeEach(() => {
    manager = new LayoutVersionManager();
    vi.useFakeTimers();
  });

  describe('initialization', () => {
    it('should start with version 0', () => {
      expect(manager.getCurrentVersion()).toBe(0);
      expect(manager.getLatestLayoutVersion()).toBe(0);
    });

    it('should not be stale initially', () => {
      expect(manager.isLayoutStale()).toBe(false);
    });

    it('should have zero version gap initially', () => {
      expect(manager.getVersionGap()).toBe(0);
    });

    it('should have zero staleness duration initially', () => {
      expect(manager.getStalenessDuration()).toBe(0);
    });
  });

  describe('onPmTransaction', () => {
    it('should increment PM version', () => {
      manager.onPmTransaction();
      expect(manager.getCurrentVersion()).toBe(1);

      manager.onPmTransaction();
      expect(manager.getCurrentVersion()).toBe(2);
    });

    it('should mark layout as stale', () => {
      manager.onPmTransaction();
      expect(manager.isLayoutStale()).toBe(true);
    });

    it('should create version gap', () => {
      manager.onPmTransaction();
      expect(manager.getVersionGap()).toBe(1);

      manager.onPmTransaction();
      expect(manager.getVersionGap()).toBe(2);
    });

    it('should start tracking staleness duration', () => {
      const startTime = Date.now();
      manager.onPmTransaction();

      vi.advanceTimersByTime(100);
      expect(manager.getStalenessDuration()).toBe(100);

      vi.advanceTimersByTime(50);
      expect(manager.getStalenessDuration()).toBe(150);
    });
  });

  describe('onLayoutComplete', () => {
    it('should update layout version when catching up', () => {
      manager.onPmTransaction(); // PM version = 1
      manager.onLayoutComplete(1);

      expect(manager.getLatestLayoutVersion()).toBe(1);
      expect(manager.isLayoutStale()).toBe(false);
    });

    it('should clear staleness when caught up', () => {
      manager.onPmTransaction(); // PM version = 1
      vi.advanceTimersByTime(100);

      manager.onLayoutComplete(1);

      expect(manager.isLayoutStale()).toBe(false);
      expect(manager.getStalenessDuration()).toBe(0);
    });

    it('should ignore out-of-order completions', () => {
      manager.onPmTransaction(); // PM version = 1
      manager.onPmTransaction(); // PM version = 2
      manager.onPmTransaction(); // PM version = 3

      // Layout 3 completes first (fast path)
      manager.onLayoutComplete(3);
      expect(manager.getLatestLayoutVersion()).toBe(3);

      // Layout 1 completes later (slow path) - should be ignored
      manager.onLayoutComplete(1);
      expect(manager.getLatestLayoutVersion()).toBe(3);

      // Layout 2 completes last - should be ignored
      manager.onLayoutComplete(2);
      expect(manager.getLatestLayoutVersion()).toBe(3);
    });

    it('should accept newer versions that arrive later', () => {
      manager.onLayoutComplete(1);
      expect(manager.getLatestLayoutVersion()).toBe(1);

      manager.onLayoutComplete(3);
      expect(manager.getLatestLayoutVersion()).toBe(3);

      manager.onLayoutComplete(5);
      expect(manager.getLatestLayoutVersion()).toBe(5);
    });

    it('should maintain staleness if layout is still behind', () => {
      manager.onPmTransaction(); // PM version = 1
      manager.onPmTransaction(); // PM version = 2
      manager.onPmTransaction(); // PM version = 3

      manager.onLayoutComplete(1);

      expect(manager.isLayoutStale()).toBe(true);
      expect(manager.getVersionGap()).toBe(2);
    });
  });

  describe('isLayoutStale', () => {
    it('should return false when layout is synchronized', () => {
      manager.onPmTransaction();
      manager.onLayoutComplete(1);

      expect(manager.isLayoutStale()).toBe(false);
    });

    it('should return true when layout is behind', () => {
      manager.onPmTransaction();
      manager.onPmTransaction();
      manager.onLayoutComplete(1);

      expect(manager.isLayoutStale()).toBe(true);
    });

    it('should return false when layout is ahead (unusual but valid)', () => {
      // This can happen after a reset or in edge cases
      manager.onLayoutComplete(5);
      manager.onPmTransaction(); // PM version = 1

      expect(manager.isLayoutStale()).toBe(false);
    });
  });

  describe('getVersionGap', () => {
    it('should return 0 when synchronized', () => {
      manager.onPmTransaction();
      manager.onLayoutComplete(1);

      expect(manager.getVersionGap()).toBe(0);
    });

    it('should return positive gap when layout is behind', () => {
      manager.onPmTransaction(); // PM = 1
      manager.onPmTransaction(); // PM = 2
      manager.onPmTransaction(); // PM = 3
      manager.onLayoutComplete(1); // Layout = 1

      expect(manager.getVersionGap()).toBe(2);
    });

    it('should never return negative gap', () => {
      manager.onLayoutComplete(10);
      manager.onPmTransaction(); // PM = 1

      expect(manager.getVersionGap()).toBe(0);
    });
  });

  describe('getStalenessDuration', () => {
    it('should return 0 when not stale', () => {
      expect(manager.getStalenessDuration()).toBe(0);
    });

    it('should track duration from first stale transaction', () => {
      manager.onPmTransaction();
      vi.advanceTimersByTime(100);

      expect(manager.getStalenessDuration()).toBe(100);

      manager.onPmTransaction(); // Second transaction
      vi.advanceTimersByTime(50);

      // Duration is from FIRST transaction, not second
      expect(manager.getStalenessDuration()).toBe(150);
    });

    it('should reset to 0 when layout catches up', () => {
      manager.onPmTransaction();
      vi.advanceTimersByTime(100);

      manager.onLayoutComplete(1);

      expect(manager.getStalenessDuration()).toBe(0);
    });

    it('should resume tracking if layout becomes stale again', () => {
      manager.onPmTransaction();
      manager.onLayoutComplete(1);

      vi.advanceTimersByTime(50);

      manager.onPmTransaction();
      vi.advanceTimersByTime(100);

      expect(manager.getStalenessDuration()).toBe(100);
    });
  });

  describe('getMetrics', () => {
    it('should return complete metrics snapshot', () => {
      manager.onPmTransaction(); // PM = 1
      manager.onPmTransaction(); // PM = 2
      manager.onLayoutComplete(1);
      vi.advanceTimersByTime(123);

      const metrics = manager.getMetrics();

      expect(metrics).toEqual({
        currentPmVersion: 2,
        latestLayoutVersion: 1,
        isStale: true,
        versionGap: 1,
        stalenessDuration: 123,
      });
    });

    it('should show synchronized state', () => {
      manager.onPmTransaction();
      manager.onLayoutComplete(1);

      const metrics = manager.getMetrics();

      expect(metrics).toEqual({
        currentPmVersion: 1,
        latestLayoutVersion: 1,
        isStale: false,
        versionGap: 0,
        stalenessDuration: 0,
      });
    });
  });

  describe('reset', () => {
    it('should reset all counters to initial state', () => {
      manager.onPmTransaction();
      manager.onPmTransaction();
      manager.onLayoutComplete(1);
      vi.advanceTimersByTime(100);

      manager.reset();

      expect(manager.getCurrentVersion()).toBe(0);
      expect(manager.getLatestLayoutVersion()).toBe(0);
      expect(manager.isLayoutStale()).toBe(false);
      expect(manager.getVersionGap()).toBe(0);
      expect(manager.getStalenessDuration()).toBe(0);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle rapid typing with slow layout', () => {
      // User types 5 characters rapidly
      for (let i = 0; i < 5; i++) {
        manager.onPmTransaction();
      }

      expect(manager.getCurrentVersion()).toBe(5);
      expect(manager.isLayoutStale()).toBe(true);
      expect(manager.getVersionGap()).toBe(5);

      vi.advanceTimersByTime(150);

      // First layout completes
      manager.onLayoutComplete(1);
      expect(manager.isLayoutStale()).toBe(true);
      expect(manager.getVersionGap()).toBe(4);

      // Eventually layout catches up
      manager.onLayoutComplete(5);
      expect(manager.isLayoutStale()).toBe(false);
      expect(manager.getVersionGap()).toBe(0);
    });

    it('should handle layout completing after multiple transactions', () => {
      // Transaction 1
      manager.onPmTransaction();
      vi.advanceTimersByTime(10);

      // Transaction 2
      manager.onPmTransaction();
      vi.advanceTimersByTime(10);

      // Transaction 3
      manager.onPmTransaction();
      vi.advanceTimersByTime(30);

      // Slow layout for transaction 1 completes after transaction 3
      manager.onLayoutComplete(1);

      // Should still be stale because we're at PM version 3
      expect(manager.isLayoutStale()).toBe(true);
      expect(manager.getStalenessDuration()).toBe(50);
    });

    it('should handle interrupted layout (newer completes before older)', () => {
      manager.onPmTransaction(); // v1
      manager.onPmTransaction(); // v2
      manager.onPmTransaction(); // v3

      // v3 layout completes first (v1 and v2 were cancelled/interrupted)
      manager.onLayoutComplete(3);

      expect(manager.isLayoutStale()).toBe(false);

      // Old v1 layout completes (should be ignored)
      manager.onLayoutComplete(1);

      expect(manager.getLatestLayoutVersion()).toBe(3);
    });

    it('should track staleness during typing burst', () => {
      const startTime = Date.now();

      // Typing burst: 10 characters in 200ms
      for (let i = 0; i < 10; i++) {
        manager.onPmTransaction();
        vi.advanceTimersByTime(20);
      }

      expect(manager.getStalenessDuration()).toBe(200);

      // Layout catches up
      manager.onLayoutComplete(10);

      expect(manager.getStalenessDuration()).toBe(0);
    });
  });
});
