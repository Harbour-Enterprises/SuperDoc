/**
 * Layout Scheduler
 *
 * Priority queue for managing layout tasks with P0-P3 priorities.
 * Ensures high-priority tasks (cursor positioning) are processed before
 * low-priority background tasks (full document layout).
 *
 * Priority levels:
 * - P0: Current paragraph - <5ms, sync, not interruptible
 * - P1: Visible viewport - <50ms, async, interruptible
 * - P2: Adjacent pages (±2) - <100ms, async, interruptible
 * - P3: Full document - background, interruptible
 *
 * @module layout-scheduler
 */

/**
 * Priority levels for layout tasks.
 * Lower numeric values indicate higher priority.
 */
export enum Priority {
  P0 = 0, // Current paragraph - <5ms, sync, not interruptible
  P1 = 1, // Visible viewport - <50ms, async, interruptible
  P2 = 2, // Adjacent pages (±2) - <100ms, async, interruptible
  P3 = 3, // Full document - background, interruptible
}

/**
 * Request for a layout operation.
 */
export interface LayoutRequest {
  /** Version number from ProseMirror transaction */
  version: number;
  /** Priority level for this request */
  priority: Priority;
  /** Scope of the layout operation */
  scope: 'paragraph' | 'viewport' | 'adjacent' | 'full';
  /** Paragraph index for paragraph-scoped requests */
  paragraphIndex?: number;
  /** Abort signal for cancellable operations */
  abortSignal?: AbortSignal;
}

/**
 * Task status in the scheduler queue.
 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'aborted';

/**
 * A scheduled layout task with metadata.
 */
export interface ScheduledTask {
  /** Unique task identifier */
  id: number;
  /** Priority level */
  priority: Priority;
  /** Layout request details */
  request: LayoutRequest;
  /** Current status */
  status: TaskStatus;
  /** AbortController for cancelling this task */
  abortController?: AbortController;
}

/**
 * Statistics about the scheduler queue.
 */
export interface QueueStats {
  [Priority.P0]: number;
  [Priority.P1]: number;
  [Priority.P2]: number;
  [Priority.P3]: number;
}

/**
 * LayoutScheduler manages a priority queue for layout tasks.
 *
 * This scheduler ensures that high-priority tasks (like cursor positioning)
 * are processed before low-priority background tasks (like full document layout).
 *
 * Performance characteristics:
 * - enqueue: O(log n)
 * - dequeue: O(log n)
 * - abortBelow: O(n)
 *
 * Usage:
 * ```typescript
 * const scheduler = new LayoutScheduler();
 *
 * // Enqueue a high-priority task
 * const taskId = scheduler.enqueue({
 *   version: 1,
 *   priority: Priority.P0,
 *   scope: 'paragraph',
 *   paragraphIndex: 5
 * });
 *
 * // Dequeue the next task
 * const task = scheduler.dequeue();
 *
 * // Abort low-priority tasks when new input arrives
 * scheduler.abortBelow(Priority.P1);
 * ```
 */
export class LayoutScheduler {
  /** Priority queue of pending tasks, sorted by priority */
  private queue: ScheduledTask[] = [];

  /** Currently running task */
  private currentTask: ScheduledTask | null = null;

  /** Auto-incrementing task ID counter */
  private taskIdCounter: number = 0;

