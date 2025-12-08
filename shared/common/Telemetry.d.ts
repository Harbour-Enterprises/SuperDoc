type TelemetryAttributes = Record<string, unknown>;
type ReadonlyTelemetryRecord = Readonly<Record<string, unknown>>;
/**
 * Standard telemetry event names
 */
export declare const TelemetryEventNames: {
  readonly DOCUMENT_OPENED: 'document:opened';
  readonly DOCUMENT_PARSED: 'document:parsed';
  readonly DOCUMENT_EXPORTED: 'document:exported';
  readonly ERROR_OCCURRED: 'error:occurred';
  readonly FEATURE_USED: 'feature:used';
  readonly CONVERSION_STARTED: 'conversion:started';
  readonly CONVERSION_COMPLETED: 'conversion:completed';
};
/**
 * Known telemetry event names (provides autocomplete)
 */
export type KnownTelemetryEvent = (typeof TelemetryEventNames)[keyof typeof TelemetryEventNames];
/**
 * Custom telemetry event name - use for application-specific events
 * Branded type to distinguish from known events
 */
export type CustomTelemetryEvent = string & {
  readonly __custom?: never;
};
/**
 * Telemetry event name - either a known event or a custom event
 */
export type TelemetryEventName = KnownTelemetryEvent | CustomTelemetryEvent;
/**
 * Valid statistic categories for tracking
 */
export type StatisticCategory = 'node' | 'unknown' | 'error';
/**
 * Create a custom telemetry event name
 * Use this for application-specific events not covered by TelemetryEventNames
 * @param eventName - Custom event name (e.g., 'feature:custom-action')
 * @returns Branded custom event name
 */
export declare function customTelemetryEvent(eventName: string): CustomTelemetryEvent;
export interface TelemetryConfig {
  readonly licenseKey?: string;
  readonly enabled?: boolean;
  readonly endpoint?: string;
  readonly documentGuid?: string;
  readonly documentIdentifier?: string;
  readonly superdocVersion: string;
}
export interface BrowserInfo {
  readonly userAgent: string;
  readonly currentUrl: string;
  readonly hostname: string;
  readonly referrerUrl: string;
  readonly screenSize: {
    readonly width: number;
    readonly height: number;
  };
}
export interface Statistics {
  nodeTypes: Record<string, number>;
  markTypes: Record<string, number>;
  attributes: Record<string, number>;
  errorCount: number;
}
export interface FileInfo {
  readonly path: string;
  readonly name: string;
  readonly size?: number;
  readonly depth: number;
}
export interface FileStructure {
  totalFiles: number;
  maxDepth: number;
  totalNodes: number;
  files: FileInfo[];
}
export interface DocumentInfo {
  readonly guid?: string;
  readonly identifier?: string;
  readonly name: string;
  readonly size: number;
  readonly lastModified: string | null;
  readonly type: string;
  readonly internalId?: string;
}
export interface BaseTelemetryEvent {
  id: string;
  timestamp: string;
  sessionId: string;
  documentGuid?: string;
  documentIdentifier?: string;
  superdocVersion: string;
  file: DocumentInfo | null;
  browser: BrowserInfo;
}
export interface TelemetryUsageEvent extends BaseTelemetryEvent {
  type: 'usage';
  name: string;
  properties: TelemetryAttributes;
}
export interface TelemetryParsingReport extends BaseTelemetryEvent {
  type: 'parsing';
  statistics: Statistics;
  fileStructure: FileStructure;
  unknownElements: UnknownElement[];
  errors: TelemetryError[];
}
export type TelemetryPayload = TelemetryUsageEvent | TelemetryParsingReport[];
export interface TelemetryError extends ReadonlyTelemetryRecord {
  readonly message?: string;
  readonly elementName?: string;
  readonly attributes?: TelemetryAttributes;
  readonly timestamp?: string;
}
export interface UnknownElement {
  readonly elementName: string;
  count: number;
  attributes?: TelemetryAttributes;
}
/**
 * Discriminated union for statistic data based on category
 */
