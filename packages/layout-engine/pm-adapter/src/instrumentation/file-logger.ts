import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
type AdapterFeatureSnapshot = {
  totalBlocks: number;
  blockCounts: Partial<Record<string, number>>;
};

type AdapterInstrumentation = {
  onBlocksConverted?: (snapshot: AdapterFeatureSnapshot) => void;
};

const DEFAULT_LOG_PATH = path.resolve(process.cwd(), 'packages/layout-engine/plan/.fidelity-telemetry.log');

/**
 * Appends FlowBlock coverage snapshots to a log file.
 */
export const createFileInstrumentation = (logFilePath: string = DEFAULT_LOG_PATH): AdapterInstrumentation => ({
  onBlocksConverted(snapshot: AdapterFeatureSnapshot) {
    try {
      mkdirSync(path.dirname(logFilePath), { recursive: true });
      const entry = JSON.stringify({
        timestamp: new Date().toISOString(),
        ...snapshot,
      });
      appendFileSync(logFilePath, `${entry}\n`, { encoding: 'utf8' });
    } catch {
      // Ignore logging failures
    }
  },
});

export { DEFAULT_LOG_PATH as DEFAULT_FIDELITY_LOG_PATH };
