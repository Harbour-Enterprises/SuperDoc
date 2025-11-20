/**
 * Type definitions for the v1-beta-demo application.
 * These types ensure type safety across event handlers, callbacks, and environment access.
 */

/**
 * Vite import.meta.env type extension.
 * Provides type-safe access to environment variables in Vite builds.
 */
export interface ImportMetaEnv {
  /**
   * The mode the app is running in (e.g., 'development', 'production', 'test').
   * Set by Vite based on NODE_ENV or --mode flag.
   */
  MODE?: string;
}

/**
 * Extended ImportMeta interface with typed env property.
 */
export interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Payload structure for content errors in SuperDoc.
 * Emitted when layout engine encounters rendering or content processing errors.
 */
export interface ContentErrorPayload {
  /**
   * The error that occurred during content processing.
   * May be a native Error object or an object with a message property.
   */
  error?: Error | { message: string };
}

/**
 * Metrics data from the layout pipeline.
 * Provides performance and layout statistics after rendering.
 */
export interface LayoutPipelineMetrics {
  /**
   * Total time taken to complete the layout operation, in milliseconds.
   */
  durationMs?: number;
}

/**
 * Layout structure information from the layout pipeline.
 * Contains the rendered page data.
 */
export interface LayoutPipelineLayout {
  /**
   * Array of rendered pages. Each page is an opaque layout object.
   */
  pages?: Array<unknown>;
}

/**
 * Data payload for successful layout pipeline events.
 */
export interface LayoutPipelineSuccessData {
  /**
   * Performance metrics for the layout operation.
   */
  metrics?: LayoutPipelineMetrics;

  /**
   * The computed layout structure.
   */
  layout?: LayoutPipelineLayout;
}

/**
 * Data payload for layout pipeline error events.
 */
export interface LayoutPipelineErrorData {
  /**
   * The error that occurred during layout.
   * May be a native Error object or an object with a message property.
   */
  error?: Error | { message: string };
}

/**
 * Payload structure for layout-pipeline events.
 * Discriminated union based on the 'type' field.
 */
export type LayoutPipelinePayload =
  | {
      /**
       * Event type indicating successful layout completion.
       */
      type: 'layout';
      /**
       * Layout success data including metrics and page information.
       */
      data?: LayoutPipelineSuccessData;
    }
  | {
      /**
       * Event type indicating a layout error.
       */
      type: 'error';
      /**
       * Error data containing the error that occurred.
       */
      data?: LayoutPipelineErrorData;
    };
