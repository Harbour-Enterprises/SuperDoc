/**
 * Shared type definitions for Pinia stores
 *
 * This module provides type exports for store instances to avoid
 * circular dependencies and the ReturnType pattern.
 */

import type { useSuperdocStore } from './superdoc-store';
import type { useCommentsStore } from './comments-store';

/**
 * Selection bounds for positioning comments and annotations
 */
export interface SelectionBounds {
  /** Top position */
  top: number;
  /** Left position */
  left: number;
  /** Width of the selection */
  width?: number;
  /** Height of the selection */
  height?: number;
  /** Right position */
  right?: number;
  /** Bottom position */
  bottom?: number;
  [key: string]: unknown;
}

/**
 * SuperDoc store instance type
 * Use this instead of ReturnType<typeof useSuperdocStore>
 */
export type SuperdocStoreInstance = ReturnType<typeof useSuperdocStore>;

/**
 * Comments store instance type
 * Use this instead of ReturnType<typeof useCommentsStore>
 */
export type CommentsStoreInstance = ReturnType<typeof useCommentsStore>;
