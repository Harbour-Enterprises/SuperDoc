type TelemetryAttributes = Record<string, unknown>;
type ReadonlyTelemetryRecord = Readonly<Record<string, unknown>>;

/**
 * Standard telemetry event names
 */
export const TelemetryEventNames = {
  DOCUMENT_OPENED: 'document:opened',
  DOCUMENT_PARSED: 'document:parsed',
  DOCUMENT_EXPORTED: 'document:exported',
  ERROR_OCCURRED: 'error:occurred',
  FEATURE_USED: 'feature:used',
  CONVERSION_STARTED: 'conversion:started',
  CONVERSION_COMPLETED: 'conversion:completed',
} as const;

/**
 * Known telemetry event names (provides autocomplete)
 */
export type KnownTelemetryEvent = (typeof TelemetryEventNames)[keyof typeof TelemetryEventNames];

/**
 * Custom telemetry event name - use for application-specific events
 * Branded type to distinguish from known events
 */
export type CustomTelemetryEvent = string & { readonly __custom?: never };

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
export function customTelemetryEvent(eventName: string): CustomTelemetryEvent {
  return eventName as CustomTelemetryEvent;
}

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
      marks?: Array<{ type: string }>;
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

function getCrypto(): Crypto | undefined {
  if (typeof globalThis === 'undefined') {
    return undefined;
  }

  const cryptoObj: Crypto | undefined =
    (globalThis as typeof globalThis & { crypto?: Crypto }).crypto ??
    (globalThis as typeof globalThis & { msCrypto?: Crypto }).msCrypto;

  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    return cryptoObj;
  }

  return undefined;
}

function randomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length);
  const cryptoObj = getCrypto();

  if (cryptoObj) {
    cryptoObj.getRandomValues(array);
    return array;
  }

  // Final fallback for runtimes without secure entropy (legacy tests, etc.)
  for (let i = 0; i < length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }

  return array;
}

export class Telemetry {
  enabled: boolean;
  documentGuid?: string;
  documentIdentifier?: string;
  superdocVersion: string;
  licenseKey: string;
  endpoint: string;
  sessionId: string;
  statistics: Statistics = {
    nodeTypes: {},
    markTypes: {},
    attributes: {},
    errorCount: 0,
  };
  unknownElements: UnknownElement[] = [];
  errors: TelemetryError[] = [];
  fileStructure: FileStructure = {
    totalFiles: 0,
    maxDepth: 0,
    totalNodes: 0,
    files: [],
  };
  documentInfo: DocumentInfo | null = null;

  static readonly COMMUNITY_LICENSE_KEY = 'community-and-eval-agplv3' as const;
  static readonly DEFAULT_ENDPOINT = 'https://ingest.superdoc.dev/v1/collect' as const;

  /**
   * Initialize telemetry service
   * @param config - Telemetry configuration
   */
  constructor(config: TelemetryConfig) {
    this.enabled = config.enabled ?? true;

    this.licenseKey = config.licenseKey ?? Telemetry.COMMUNITY_LICENSE_KEY;
    this.endpoint = config.endpoint ?? Telemetry.DEFAULT_ENDPOINT;

    // Update naming to match new system
    this.documentGuid = config.documentGuid; // Changed from superdocId
    this.documentIdentifier = config.documentIdentifier; // New: can be GUID or hash
    this.superdocVersion = config.superdocVersion;
    this.sessionId = this.generateId();
  }

  /**
   * Get browser environment information
   * @returns Browser information
   */
  getBrowserInfo(): BrowserInfo {
    return {
      userAgent: window.navigator.userAgent,
      currentUrl: window.location.href,
      hostname: window.location.hostname,
      referrerUrl: document.referrer,
      screenSize: {
        width: window.screen.width,
        height: window.screen.height,
      },
    };
  }

