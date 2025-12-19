import { describe, expect, it, beforeEach, vi } from 'vitest';

import { DomPositionIndexObserverManager } from '../DomPositionIndexObserverManager.js';

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

  describe('setup', () => {
    it('creates and starts a MutationObserver', () => {
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

      // Wait for RAF to trigger rebuild
      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(onRebuildSpy).toHaveBeenCalled();
          manager.destroy();
          resolve();
        });
      });
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
    it('disconnects the observer', () => {
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

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(onRebuildSpy).not.toHaveBeenCalled();
          manager.destroy();
          resolve();
        });
      });
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
    it('reconnects the observer', () => {
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

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(onRebuildSpy).toHaveBeenCalled();
          manager.destroy();
          resolve();
        });
      });
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
    it('disconnects and clears the observer', () => {
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

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(onRebuildSpy).not.toHaveBeenCalled();
          resolve();
        });
      });
    });

    it('clears rebuild scheduled flag', () => {
      const manager = new DomPositionIndexObserverManager({
        windowRoot: mockWindow,
        getPainterHost: () => mockPainterHost,
        onRebuild: onRebuildSpy,
      });

      manager.setup();
      manager.scheduleRebuild();
      manager.destroy();

      // Should not rebuild after destroy
      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(onRebuildSpy).not.toHaveBeenCalled();
          resolve();
        });
      });
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
    it('schedules a rebuild via requestAnimationFrame', () => {
      const manager = new DomPositionIndexObserverManager({
        windowRoot: mockWindow,
        getPainterHost: () => mockPainterHost,
        onRebuild: onRebuildSpy,
      });

      manager.setup();
      manager.scheduleRebuild();

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(onRebuildSpy).toHaveBeenCalledTimes(1);
          manager.destroy();
          resolve();
        });
      });
    });

    it('debounces multiple rebuild requests', () => {
      const manager = new DomPositionIndexObserverManager({
        windowRoot: mockWindow,
        getPainterHost: () => mockPainterHost,
        onRebuild: onRebuildSpy,
      });

      manager.setup();
      manager.scheduleRebuild();
      manager.scheduleRebuild();
      manager.scheduleRebuild();

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          // Should only rebuild once despite multiple schedule calls
          expect(onRebuildSpy).toHaveBeenCalledTimes(1);
          manager.destroy();
          resolve();
        });
      });
    });

    it('does not rebuild if painterHost is disconnected', () => {
      const manager = new DomPositionIndexObserverManager({
        windowRoot: mockWindow,
        getPainterHost: () => mockPainterHost,
        onRebuild: onRebuildSpy,
      });

      manager.setup();
      manager.scheduleRebuild();

      // Disconnect painterHost before RAF callback
      mockPainterHost.remove();

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(onRebuildSpy).not.toHaveBeenCalled();
          manager.destroy();
          resolve();
        });
      });
    });

    it('does not rebuild if painterHost returns null', () => {
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

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(onRebuildSpy).not.toHaveBeenCalled();
          manager.destroy();
          resolve();
        });
      });
    });
  });
});
