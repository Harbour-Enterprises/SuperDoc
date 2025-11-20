/**
 * Performance monitoring utility for tracking document loading bottlenecks
 */

export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private completed: PerformanceMetric[] = [];
  private enabled: boolean = true;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  start(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata,
    });
  }

  end(name: string, additionalMetadata?: Record<string, any>): number | undefined {
    if (!this.enabled) return undefined;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric "${name}" not found. Did you forget to call start()?`);
      return undefined;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    if (additionalMetadata) {
      metric.metadata = { ...metric.metadata, ...additionalMetadata };
    }

    this.completed.push(metric);
    this.metrics.delete(name);

    return metric.duration;
  }

  mark(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    this.completed.push({
      name,
      startTime: performance.now(),
      endTime: performance.now(),
      duration: 0,
      metadata,
    });
  }

  getMetric(name: string): PerformanceMetric | undefined {
    return this.completed.find((m) => m.name === name);
  }

  getAllMetrics(): PerformanceMetric[] {
    return [...this.completed];
  }

  clear(): void {
    this.metrics.clear();
    this.completed = [];
  }

  printSummary(title: string = 'Performance Summary'): void {
    if (!this.enabled || this.completed.length === 0) return;

    console.group(`\n📊 ${title}`);
    console.log('═'.repeat(80));

    let totalDuration = 0;

    for (const metric of this.completed) {
      if (metric.duration !== undefined) {
        totalDuration += metric.duration;
        const durationStr = this.formatDuration(metric.duration);
        const metadataStr = metric.metadata ? ` ${JSON.stringify(metric.metadata)}` : '';
        console.log(`  ${metric.name}: ${durationStr}${metadataStr}`);
      }
    }

    console.log('─'.repeat(80));
    console.log(`  TOTAL: ${this.formatDuration(totalDuration)}`);
    console.log('═'.repeat(80));
    console.groupEnd();
  }

  printDetailedReport(): void {
    if (!this.enabled || this.completed.length === 0) return;

    console.group('\n📊 Detailed Performance Report');
    console.log('═'.repeat(80));

    // Group by category (based on naming convention)
    const categories = new Map<string, PerformanceMetric[]>();

    for (const metric of this.completed) {
      const category = this.extractCategory(metric.name);
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(metric);
    }

    // Print by category
    for (const [category, metrics] of categories) {
      console.group(`\n  ${category}`);

      let categoryTotal = 0;
      for (const metric of metrics) {
        if (metric.duration !== undefined) {
          categoryTotal += metric.duration;
          const durationStr = this.formatDuration(metric.duration);
          const metadataStr = metric.metadata
            ? `\n    ${JSON.stringify(metric.metadata, null, 2).split('\n').join('\n    ')}`
            : '';
          console.log(`    • ${metric.name}: ${durationStr}${metadataStr}`);
        }
      }

      console.log(`    ─ Subtotal: ${this.formatDuration(categoryTotal)}`);
      console.groupEnd();
    }

    console.log('═'.repeat(80));
    console.groupEnd();
  }

  private extractCategory(name: string): string {
    // Extract category from name like "1. File Loading" or "2.1 Parse XML"
    const match = name.match(/^(\d+(?:\.\d+)?)\s+(.+?)(?:\s*\(|$)/);
    if (match) {
      const [, number, category] = match;
      const mainNumber = number.split('.')[0];
      return `${mainNumber}. ${this.getCategoryName(mainNumber)}`;
    }
    return 'Other';
  }

  private getCategoryName(number: string): string {
    const categories: Record<string, string> = {
      '1': 'File Loading & Parsing',
      '2': 'Document Conversion',
      '3': 'Text Measurement',
      '4': 'Layout Calculation',
      '5': 'Header/Footer Processing',
      '6': 'DOM Rendering',
      '7': 'PDF Export',
    };
    return categories[number] || 'Other';
  }

  private formatDuration(ms: number): string {
    if (ms < 1) return `${ms.toFixed(3)}ms`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  getTotal(): number {
    return this.completed.reduce((sum, m) => sum + (m.duration || 0), 0);
  }
}

// Global performance monitor instance
export const perfMonitor = new PerformanceMonitor(true);

// Export convenience functions
export const perfStart = (name: string, metadata?: Record<string, any>) => perfMonitor.start(name, metadata);
export const perfEnd = (name: string, metadata?: Record<string, any>) => perfMonitor.end(name, metadata);
export const perfMark = (name: string, metadata?: Record<string, any>) => perfMonitor.mark(name, metadata);
export const perfSummary = (title?: string) => perfMonitor.printSummary(title);
export const perfReport = () => perfMonitor.printDetailedReport();
export const perfClear = () => perfMonitor.clear();
