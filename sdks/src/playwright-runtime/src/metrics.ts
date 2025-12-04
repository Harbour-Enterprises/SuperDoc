/**
 * Metrics collection for runtime telemetry
 */

export interface OperationMetrics {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: string;
}

export interface ContextMetrics {
  contextId: string;
  createdAt: number;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  lastUsed: number;
}

export interface RuntimeMetrics {
  browserStartTime: number;
  poolSize: number;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  activeContexts: number;
  operations: OperationMetrics[];
  contexts: Map<string, ContextMetrics>;
}

export class MetricsCollector {
  private metrics: RuntimeMetrics;
  private maxOperationHistory: number;

  constructor(poolSize: number, maxHistory: number = 100) {
    this.maxOperationHistory = maxHistory;
    this.metrics = {
      browserStartTime: Date.now(),
      poolSize,
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      activeContexts: 0,
      operations: [],
      contexts: new Map(),
    };
  }

  recordOperationStart(_operation: string): number {
    return Date.now();
  }

  recordOperationEnd(operation: string, startTime: number, success: boolean, error?: string) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    const metric: OperationMetrics = {
      operation,
      startTime,
      endTime,
      duration,
      success,
      error,
    };

    this.metrics.operations.push(metric);
    this.metrics.totalOperations++;

    if (success) {
      this.metrics.successfulOperations++;
    } else {
      this.metrics.failedOperations++;
    }

    // Trim history
    if (this.metrics.operations.length > this.maxOperationHistory) {
      this.metrics.operations.shift();
    }
  }

  updateContextCount(count: number) {
    this.metrics.activeContexts = count;
  }

  getMetrics(): RuntimeMetrics {
    return {
      ...this.metrics,
      contexts: new Map(this.metrics.contexts),
      operations: [...this.metrics.operations],
    };
  }

  getStats() {
    const operations = this.metrics.operations;
    const recent = operations.slice(-20);

    return {
      uptime: Date.now() - this.metrics.browserStartTime,
      poolSize: this.metrics.poolSize,
      activeContexts: this.metrics.activeContexts,
      totalOperations: this.metrics.totalOperations,
      successRate:
        this.metrics.totalOperations > 0
          ? (this.metrics.successfulOperations / this.metrics.totalOperations) * 100
          : 100,
      recentOperations: recent.length,
      avgDuration: recent.length > 0 ? recent.reduce((sum, op) => sum + op.duration, 0) / recent.length : 0,
    };
  }

  reset() {
    this.metrics.totalOperations = 0;
    this.metrics.successfulOperations = 0;
    this.metrics.failedOperations = 0;
    this.metrics.operations = [];
    this.metrics.contexts.clear();
  }
}
