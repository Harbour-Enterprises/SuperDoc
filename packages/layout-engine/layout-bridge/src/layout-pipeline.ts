/**
 * Layout Pipeline
 *
 * Integration module that wires together the complete layout coordination system.
 * This is the main entry point for the Phase 3 typing performance optimization.
 *
 * The pipeline coordinates:
 * - LayoutScheduler: Priority queue for layout tasks
 * - LayoutCoordinator: Lifecycle management with cancellation
 * - LayoutWorkerManager: Web Worker for background layout
 * - DomReconciler: Surgical DOM updates
 * - LayoutVersionManager: Version tracking
 *
 * It handles the complete flow from PM transaction to DOM update:
 * 1. PM transaction triggers layout request
 * 2. Coordinator schedules with appropriate priority
 * 3. P0 executes sync, P1+ execute async
 * 4. Worker handles P2/P3 background work
 * 5. Reconciler applies changes to DOM
 * 6. Version manager tracks completion
 *
 * @module layout-pipeline
 */

import { LayoutCoordinator, type LayoutResult } from './layout-coordinator';
import { Priority, type LayoutRequest } from './layout-scheduler';
import { LayoutWorkerManager } from './layout-worker';
import { DomReconciler } from './dom-reconciler';
import { LayoutVersionManager } from './layout-version-manager';
import type { PmEditorView } from './pm-dom-fallback';
import type { Layout, FlowBlock, Measure } from '@superdoc/contracts';

/**
 * Minimal interface for ProseMirror Transaction.
 */
export interface Transaction {
  /** Whether the transaction modified the document */
  docChanged: boolean;
  /** Transaction metadata */
  getMeta(key: string): unknown;
}

/**
 * Configuration for LayoutPipeline.
 */
export interface LayoutPipelineConfig {
  /** DOM container for the layout */
  container: HTMLElement;
  /** ProseMirror editor view */
  pmView: PmEditorView;
  /** Callback when layout completes */
  onLayoutComplete: (result: LayoutResult) => void;
  /** Callback for errors */
  onError: (error: Error) => void;
}

/**
 * LayoutPipeline integrates all Phase 3 components into a cohesive system.
 *
 * This pipeline is the main orchestrator for the typing performance optimization.
 * It receives PM transactions, schedules appropriate layout operations, and
 * applies the results to the DOM with minimal overhead.
 *
 * Performance targets:
 * - P0 dispatch: <1ms
 * - P1 dispatch: <5ms
 * - DOM reconciliation: <10ms
 * - Total P0 latency: <16ms (one frame)
 *
 * Usage:
 * ```typescript
 * const pipeline = new LayoutPipeline({
 *   container: document.getElementById('layout-container'),
 *   pmView: editorView,
 *   onLayoutComplete: (result) => {
 *     console.log(`Layout complete: version ${result.version}`);
 *   },
 *   onError: (error) => {
 *     console.error('Layout error:', error);
 *   },
 * });
 *
 * // On each PM transaction
 * pipeline.onTransaction(tr, paragraphIndex);
 *
 * // On window resize
 * await pipeline.forceFullLayout();
 *
 * // Cleanup
 * pipeline.destroy();
 * ```
 */
export class LayoutPipeline {
  private coordinator: LayoutCoordinator;
  private workerManager: LayoutWorkerManager;
  private reconciler: DomReconciler;
  private versionManager: LayoutVersionManager;
  private config: LayoutPipelineConfig;

  /** Current layout state */
  private currentLayout: Layout | null = null;
  private currentBlocks: FlowBlock[] = [];
  private currentMeasures: Measure[] = [];

  /** Whether the pipeline is destroyed */
  private destroyed: boolean = false;

  /**
   * Creates a new LayoutPipeline.
   *
   * @param config - Pipeline configuration
   */
  constructor(config: LayoutPipelineConfig) {
    this.config = config;
    this.versionManager = new LayoutVersionManager();
    this.reconciler = new DomReconciler();
    this.workerManager = new LayoutWorkerManager();

    // Initialize worker
    try {
      this.workerManager.initialize();
    } catch (error) {
      console.warn('[LayoutPipeline] Worker initialization failed, P2/P3 will run on main thread:', error);
    }

    // Create coordinator with executors
    this.coordinator = new LayoutCoordinator({
      layoutVersionManager: this.versionManager,
      executeP0: (request) => this.executeP0Layout(request),
      executeP1: (request) => this.executeP1Layout(request),
      executeWorker: (request) => this.executeWorkerLayout(request),
    });
  }

