declare module '@superdoc/pm-adapter' {
  import type { FlowBlock } from '@superdoc/contracts';

  /**
   * ProseMirror node shape (simplified interface)
   */
  export interface PMNode {
    type: string;
    attrs?: Record<string, unknown>;
    content?: PMNode[];
    text?: string;
    marks?: PMMark[];
  }

  /**
   * ProseMirror mark shape
   */
  export interface PMMark {
    type: string;
    attrs?: Record<string, unknown>;
  }

  /**
   * Adapter options for customizing conversion behavior
   */
  export interface AdapterOptions {
    defaultFont?: string;
    defaultSize?: number;
    blockIdPrefix?: string;
    mediaFiles?: Record<string, string>;
    emitSectionBreaks?: boolean;
    enableTrackedChanges?: boolean;
    enableRichHyperlinks?: boolean;
    trackedChangesMode?: import('@superdoc/contracts').TrackedChangesMode;
    sectionMetadata?: import('@superdoc/contracts').SectionMetadata[];
    themeColors?: Record<string, string>;
    converterContext?: {
      docx?: unknown;
      numbering?: unknown;
      linkedStyles?: unknown;
    };
  }

  /**
   * Flow blocks result with bookmark tracking
   */
  export interface FlowBlocksResult {
    blocks: FlowBlock[];
    bookmarks: Map<string, number>;
  }

  /**
   * Convert a ProseMirror document to FlowBlocks with bookmark tracking
   */
  export function toFlowBlocks(pmDoc: PMNode | object, options?: AdapterOptions): FlowBlocksResult;

  /**
   * Batch convert multiple ProseMirror documents to FlowBlocks
   */
  export function toFlowBlocksMap(
    documents: Record<string, PMNode | object | null | undefined>,
    options?: AdapterOptions,
  ): Record<string, FlowBlock[]>;
}
