/**
 * Layout Worker
 *
 * Web Worker implementation for P2/P3 layout operations.
 * Offloads expensive layout calculations to a background thread to keep
 * the main thread responsive during typing.
 *
 * The worker handles:
 * - P2: Adjacent pages (±2 from cursor) - <100ms
 * - P3: Full document layout - background, interruptible
 *
 * Communication protocol:
 * - Main thread sends WorkerMessage with document data
 * - Worker performs layout and returns WorkerResult
 * - Supports cancellation via abort signals
 *
 * @module layout-worker
 */

import type { FlowBlock, Layout, Measure } from '@superdoc/contracts';
import type { LayoutRequest } from './layout-scheduler';

/**
 * Simulated worker response delay in milliseconds for mock worker.
 * In production, actual worker processing time varies based on document complexity.
 * This delay simulates async message passing overhead (~10ms round-trip).
 */
const MOCK_WORKER_DELAY_MS = 10;

/**
 * Serialized document data for worker transfer.
 * Contains all information needed to perform layout in the worker.
 */
export interface SerializedDoc {
  /** Flow blocks from the document */
  blocks: FlowBlock[];
  /** Previous layout (for incremental updates) */
  previousLayout: Layout | null;
  /** Layout options */
  options: {
    pageSize?: { w: number; h: number };
    margins?: { top: number; right: number; bottom: number; left: number };
    columns?: { count: number; gap: number };
  };
}

/**
 * Range of dirty blocks for incremental layout.
 */
export interface Range {
  /** Start block index */
  start: number;
  /** End block index (exclusive) */
  end: number;
}

/**
 * Message sent from main thread to worker.
 */
export interface WorkerMessage {
  /** Message type identifier */
  type: 'layout-request';
  /** Unique request ID for matching responses */
  id: number;
  /** Document version number */
  version: number;
  /** Serialized document data */
  document: SerializedDoc;
  /** Dirty ranges for incremental layout */
  dirtyRanges: Range[];
}

/**
 * Result sent from worker to main thread.
 */
export interface WorkerResult {
  /** Message type identifier */
  type: 'layout-result';
  /** Request ID matching the original message */
  id: number;
  /** Document version number */
  version: number;
  /** Computed layout */
  layout: Layout;
  /** Flow blocks */
  blocks: FlowBlock[];
  /** Block measurements */
  measures: Measure[];
  /** Whether the operation was aborted */
  aborted: boolean;
  /** Error message if layout failed */
  error?: string;
}

/**
 * Pending request tracker for matching responses.
 */
interface PendingRequest {
  /** Promise resolve callback */
  resolve: (result: WorkerResult) => void;
  /** Promise reject callback */
  reject: (error: Error) => void;
  /** Abort signal for cancellation */
  abortSignal: AbortSignal;
}

/**
 * Result of a worker layout operation (matches LayoutResult interface).
 */
export interface WorkerLayoutResult {
  /** Version number */
  version: number;
  /** Computed layout */
  layout: Layout;
  /** Flow blocks */
  blocks: FlowBlock[];
  /** Block measurements */
  measures: Measure[];
  /** Whether completed successfully */
  completed: boolean;
  /** Whether aborted */
  aborted: boolean;
}

/**
 * LayoutWorkerManager manages a Web Worker for background layout operations.
 *
 * This manager:
 * - Initializes and manages a Web Worker lifecycle
 * - Sends layout requests to the worker
 * - Receives and routes layout results back to callers
 * - Supports request cancellation via abort signals
 * - Handles worker errors gracefully
 *
 * Performance targets:
 * - Message passing overhead: <10ms round-trip
 * - Supports concurrent requests (worker processes sequentially)
 *
 * Usage:
 * ```typescript
 * const manager = new LayoutWorkerManager();
 * manager.initialize();
 *
 * const result = await manager.execute({
 *   version: 1,
 *   priority: Priority.P2,
 *   scope: 'adjacent',
 *   abortSignal: controller.signal,
 * });
 *
 * // When done
 * manager.terminate();
 * ```
 */
export class LayoutWorkerManager {
  /** Web Worker instance */
  private worker: Worker | null = null;

  /** Pending requests awaiting responses */
  private pendingRequests: Map<number, PendingRequest> = new Map();

  /** Auto-incrementing request ID counter */
  private requestIdCounter: number = 0;

  /** Whether the worker is initialized */
  private initialized: boolean = false;