export type StatisticData =
  | {
      category: 'node';
      elementName: string;
      attributes?: TelemetryAttributes;
      marks?: Array<{
        type: string;
      }>;
    }
  | {
      category: 'unknown';
      elementName: string;
      attributes?: TelemetryAttributes;
    }
  | {
      category: 'error';
      message?: string;
      elementName?: string;
      attributes?: TelemetryAttributes;
      timestamp?: string;
      [key: string]: unknown;
    };
export declare class Telemetry {
  enabled: boolean;
  documentGuid?: string;
  documentIdentifier?: string;
  superdocVersion: string;
  licenseKey: string;
  endpoint: string;
  sessionId: string;
  statistics: Statistics;
  unknownElements: UnknownElement[];
  errors: TelemetryError[];
  fileStructure: FileStructure;
  documentInfo: DocumentInfo | null;
  static readonly COMMUNITY_LICENSE_KEY: 'community-and-eval-agplv3';
  static readonly DEFAULT_ENDPOINT: 'https://ingest.superdoc.dev/v1/collect';
  /**
   * Initialize telemetry service
   * @param config - Telemetry configuration
   */
  constructor(config: TelemetryConfig);
  /**
   * Get browser environment information
   * @returns Browser information
   */
  getBrowserInfo(): BrowserInfo;
  /**
   * Track document usage event
   * @param name - Event name (use TelemetryEventNames for standard events)
   * @param properties - Additional properties
   */
  trackUsage(name: TelemetryEventName, properties?: TelemetryAttributes): Promise<void>;
  /**
   * Track parsing statistics (new discriminated union API)
   * @param data - Statistic data with category discriminator
   */
  trackStatistic(data: StatisticData): void;
  /**
   * Track parsing statistics (legacy API for backward compatibility)
   * @param category - Statistic category
   * @param data - Statistic data without category
   * @deprecated Use the single-parameter overload with discriminated union instead
   */
  trackStatistic(
    category: 'node',
    data: Omit<
      Extract<
        StatisticData,
        {
          category: 'node';
        }
      >,
      'category'
    >,
  ): void;
  trackStatistic(
    category: 'unknown',
    data: Omit<
      Extract<
        StatisticData,
        {
          category: 'unknown';
        }
      >,
      'category'
    >,
  ): void;
  trackStatistic(
    category: 'error',
    data: Omit<
      Extract<
        StatisticData,
        {
          category: 'error';
        }
      >,
      'category'
    >,
  ): void;
  /**
   * Track file structure
   * @param structure - File structure information
   * @param fileSource - original file
   * @param documentId - document GUID
   * @param documentIdentifier - document identifier (GUID or hash)
   * @param internalId - document ID from settings.xml
   */
  trackFileStructure(
    structure: FileStructure,
    fileSource: File,
    documentId?: string,
    documentIdentifier?: string,
    internalId?: string,
  ): Promise<void>;
  /**
   * Process document metadata
   * @param file - Document file
   * @param options - Additional options
   * @returns Document metadata
   */
  processDocument(
    file: File | null,
    options?: {
      guid?: string;
      identifier?: string;
      internalId?: string;
    },
  ): Promise<DocumentInfo | null>;
  isTelemetryDataChanged(): boolean;
  /**
   * Sends current report
   * @returns Promise that resolves when report is sent
   */
  sendReport(): Promise<void>;
  /**
   * Sends data to the service
   * @param data - Payload to send
   * @returns Promise that resolves when data is sent
   */
  sendDataToTelemetry(data: TelemetryPayload): Promise<void>;
  /**
   * Generate unique identifier
   * @returns Unique ID
   * @private
   */
  generateId(): string;
  /**
   * Reset statistics
   */
  resetStatistics(): void;
}
export {};