  /**
   * Handle a ProseMirror transaction.
   *
   * This is the main entry point called on every PM transaction.
   * It triggers the appropriate layout operations:
   * - P0: Current paragraph (sync)
   * - P1: Visible viewport (async, debounced)
   * - P2: Adjacent pages (async, worker, debounced)
   * - P3: Full document (async, worker, debounced)
   *
   * @param tr - The ProseMirror transaction
   * @param paragraphIndex - Optional index of the edited paragraph
   */
  onTransaction(tr: Transaction, paragraphIndex?: number): void {
    if (this.destroyed) {
      return;
    }

    // Only process document changes
    if (!tr.docChanged) {
      return;
    }

    // Increment version
    this.versionManager.onPmTransaction(tr);
    const version = this.versionManager.getCurrentVersion();

    // Cancel low-priority work when new input arrives
    this.coordinator.interruptBelow(Priority.P1);

    // Schedule P0 (current paragraph) - executes immediately
    if (paragraphIndex !== undefined) {
      this.coordinator.scheduleLayout(version, Priority.P0, {
        scope: 'paragraph',
        paragraphIndex,
      });
    }

    // Schedule P1 (viewport) - debounced async
    this.coordinator.scheduleLayout(version, Priority.P1, {
      scope: 'viewport',
    });

    // Schedule P2 (adjacent pages) - debounced async worker
    this.coordinator.scheduleLayout(version, Priority.P2, {
      scope: 'adjacent',
    });

    // Schedule P3 (full document) - debounced async worker
    this.coordinator.scheduleLayout(version, Priority.P3, {
      scope: 'full',
    });
  }

  /**
   * Force a full layout operation.
   *
   * Used when layout must be recomputed from scratch, such as:
   * - Window resize
   * - Page settings change
   * - Manual refresh
   *
   * This cancels all pending work and executes a new full layout.
   *
   * @returns Promise that resolves when layout is complete
   */
  async forceFullLayout(): Promise<void> {
    if (this.destroyed) {
      return;
    }

    // Increment version
    const version = this.versionManager.getCurrentVersion() + 1;

    // Cancel all pending work
    this.coordinator.interruptBelow(Priority.P0);

    // Execute full layout on main thread (P1 priority for responsiveness)
    await this.coordinator.scheduleLayout(version, Priority.P1, {
      scope: 'full',
    });
  }

  /**
   * Check if the layout is stale.
   *
   * @returns true if layout is behind current PM state
   */
  isStale(): boolean {
    return this.versionManager.isLayoutStale();
  }

  /**
   * Get the current version.
   *
   * @returns Current PM document version
   */
  getCurrentVersion(): number {
    return this.versionManager.getCurrentVersion();
  }

  /**
   * Get version metrics for monitoring.
   *
   * @returns Version tracking metrics
   */
  getMetrics() {
    return {
      version: this.versionManager.getMetrics(),
      queue: this.coordinator.getQueueStats(),
      workerPending: this.workerManager.getPendingCount(),
    };
  }

  /**
   * Destroy the pipeline and clean up resources.
   *
   * Cancels all pending work, terminates the worker, and clears state.
   */
  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;

    // Destroy coordinator (cancels pending work)
    this.coordinator.destroy();

    // Terminate worker
    this.workerManager.terminate();

