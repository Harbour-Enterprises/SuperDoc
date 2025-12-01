/**
 * Layout Coordinator
 *
 * Manages the async layout lifecycle with cancellation, coalescing, and priority scheduling.
 * Orchestrates the execution of layout operations across different priority levels:
 *
 * - P0: Synchronous, immediate execution for cursor positioning (<5ms)
 * - P1+: Debounced, async execution with cancellation support
 *
 * The coordinator ensures that:
 * 1. High-priority work (cursor) never blocks on low-priority work (full layout)
 * 2. Redundant layout operations are coalesced via debouncing
 * 3. Stale layout operations are cancelled when new input arrives
 * 4. Layout version tracking prevents race conditions
 *
 * @module layout-coordinator
 */

import type { LayoutVersionManager } from './layout-version-manager';
import { LayoutScheduler, Priority, type LayoutRequest } from './layout-scheduler';
import type { Layout, FlowBlock, Measure } from '@superdoc/contracts';

/**
 * Result of a layout operation.
 */
export interface LayoutResult {
  /** Version number this layout corresponds to */
  version: number;
  /** Computed layout */
  layout: Layout;
  /** Flow blocks */
  blocks: FlowBlock[];
  /** Block measurements */
  measures: Measure[];
  /** Whether the layout completed successfully */
  completed: boolean;
  /** Whether the layout was aborted */
  aborted: boolean;
}

/**
 * Executor function for P0 (synchronous) layout operations.
 */
export type P0Executor = (request: LayoutRequest) => LayoutResult;

/**
 * Executor function for P1 (async viewport) layout operations.
 */
export type P1Executor = (request: LayoutRequest) => Promise<LayoutResult>;

/**
 * Executor function for P2/P3 (worker) layout operations.
 */
export type WorkerExecutor = (request: LayoutRequest) => Promise<LayoutResult>;

/**
 * Dependencies for LayoutCoordinator.
 */
export interface LayoutCoordinatorDeps {
  /** Layout version manager for tracking PM/layout synchronization */
  layoutVersionManager: LayoutVersionManager;
  /** Executor for P0 (sync) layout operations */
  executeP0: P0Executor;
  /** Executor for P1 (async viewport) layout operations */
  executeP1: P1Executor;
  /** Executor for P2/P3 (worker) layout operations */
  executeWorker: WorkerExecutor;
}

/**
 * Debounce delay for each priority level (in milliseconds).
 *
 * These delays are carefully tuned to balance responsiveness with performance:
 * - P0: No debounce - immediate cursor positioning is critical for typing feel
 * - P1: One frame (16ms) - allows browser to complete current frame before viewport layout
 * - P2: 50ms - coalesces rapid typing bursts for adjacent page layout
 * - P3: 150ms - heavily debounces full document layout to avoid wasted work
 */
const DEBOUNCE_DELAYS: Record<Priority, number> = {
  /** P0: No debounce for synchronous cursor positioning */
  [Priority.P0]: 0,
  /** P1: One animation frame (~60fps) for viewport layout */
  [Priority.P1]: 16,
  /** P2: Typing burst threshold for adjacent pages layout */
  [Priority.P2]: 50,
  /** P3: Heavy debounce for full document layout */
  [Priority.P3]: 150,
};

/**
 * LayoutCoordinator manages the async layout lifecycle with cancellation and coalescing.
 *
 * This coordinator is the central hub for all layout operations. It:
 * - Schedules layout operations by priority
 * - Debounces repeated requests to avoid redundant work
 * - Cancels stale operations when new input arrives
 * - Tracks version numbers to prevent race conditions
 *
 * Performance targets:
 * - P0 dispatch: <1ms
 * - P1 dispatch: <5ms
 * - Debouncing prevents redundant layouts during typing bursts
 *
 * Usage:
 * ```typescript
 * const coordinator = new LayoutCoordinator({
 *   layoutVersionManager,
 *   executeP0: (req) => doSyncLayout(req),
 *   executeP1: (req) => doViewportLayout(req),
 *   executeWorker: (req) => doWorkerLayout(req),
 * });
 *
 * // On each keystroke
 * coordinator.scheduleLayout(version, Priority.P0, { scope: 'paragraph', paragraphIndex: 5 });
 * coordinator.scheduleLayout(version, Priority.P1, { scope: 'viewport' });
 *
 * // Cancel low-priority work when new input arrives
 * coordinator.interruptBelow(Priority.P1);
 * ```
 */
export class LayoutCoordinator {
  private scheduler: LayoutScheduler;
  private layoutVersionManager: LayoutVersionManager;
  private executeP0: P0Executor;
  private executeP1: P1Executor;
  private executeWorker: WorkerExecutor;

  /** Pending version for next layout */
  private pendingVersion: number = 0;

  /** Abort controller for cancellable operations */
  private abortController: AbortController | null = null;

  /** Debounce timers by priority */
  private debounceTimers: Map<Priority, ReturnType<typeof setTimeout>> = new Map();

  /** Pending requests by priority (for coalescing) */
  private pendingRequests: Map<Priority, LayoutRequest> = new Map();

  /**
   * Creates a new LayoutCoordinator.
   *
   * @param deps - Dependencies for the coordinator
   */
  constructor(deps: LayoutCoordinatorDeps) {
    this.scheduler = new LayoutScheduler();
    this.layoutVersionManager = deps.layoutVersionManager;
    this.executeP0 = deps.executeP0;
    this.executeP1 = deps.executeP1;
    this.executeWorker = deps.executeWorker;
  }