  /**
   * Add a task to the queue with priority ordering.
   *
   * Tasks are inserted into the queue maintaining priority order,
   * with higher priority (lower numeric value) tasks first.
   *
   * @param request - The layout request to schedule
   * @returns Task ID for tracking
   * @throws {Error} If priority is invalid (not in range 0-3)
   */
  enqueue(request: LayoutRequest): number {
    // Validate priority is in valid range (0-3)
    if (request.priority < 0 || request.priority > 3) {
      throw new Error(`[LayoutScheduler] Invalid priority: ${request.priority}. Must be between 0 (P0) and 3 (P3).`);
    }

    const taskId = ++this.taskIdCounter;

    // Create AbortController for this task if not provided
    const abortController = new AbortController();
    const taskRequest: LayoutRequest = {
      ...request,
      abortSignal: abortController.signal,
    };

    const task: ScheduledTask = {
      id: taskId,
      priority: request.priority,
      request: taskRequest,
      status: 'pending',
      abortController,
    };

    // Find insertion point using binary search for O(log n) complexity
    // Queue is sorted by priority (lower number = higher priority)
    let left = 0;
    let right = this.queue.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.queue[mid].priority <= request.priority) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    // Insert at the found position
    this.queue.splice(left, 0, task);

    return taskId;
  }

  /**
   * Get the next task to execute (highest priority first).
   *
   * Removes and returns the highest priority pending task from the queue.
   * Returns null if the queue is empty.
   *
   * @returns The next scheduled task, or null if queue is empty
   */
  dequeue(): ScheduledTask | null {
    // Queue is sorted by priority, so first task is highest priority
    const task = this.queue.shift();

    if (task) {
      task.status = 'running';
      this.currentTask = task;
    }

    return task ?? null;
  }

  /**
   * Abort all tasks with priority at or below the specified threshold.
   *
   * For example, abortBelow(Priority.P1) will abort all P1, P2, and P3 tasks,
   * while keeping P0 tasks in the queue.
   *
   * This is used when new user input arrives - we cancel lower-priority
   * background work to prioritize the new input.
   *
   * @param priority - The priority threshold (inclusive)
   */
  abortBelow(priority: Priority): void {
    // Abort tasks in the queue
    this.queue = this.queue.filter((task) => {
      if (task.priority >= priority) {
        // Trigger abort via AbortController
        if (task.abortController) {
          task.abortController.abort();
        }
        task.status = 'aborted';
        return false; // Remove from queue
      }
      return true; // Keep in queue
    });

    // Abort current task if it meets the criteria
    if (this.currentTask && this.currentTask.priority >= priority) {
      if (this.currentTask.abortController) {
        this.currentTask.abortController.abort();
      }
      this.currentTask.status = 'aborted';
      this.currentTask = null;
    }
  }

  /**
   * Check if the queue has any pending tasks.
   *
   * @returns true if there are pending tasks, false otherwise
   */
  hasPending(): boolean {
    return this.queue.length > 0;
  }

  /**
   * Get queue statistics by priority level.
   *
   * Returns a count of pending tasks for each priority level.
   *
   * @returns Object mapping priority levels to task counts
   */
  getQueueStats(): QueueStats {
    const stats: QueueStats = {
      [Priority.P0]: 0,
      [Priority.P1]: 0,
      [Priority.P2]: 0,
      [Priority.P3]: 0,
    };

    for (const task of this.queue) {
      stats[task.priority]++;
    }

    return stats;
  }

  /**
   * Clear all tasks from the queue.
   *
   * This marks all pending tasks as aborted and clears the queue.
   * Useful for cleanup or when resetting the scheduler.
   */
  clear(): void {
    // Mark all tasks as aborted
    for (const task of this.queue) {
      task.status = 'aborted';
    }

    // Clear the queue
    this.queue = [];

    // Clear current task
    if (this.currentTask) {
      this.currentTask.status = 'aborted';
      this.currentTask = null;
    }
  }

  /**
   * Get the currently running task.
   *
   * @returns The current task, or null if no task is running
   */
  getCurrentTask(): ScheduledTask | null {
    return this.currentTask;
  }

  /**
   * Mark the current task as completed.
   *
   * This should be called when a task finishes execution successfully.
   */
  completeCurrentTask(): void {
    if (this.currentTask) {
      this.currentTask.status = 'completed';
      this.currentTask = null;
    }
  }

  /**
   * Get the total number of pending tasks.
   *
   * @returns Number of tasks waiting in the queue
   */
  getPendingCount(): number {
    return this.queue.length;
  }
}
