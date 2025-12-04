/**
 * Simple logger for runtime telemetry
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: unknown;
}

export class Logger {
  private level: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs: number;

  constructor(level: LogLevel = LogLevel.INFO, maxLogs: number = 1000) {
    this.level = level;
    this.maxLogs = maxLogs;
  }

  debug(message: string, data?: unknown) {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: unknown) {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: unknown) {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: unknown) {
    this.log(LogLevel.ERROR, message, data);
  }

  private log(level: LogLevel, message: string, data?: unknown) {
    if (level < this.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
    };

    this.logs.push(entry);

    // Trim logs if exceeded max
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output
    const levelName = LogLevel[level];
    const prefix = `[${levelName}]`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, data || '');
        break;
      case LogLevel.INFO:
        console.log(prefix, message, data || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, data || '');
        break;
      case LogLevel.ERROR:
        console.error(prefix, message, data || '');
        break;
    }
  }

  getLogs(since?: number): LogEntry[] {
    if (!since) {
      return [...this.logs];
    }
    return this.logs.filter((entry) => entry.timestamp >= since);
  }

  clearLogs() {
    this.logs = [];
  }

  setLevel(level: LogLevel) {
    this.level = level;
  }
}

// Global logger instance
export const logger = new Logger();