    // Clear state
    this.currentLayout = null;
    this.currentBlocks = [];
    this.currentMeasures = [];
  }

  /**
   * Execute a P0 (synchronous) layout operation.
   *
   * This handles the current paragraph layout for instant cursor positioning.
   * Must complete in <5ms.
   *
   * @param request - The layout request
   * @returns Layout result
   */
  private executeP0Layout(request: LayoutRequest): LayoutResult {
    try {
      // In a real implementation, this would:
      // 1. Extract the paragraph at request.paragraphIndex
      // 2. Use LocalParagraphLayout for fast sync layout
      // 3. Update only the affected paragraph in currentLayout
      // 4. Apply minimal DOM updates via reconciler

      // For now, return a mock result
      const result: LayoutResult = {
        version: request.version,
        layout: this.currentLayout ?? { pages: [], pageSize: { w: 612, h: 792 } },
        blocks: this.currentBlocks,
        measures: this.currentMeasures,
        completed: true,
        aborted: false,
      };

      // Notify completion
      if (typeof this.config.onLayoutComplete === 'function') {
        this.config.onLayoutComplete(result);
      }

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (typeof this.config.onError === 'function') {
        this.config.onError(err);
      }
      return {
        version: request.version,
        layout: this.currentLayout ?? { pages: [], pageSize: { w: 612, h: 792 } },
        blocks: [],
        measures: [],
        completed: false,
        aborted: false,
      };
    }
  }

  /**
   * Execute a P1 (async viewport) layout operation.
   *
   * This handles visible viewport layout for responsive updates.
   * Target: <50ms.
   *
   * @param request - The layout request
   * @returns Promise resolving to layout result
   */
  private async executeP1Layout(request: LayoutRequest): Promise<LayoutResult> {
    try {
      // Check if aborted
      if (request.abortSignal?.aborted) {
        return {
          version: request.version,
          layout: this.currentLayout ?? { pages: [], pageSize: { w: 612, h: 792 } },
          blocks: [],
          measures: [],
          completed: false,
          aborted: true,
        };
      }

      // In a real implementation, this would:
      // 1. Use incrementalLayout for viewport scope
      // 2. Apply result via reconciler
      // 3. Update currentLayout state

      // For now, return a mock result
      const result: LayoutResult = {
        version: request.version,
        layout: this.currentLayout ?? { pages: [], pageSize: { w: 612, h: 792 } },
        blocks: this.currentBlocks,
        measures: this.currentMeasures,
        completed: true,
        aborted: false,
      };

      // Apply to DOM
      if (this.currentLayout) {
        const reconcileResult = this.reconciler.reconcile(this.config.container, this.currentLayout, result.layout);

        console.log('[LayoutPipeline] Reconciliation:', reconcileResult);
      }

      // Update state
      this.currentLayout = result.layout;
      this.currentBlocks = result.blocks;
      this.currentMeasures = result.measures;

      // Notify completion
      if (typeof this.config.onLayoutComplete === 'function') {
        this.config.onLayoutComplete(result);
      }

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (typeof this.config.onError === 'function') {
        this.config.onError(err);
      }
      return {
        version: request.version,
        layout: this.currentLayout ?? { pages: [], pageSize: { w: 612, h: 792 } },
        blocks: [],
        measures: [],
        completed: false,
        aborted: false,
      };
    }
  }

  /**
   * Execute a P2/P3 (worker) layout operation.
   *
   * This offloads heavy layout work to a Web Worker to keep the main thread responsive.
   * Worker execution enables non-blocking background layout computation for:
   * - P2: Adjacent pages (±2 from cursor position)
   * - P3: Full document layout
   *
   * Performance characteristics:
   * - Target: <100ms for P2, background (no time limit) for P3
   * - Overhead: ~10ms for worker message passing round-trip
   * - Benefits: Main thread stays responsive, no jank during typing
   *
   * Failure modes:
   * - If worker unavailable: Falls back to main thread execution via executeP1Layout
   * - If worker errors: Catches and reports via onError callback
   * - If aborted: Returns early with aborted flag set
   *
   * Side effects:
   * - Updates this.currentLayout, this.currentBlocks, this.currentMeasures on success
   * - Calls this.reconciler.reconcile() to apply DOM changes
   * - Invokes this.config.onLayoutComplete callback on success
   *
   * @param request - The layout request with version, priority, scope, and abort signal
   * @returns Promise resolving to layout result with completed/aborted status
   */
  private async executeWorkerLayout(request: LayoutRequest): Promise<LayoutResult> {
    try {
      // Check if worker is available
      if (!this.workerManager.isInitialized()) {
        // Fallback to main thread
        console.warn('[LayoutPipeline] Worker not available, running on main thread');
        return this.executeP1Layout(request);
      }

      // Execute in worker
      const workerResult = await this.workerManager.execute(request);

      // Convert worker result to LayoutResult
      const result: LayoutResult = {
        version: workerResult.version,
        layout: workerResult.layout,
        blocks: workerResult.blocks,
        measures: workerResult.measures,
        completed: workerResult.completed,
        aborted: workerResult.aborted,
      };

      // Check if aborted
      if (result.aborted) {
        return result;
      }

      // Apply to DOM
      if (this.currentLayout) {
        const reconcileResult = this.reconciler.reconcile(this.config.container, this.currentLayout, result.layout);

        console.log('[LayoutPipeline] Worker reconciliation:', reconcileResult);
      }

      // Update state
      this.currentLayout = result.layout;
      this.currentBlocks = result.blocks;
      this.currentMeasures = result.measures;

      // Notify completion
      if (typeof this.config.onLayoutComplete === 'function') {
        this.config.onLayoutComplete(result);
      }

      return result;
    } catch (error) {
      // Check if this is an abort error
      if (error instanceof Error && error.message === 'AbortError') {
        return {
          version: request.version,
          layout: this.currentLayout ?? { pages: [], pageSize: { w: 612, h: 792 } },
          blocks: [],
          measures: [],
          completed: false,
          aborted: true,
        };
      }

      const err = error instanceof Error ? error : new Error(String(error));
      if (typeof this.config.onError === 'function') {
        this.config.onError(err);
      }
      return {
        version: request.version,
        layout: this.currentLayout ?? { pages: [], pageSize: { w: 612, h: 792 } },
        blocks: [],
        measures: [],
        completed: false,
        aborted: false,
      };
    }
  }
}