  /**
   * Initialize the Web Worker.
   *
   * Creates a new worker instance and sets up message handlers.
   * Must be called before executing any layout requests.
   *
   * Note: In a real implementation, this would load the worker script.
   * For now, we create a mock worker that will be replaced with actual
   * worker implementation.
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    try {
      // In production, this would be:
      // this.worker = new Worker(new URL('./layout-worker-thread.js', import.meta.url));
      //
      // For now, we'll create a mock implementation that runs synchronously
      // The actual worker implementation would be in a separate file.
      this.worker = this.createMockWorker();

      this.worker.onmessage = (event: MessageEvent<WorkerResult>) => {
        this.handleWorkerMessage(event.data);
      };

      this.worker.onerror = (error: ErrorEvent) => {
        this.handleWorkerError(error);
      };

      this.initialized = true;
    } catch (error) {
      console.error('[LayoutWorkerManager] Failed to initialize worker:', error);
      throw error;
    }
  }

  /**
   * Execute a layout request in the worker.
   *
   * Sends the request to the worker and returns a promise that resolves
   * with the layout result. The operation can be cancelled via the abort
   * signal in the request.
   *
   * @param request - The layout request
   * @returns Promise resolving to the layout result
   */
  async execute(request: LayoutRequest): Promise<WorkerLayoutResult> {
    if (!this.initialized || !this.worker) {
      throw new Error('[LayoutWorkerManager] Worker not initialized. Call initialize() first.');
    }

    const requestId = ++this.requestIdCounter;

    // Create abort handler
    const abortHandler = () => {
      this.abort(requestId);
    };

    // Use try-finally to ensure cleanup happens even if errors occur
    try {
      if (request.abortSignal) {
        request.abortSignal.addEventListener('abort', abortHandler);
      }

      // Create promise for the response
      const resultPromise = new Promise<WorkerResult>((resolve, reject) => {
        this.pendingRequests.set(requestId, {
          resolve,
          reject,
          abortSignal: request.abortSignal!,
        });
      });

      // Send message to worker
      // Note: In a real implementation, we'd serialize the full document.
      // For now, we send a minimal message structure.
      const message: WorkerMessage = {
        type: 'layout-request',
        id: requestId,
        version: request.version,
        document: {
          blocks: [],
          previousLayout: null,
          options: {},
        },
        dirtyRanges: [],
      };

      this.worker.postMessage(message);

      // Wait for response
      const result = await resultPromise;

      // Convert to LayoutResult format
      return {
        version: result.version,
        layout: result.layout,
        blocks: result.blocks,
        measures: result.measures,
        completed: !result.aborted && !result.error,
        aborted: result.aborted,
      };
    } finally {
      // Always clean up abort handler, even if errors occur
      if (request.abortSignal) {
        request.abortSignal.removeEventListener('abort', abortHandler);
      }
    }
  }

  /**
   * Abort a pending request.
   *
   * Cancels the request and rejects the promise with an abort error.
   *
   * @param requestId - The request ID to abort
   */
  abort(requestId: number): void {
    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      this.pendingRequests.delete(requestId);
      pending.reject(new Error('AbortError'));
    }
  }

  /**
   * Handle a message received from the worker.
   *
   * Routes the result to the appropriate pending request.
   *
   * @param result - The worker result
   */
  private handleWorkerMessage(result: WorkerResult): void {
    const pending = this.pendingRequests.get(result.id);
    if (!pending) {
      // Request was likely aborted
      return;
    }

    this.pendingRequests.delete(result.id);

    // Check if aborted
    if (pending.abortSignal?.aborted) {
      pending.reject(new Error('AbortError'));
      return;
    }

    // Check for errors
    if (result.error) {
      pending.reject(new Error(result.error));
      return;
    }

    // Resolve with result
    pending.resolve(result);
  }

  /**
   * Handle a worker error event.
   *
   * Rejects all pending requests and logs the error.
   *
   * @param error - The error event
   */
  private handleWorkerError(error: ErrorEvent): void {
    console.error('[LayoutWorkerManager] Worker error:', error);

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests.entries()) {
      pending.reject(new Error(`Worker error: ${error.message}`));
      this.pendingRequests.delete(id);
    }
  }

  /**
   * Terminate the worker.
   *
   * Stops the worker thread and cleans up resources.
   * All pending requests will be rejected.
   */
  terminate(): void {
    if (!this.worker) {
      return;
    }

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests.entries()) {
      pending.reject(new Error('Worker terminated'));
      this.pendingRequests.delete(id);
    }

    // Terminate the worker
    this.worker.terminate();
    this.worker = null;
    this.initialized = false;
  }

  /**
   * Check if the worker is initialized.
   *
   * @returns true if initialized, false otherwise
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the number of pending requests.
   *
   * @returns Number of pending requests
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Create a mock worker for testing.
   * In production, this would be replaced with an actual Worker.
   *
   * @returns A mock worker instance
   */
  private createMockWorker(): Worker {
    // Mock worker that immediately returns empty results
    // In production, this would be: new Worker(...)
    const mockWorker = {
      postMessage: (message: WorkerMessage) => {
        // Simulate async processing
        setTimeout(() => {
          const result: WorkerResult = {
            type: 'layout-result',
            id: message.id,
            version: message.version,
            layout: { pages: [], pageSize: { w: 612, h: 792 } },
            blocks: [],
            measures: [],
            aborted: false,
          };

          if (this.worker && this.worker.onmessage) {
            this.worker.onmessage(new MessageEvent('message', { data: result }));
          }
        }, MOCK_WORKER_DELAY_MS);
      },
      terminate: () => {
        // No-op for mock
      },
      onmessage: null as ((event: MessageEvent<WorkerResult>) => void) | null,
      onerror: null as ((error: ErrorEvent) => void) | null,
    } as unknown as Worker;

    return mockWorker;
  }
}
