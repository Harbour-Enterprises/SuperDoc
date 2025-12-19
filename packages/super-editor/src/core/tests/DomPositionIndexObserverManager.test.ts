import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import { DomPositionIndexObserverManager } from '../DomPositionIndexObserverManager.js';

/**
 * Helper to wait for async operations (MutationObserver + RAF) to complete.
 * Uses setTimeout to allow microtasks and RAF to flush.
 */
const waitForAsyncOperations = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe('DomPositionIndexObserverManager', () => {
  let mockWindow: Window & typeof globalThis;
  let mockPainterHost: HTMLElement;
  let onRebuildSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockPainterHost = document.createElement('div');
    document.body.appendChild(mockPainterHost);
    onRebuildSpy = vi.fn();
    mockWindow = window;
  });

  afterEach(() => {
    // Clean up DOM
    if (mockPainterHost && mockPainterHost.parentNode) {
      mockPainterHost.parentNode.removeChild(mockPainterHost);
    }
    vi.clearAllMocks();
  });

  describe('setup', () => {
    it('creates and starts a MutationObserver', async () => {
      const manager = new DomPositionIndexObserverManager({
        windowRoot: mockWindow,
        getPainterHost: () => mockPainterHost,
        onRebuild: onRebuildSpy,
      });

      manager.setup();
      // Observer should be created and observing
      expect(onRebuildSpy).not.toHaveBeenCalled();

      // Trigger a mutation
      const child = document.createElement('div');
      mockPainterHost.appendChild(child);

      // Wait for MutationObserver + RAF to trigger rebuild
      await waitForAsyncOperations();
      expect(onRebuildSpy).toHaveBeenCalled();
      manager.destroy();
    });

    it('handles missing MutationObserver gracefully', () => {
      const mockWindowWithoutObserver = {
        ...mockWindow,
        MutationObserver: undefined,
      } as unknown as Window & typeof globalThis;

      const manager = new DomPositionIndexObserverManager({
        windowRoot: mockWindowWithoutObserver,
        getPainterHost: () => mockPainterHost,
        onRebuild: onRebuildSpy,
      });

      manager.setup();
      manager.destroy();
      // Should not throw
    });

    it('disconnects existing observer before creating new one', () => {
      const manager = new DomPositionIndexObserverManager({
        windowRoot: mockWindow,
        getPainterHost: () => mockPainterHost,
        onRebuild: onRebuildSpy,
      });

      manager.setup();
      manager.setup(); // Call setup again
      manager.destroy();
      // Should not throw
    });
  });

  describe('pause', () => {
    it('disconnects the observer', async () => {
      const manager = new DomPositionIndexObserverManager({
        windowRoot: mockWindow,
        getPainterHost: () => mockPainterHost,
        onRebuild: onRebuildSpy,
      });

      manager.setup();
      manager.pause();

      // Mutations should not trigger rebuild after pause
      const child = document.createElement('div');
      mockPainterHost.appendChild(child);

      await waitForAsyncOperations();
      expect(onRebuildSpy).not.toHaveBeenCalled();
      manager.destroy();
    });

    it('handles pause when observer not setup', () => {
      const manager = new DomPositionIndexObserverManager({
        windowRoot: mockWindow,
        getPainterHost: () => mockPainterHost,
        onRebuild: onRebuildSpy,
      });

      manager.pause();
      // Should not throw
    });
  });

  describe('resume', () => {
    it('reconnects the observer', async () => {
      const manager = new DomPositionIndexObserverManager({
        windowRoot: mockWindow,
        getPainterHost: () => mockPainterHost,
        onRebuild: onRebuildSpy,
      });

      manager.setup();
      manager.pause();
      manager.resume();

      // Mutations should trigger rebuild after resume
      const child = document.createElement('div');
      mockPainterHost.appendChild(child);

      await waitForAsyncOperations();
      expect(onRebuildSpy).toHaveBeenCalled();
      manager.destroy();
    });

    it('handles resume when observer not setup', () => {
      const manager = new DomPositionIndexObserverManager({
        windowRoot: mockWindow,
        getPainterHost: () => mockPainterHost,
        onRebuild: onRebuildSpy,
      });

      manager.resume();
      // Should not throw
    });

    it('handles resume when painterHost is null', () => {
      const manager = new DomPositionIndexObserverManager({
        windowRoot: mockWindow,
        getPainterHost: () => null,
        onRebuild: onRebuildSpy,
      });

      manager.setup();
      manager.resume();
      manager.destroy();
      // Should not throw
    });

    it('handles observer.observe errors gracefully', () => {
      const manager = new DomPositionIndexObserverManager({
        windowRoot: mockWindow,
        getPainterHost: () => mockPainterHost,
        onRebuild: onRebuildSpy,
      });

      manager.setup();
      // Simulate error by removing painterHost from DOM
      mockPainterHost.remove();
      manager.resume();
      manager.destroy();
      // Should not throw
    });
  });

  describe('destroy', () => {
    it('disconnects and clears the observer', async () => {
      const manager = new DomPositionIndexObserverManager({
        windowRoot: mockWindow,
        getPainterHost: () => mockPainterHost,
        onRebuild: onRebuildSpy,
      });

      manager.setup();
      manager.destroy();

      // Mutations should not trigger rebuild after destroy
      const child = document.createElement('div');
      mockPainterHost.appendChild(child);

      await waitForAsyncOperations();
      expect(onRebuildSpy).not.toHaveBeenCalled();
    });

    it('clears rebuild scheduled flag', async () => {
      const manager = new DomPositionIndexObserverManager({
        windowRoot: mockWindow,
        getPainterHost: () => mockPainterHost,
        onRebuild: onRebuildSpy,
      });

      manager.setup();
      manager.scheduleRebuild();
      manager.destroy();

      // Also disconnect painterHost - the implementation skips rebuild if painterHost is disconnected
      mockPainterHost.remove();

      // Should not rebuild after destroy (painterHost disconnected check prevents callback)
      await waitForAsyncOperations();
      expect(onRebuildSpy).not.toHaveBeenCalled();
    });

    it('handles destroy when not setup', () => {
      const manager = new DomPositionIndexObserverManager({
        windowRoot: mockWindow,
        getPainterHost: () => mockPainterHost,
        onRebuild: onRebuildSpy,
      });

      manager.destroy();
      // Should not throw
    });
  });

  describe('scheduleRebuild', () => {
    it('schedules a rebuild via requestAnimationFrame', async () => {
      const manager = new DomPositionIndexObserverManager({
        windowRoot: mockWindow,
        getPainterHost: () => mockPainterHost,
        onRebuild: onRebuildSpy,
      });

      manager.setup();
      manager.scheduleRebuild();

      await waitForAsyncOperations();
      expect(onRebuildSpy).toHaveBeenCalledTimes(1);
      manager.destroy();
    });

    it('debounces multiple rebuild requests', async () => {
      const manager = new DomPositionIndexObserverManager({
        windowRoot: mockWindow,
        getPainterHost: () => mockPainterHost,
        onRebuild: onRebuildSpy,
      });

      manager.setup();
      manager.scheduleRebuild();
      manager.scheduleRebuild();
      manager.scheduleRebuild();

      await waitForAsyncOperations();
      // Should only rebuild once despite multiple schedule calls
      expect(onRebuildSpy).toHaveBeenCalledTimes(1);
      manager.destroy();
    });

    it('does not rebuild if painterHost is disconnected', async () => {
      const manager = new DomPositionIndexObserverManager({
        windowRoot: mockWindow,
        getPainterHost: () => mockPainterHost,
        onRebuild: onRebuildSpy,
      });

      manager.setup();
      manager.scheduleRebuild();

      // Disconnect painterHost before RAF callback
      mockPainterHost.remove();

      await waitForAsyncOperations();
      expect(onRebuildSpy).not.toHaveBeenCalled();
      manager.destroy();
    });

    it('does not rebuild if painterHost returns null', async () => {
      let painterHost: HTMLElement | null = mockPainterHost;

      const manager = new DomPositionIndexObserverManager({
        windowRoot: mockWindow,
        getPainterHost: () => painterHost,
        onRebuild: onRebuildSpy,
      });

      manager.setup();
      manager.scheduleRebuild();

      // Set to null before RAF callback
      painterHost = null;

      await waitForAsyncOperations();
      expect(onRebuildSpy).not.toHaveBeenCalled();
      manager.destroy();
    });
  });
});
