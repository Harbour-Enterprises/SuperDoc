const COLORS = {
  ConnectionHandler: '\x1b[34m', // blue
  DocumentManager: '\x1b[32m', // green
  SuperDocCollaboration: '\x1b[35m', // magenta
  reset: '\x1b[0m',
};

export type Logger = (...args: unknown[]) => void;

export function createLogger(label: keyof typeof COLORS | string): Logger {
  const color = (COLORS as Record<string, string>)[label] || COLORS.reset;

  return (...args: unknown[]) => {
    console.log(`${color}[${label}]${COLORS.reset}`, ...args);
  };
}