  /**
   * Schedule a layout operation with the given priority.
   *
   * - P0: Executes immediately (synchronous)
   * - P1+: Debounced and dispatched asynchronously with cancellation support
   *
   * @param version - PM document version
   * @param priority - Priority level for this layout
   * @param options - Additional options for the layout request
   */
  scheduleLayout(version: number, priority: Priority, options?: Partial<LayoutRequest>): void {
    this.pendingVersion = version;

    const request: LayoutRequest = {
      version,
      priority,
      scope: options?.scope ?? 'full',
      paragraphIndex: options?.paragraphIndex,
      abortSignal: this.abortController?.signal,
    };

    // P0 is synchronous and immediate - no debouncing
    if (priority === Priority.P0) {
      this.executeP0Layout(request);
      return;
    }

    // For P1+, debounce to coalesce multiple rapid requests
    this.debouncedSchedule(request);
  }

  /**
   * Execute a P0 (synchronous) layout operation immediately.
   *
   * @param request - The layout request
   */
  private executeP0Layout(request: LayoutRequest): void {
    try {
      const result = this.executeP0(request);

      if (result.completed && !result.aborted) {
        this.layoutVersionManager.onLayoutComplete(request.version);
      }
    } catch (error) {
      console.error('[LayoutCoordinator] P0 layout failed:', error);
    }
  }

  /**
   * Schedule an async layout with debouncing.
   *
   * Coalesces multiple requests at the same priority level by cancelling
   * the pending timer and scheduling a new one.
   *
   * @param request - The layout request
   */
  private debouncedSchedule(request: LayoutRequest): void {
    const { priority } = request;

    // Clear existing timer for this priority
    const existingTimer = this.debounceTimers.get(priority);
    if (existingTimer !== undefined) {
      clearTimeout(existingTimer);
    }

    // Store the request for coalescing
    this.pendingRequests.set(priority, request);

    // Schedule execution after debounce delay
    const delay = DEBOUNCE_DELAYS[priority];
    const timer = setTimeout(() => {
      this.debounceTimers.delete(priority);
      const pendingRequest = this.pendingRequests.get(priority);
      if (pendingRequest) {
        this.pendingRequests.delete(priority);
        this.executeAsyncLayout(pendingRequest);
      }
    }, delay);

    this.debounceTimers.set(priority, timer);
  }

  /**
   * Execute an async layout operation (P1, P2, P3).
   *
   * @param request - The layout request
   */
  private async executeAsyncLayout(request: LayoutRequest): Promise<void> {
    // Create new abort controller for this operation
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    request.abortSignal = this.abortController.signal;

    // Enqueue in scheduler and immediately dequeue to mark as running
    this.scheduler.enqueue(request);
    this.scheduler.dequeue();

    // Execute based on priority
    try {
      let result: LayoutResult;

      if (request.priority === Priority.P1) {
        result = await this.executeP1(request);
      } else {
        // P2/P3 go to worker
        result = await this.executeWorker(request);
      }

      // Check if aborted
      if (request.abortSignal?.aborted || result.aborted) {
        this.scheduler.completeCurrentTask();
        return;
      }

      // Mark layout as complete
      if (result.completed) {
        this.layoutVersionManager.onLayoutComplete(request.version);
        this.scheduler.completeCurrentTask();
      }
    } catch (error) {
      // Handle abort errors gracefully
      if (error instanceof Error && error.name === 'AbortError') {
        this.scheduler.completeCurrentTask();
        return;
      }

      console.error('[LayoutCoordinator] Async layout failed:', error);
      this.scheduler.completeCurrentTask();
    }
  }

  /**
   * Interrupt and cancel all pending layouts below a certain priority.
   *
   * Called when new user input arrives - we want to cancel background work
   * to prioritize the new input.
   *
   * For example, interruptBelow(Priority.P1) cancels P1, P2, and P3 work
   * while preserving P0 work.
   *
   * @param priority - The priority threshold (inclusive)
   */
  interruptBelow(priority: Priority): void {
    // Abort pending async operations
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Clear debounce timers for affected priorities
    for (let p = priority; p <= Priority.P3; p++) {
      const timer = this.debounceTimers.get(p);
      if (timer !== undefined) {
        clearTimeout(timer);
        this.debounceTimers.delete(p);
      }
      this.pendingRequests.delete(p);
    }

    // Abort tasks in scheduler
    this.scheduler.abortBelow(priority);
  }

  /**
   * Get the current pending version.
   *
   * @returns The version number of the most recently scheduled layout
   */
  getPendingVersion(): number {
    return this.pendingVersion;
  }

  /**
   * Check if there are pending layouts.
   *
   * @returns true if there are pending or debounced layouts
   */
  hasPendingLayouts(): boolean {
    return this.scheduler.hasPending() || this.debounceTimers.size > 0;
  }

  /**
   * Get scheduler queue statistics.
   *
   * @returns Queue statistics by priority
   */
  getQueueStats() {
    return this.scheduler.getQueueStats();
  }

  /**
   * Destroy and clean up the coordinator.
   *
   * Cancels all pending operations and clears timers.
   */
  destroy(): void {
    // Abort all operations
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.pendingRequests.clear();

    // Clear scheduler
    this.scheduler.clear();
  }
}
