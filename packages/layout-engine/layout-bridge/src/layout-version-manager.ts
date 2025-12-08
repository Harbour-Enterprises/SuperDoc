/**
 * Layout Version Manager
 *
 * Tracks the versioning relationship between ProseMirror document state and layout state.
 * This is critical for preventing race conditions where the selection/cursor overlay
 * attempts to use layout data that is stale (not yet updated for the current PM state).
 *
 * Key principles:
 * 1. PM transaction version is source of truth for "current" state
 * 2. Layout operations are async and may complete out-of-order
 * 3. UI must never render against stale layout data
 * 4. Fallback to PM DOM coordinates when layout is stale
 */

export interface VersionedLayoutState {
  /** Version number matching the PM transaction that generated this layout */
  version: number;
  /** Hash of the PM document for verification (optional integrity check) */
  pmDocHash?: string;
  /** Timestamp when this layout version was created */
  timestamp: number;
}

export interface LayoutVersionMetrics {
  /** Current PM document version */
  currentPmVersion: number;
  /** Latest completed layout version */
  latestLayoutVersion: number;
  /** Whether layout is behind current PM state */
  isStale: boolean;
  /** How many versions behind layout is (0 if not stale) */
  versionGap: number;
  /** Duration layout has been stale (ms, 0 if not stale) */
  stalenessDuration: number;
}

/**
 * Manages version tracking for the layout system.
 *
 * Usage:
 * ```typescript
 * const versionManager = new LayoutVersionManager();
 *
 * // On each PM transaction
 * versionManager.onPmTransaction(tr);
 *
 * // Before using layout for UI
 * if (versionManager.isLayoutStale()) {
 *   // Use fallback positioning (PM DOM coords or mathematical calculation)
 * } else {
 *   // Safe to use layout-based positioning
 * }
 *
 * // When layout completes
 * versionManager.onLayoutComplete(layoutVersion);
 * ```
 */
export class LayoutVersionManager {
  private currentPmVersion: number = 0;
  private latestLayoutVersion: number = 0;
  private stalenessSince: number | null = null;

  /**
   * Increment the PM version counter.
   * Call this on every PM transaction that modifies the document.
   *
   * @param tr - Optional ProseMirror transaction (for future doc hash verification)
   */
  onPmTransaction(_tr?: unknown): void {
    this.currentPmVersion++;

    // Mark layout as stale if this is the first change ahead of layout
    if (this.stalenessSince === null && this.latestLayoutVersion < this.currentPmVersion) {
      this.stalenessSince = Date.now();
    }
  }

  /**
   * Check if the layout is stale (behind current PM state).
   *
   * @returns true if layout data should not be used for UI positioning
   */
  isLayoutStale(): boolean {
    return this.latestLayoutVersion < this.currentPmVersion;
  }

  /**
   * Get the version gap between PM and layout.
   *
   * @returns Number of PM transactions ahead of layout (0 if synchronized)
   */
  getVersionGap(): number {
    return Math.max(0, this.currentPmVersion - this.latestLayoutVersion);
  }

  /**
   * Get how long layout has been stale.
   *
   * @returns Staleness duration in milliseconds (0 if not stale)
   */
  getStalenessDuration(): number {
    if (this.stalenessSince === null) {
      return 0;
    }
    return Date.now() - this.stalenessSince;
  }

  /**
   * Record completion of a layout operation.
   *
   * Ignores out-of-order completions (older layouts finishing after newer ones).
   * This can happen when a slow layout is interrupted by a fast one.
   *
   * @param version - The PM version this layout corresponds to
   */
  onLayoutComplete(version: number): void {
    // Only update if this is newer than what we have
    if (version >= this.latestLayoutVersion) {
      this.latestLayoutVersion = version;

      // Clear staleness timer if we've caught up
      if (!this.isLayoutStale()) {
        this.stalenessSince = null;
      }
    }
    // Ignore out-of-order completions
  }

  /**
   * Get current version state for metrics/debugging.
   *
   * @returns Current version metrics
   */
  getMetrics(): LayoutVersionMetrics {
    return {
      currentPmVersion: this.currentPmVersion,
      latestLayoutVersion: this.latestLayoutVersion,
      isStale: this.isLayoutStale(),
      versionGap: this.getVersionGap(),
      stalenessDuration: this.getStalenessDuration(),
    };
  }

  /**
   * Get the current PM version.
   *
   * @returns Current PM transaction version number
   */
  getCurrentVersion(): number {
    return this.currentPmVersion;
  }

  /**
   * Get the latest layout version.
   *
   * @returns Latest completed layout version number
   */
  getLatestLayoutVersion(): number {
    return this.latestLayoutVersion;
  }

  /**
   * Reset all version counters (for testing or document reload).
   */
  reset(): void {
    this.currentPmVersion = 0;
    this.latestLayoutVersion = 0;
    this.stalenessSince = null;
  }
}