  /**
   * Track document usage event
   * @param name - Event name (use TelemetryEventNames for standard events)
   * @param properties - Additional properties
   */
  async trackUsage(name: TelemetryEventName, properties: TelemetryAttributes = {}): Promise<void> {
    if (!this.enabled) return;

    const event: TelemetryUsageEvent = {
      id: this.generateId(),
      type: 'usage',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      documentGuid: this.documentGuid, // Updated field name
      documentIdentifier: this.documentIdentifier, // Include both
      superdocVersion: this.superdocVersion,
      file: this.documentInfo,
      browser: this.getBrowserInfo(),
      name,
      properties,
    };

    await this.sendDataToTelemetry(event);
  }

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
  trackStatistic(category: 'node', data: Omit<Extract<StatisticData, { category: 'node' }>, 'category'>): void;
  trackStatistic(category: 'unknown', data: Omit<Extract<StatisticData, { category: 'unknown' }>, 'category'>): void;
  trackStatistic(category: 'error', data: Omit<Extract<StatisticData, { category: 'error' }>, 'category'>): void;
  trackStatistic(
    categoryOrData: StatisticCategory | StatisticData,
    legacyData?: Omit<StatisticData, 'category'>,
  ): void {
    // Normalize to new API format
    let data: StatisticData;
    if (typeof categoryOrData === 'string') {
      // Legacy API: trackStatistic(category, data)
      data = { ...legacyData, category: categoryOrData } as StatisticData;
    } else {
      // New API: trackStatistic(data)
      data = categoryOrData;
    }

    if (data.category === 'node') {
      // Type narrowing guarantees elementName exists
      this.statistics.nodeTypes[data.elementName] = (this.statistics.nodeTypes[data.elementName] || 0) + 1;
      this.fileStructure.totalNodes++;
    } else if (data.category === 'unknown') {
      // Type narrowing guarantees elementName exists
      const addedElement = this.unknownElements.find((e) => e.elementName === data.elementName);
      if (addedElement) {
        addedElement.count += 1;
        addedElement.attributes = {
          ...addedElement.attributes,
          ...data.attributes,
        };
      } else {
        this.unknownElements.push({
          elementName: data.elementName,
          count: 1,
          attributes: data.attributes,
        });
      }
    } else if (data.category === 'error') {
      this.errors.push(data);
      this.statistics.errorCount++;
    }

    if (data.category === 'node' && data.marks?.length) {
      data.marks.forEach((mark) => {
        this.statistics.markTypes[mark.type] = (this.statistics.markTypes[mark.type] || 0) + 1;
      });
    }

    // Style attributes
    if (data.attributes && Object.keys(data.attributes).length) {
      const styleAttributes = [
        'textIndent',
        'textAlign',
        'spacing',
        'lineHeight',
        'indent',
        'list-style-type',
        'listLevel',
        'textStyle',
        'order',
        'lvlText',
        'lvlJc',
        'listNumberingType',
        'numId',
      ];
      Object.keys(data.attributes).forEach((attribute) => {
        if (!styleAttributes.includes(attribute)) return;
        this.statistics.attributes[attribute] = (this.statistics.attributes[attribute] || 0) + 1;
      });
    }
  }

  /**
   * Track file structure
   * @param structure - File structure information
   * @param fileSource - original file
   * @param documentId - document GUID
   * @param documentIdentifier - document identifier (GUID or hash)
   * @param internalId - document ID from settings.xml
   */
  async trackFileStructure(
    structure: FileStructure,
    fileSource: File,
    documentId?: string,
    documentIdentifier?: string,
    internalId?: string,
  ): Promise<void> {
    this.fileStructure = structure;
    this.documentInfo = await this.processDocument(fileSource, {
      guid: documentId, // Updated parameter name
      identifier: documentIdentifier, // New parameter
      internalId: internalId,
    });
  }

  /**
   * Process document metadata
   * @param file - Document file
   * @param options - Additional options
   * @returns Document metadata
   */
  async processDocument(
    file: File | null,
    options: { guid?: string; identifier?: string; internalId?: string } = {},
  ): Promise<DocumentInfo | null> {
    if (!file) {
      console.warn('Telemetry: missing file source');
      return null;
    }

    return {
      guid: options.guid, // Updated from 'id'
      identifier: options.identifier, // New field
      name: file.name,
      size: file.size,
      lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : null,
      type: file.type || 'docx',
      internalId: options.internalId, // Microsoft's GUID if present
    };
  }

  isTelemetryDataChanged(): boolean {
    // Empty document case
    if (Object.keys(this.statistics.nodeTypes).length <= 1) return false;

    return (
      Object.keys(this.statistics.nodeTypes).length > 0 ||
      Object.keys(this.statistics.markTypes).length > 0 ||
      Object.keys(this.statistics.attributes).length > 0 ||
      this.statistics.errorCount > 0 ||
      this.fileStructure.totalFiles > 0 ||
      this.fileStructure.maxDepth > 0 ||
      this.fileStructure.totalNodes > 0 ||
      this.fileStructure.files.length > 0 ||
      this.errors.length > 0 ||
      this.unknownElements.length > 0
    );
  }

  /**
   * Sends current report
   * @returns Promise that resolves when report is sent
   */
  async sendReport(): Promise<void> {
    if (!this.enabled || !this.isTelemetryDataChanged()) return;

    const report: TelemetryParsingReport[] = [
      {
        id: this.generateId(),
        type: 'parsing',
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        documentGuid: this.documentGuid,
        documentIdentifier: this.documentIdentifier,
        superdocVersion: this.superdocVersion,
        file: this.documentInfo,
        browser: this.getBrowserInfo(),
        statistics: this.statistics,
        fileStructure: this.fileStructure,
        unknownElements: this.unknownElements,
        errors: this.errors,
      },
    ];

    await this.sendDataToTelemetry(report);
  }

  /**
   * Sends data to the service
   * @param data - Payload to send
   * @returns Promise that resolves when data is sent
   */
  async sendDataToTelemetry(data: TelemetryPayload): Promise<void> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-License-Key': this.licenseKey,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      } else {
        this.resetStatistics();
      }
    } catch (error) {
      console.error('Failed to upload telemetry:', error);
    }
  }

  /**
   * Generate unique identifier
   * @returns Unique ID
   * @private
   */
  generateId(): string {
    const timestamp = Date.now();
    const random = Array.from(randomBytes(4))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `${timestamp}-${random}`;
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.statistics = {
      nodeTypes: {},
      markTypes: {},
      attributes: {},
      errorCount: 0,
    };

    this.fileStructure = {
      totalFiles: 0,
      maxDepth: 0,
      totalNodes: 0,
      files: [],
    };

    this.unknownElements = [];

    this.errors = [];
  }
}
