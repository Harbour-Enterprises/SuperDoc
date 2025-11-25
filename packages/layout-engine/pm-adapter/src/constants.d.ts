/**
 * Constants and default values for PM adapter
 */
import type { TrackedChangeKind } from '@superdoc/contracts';
import type { HyperlinkConfig } from './types.js';
import { SectionType } from './types.js';
/**
 * Unit conversion constants
 */
export declare const TWIPS_PER_INCH = 1440;
export declare const PX_PER_INCH = 96;
export declare const PX_PER_PT: number;
/**
 * Default typography settings
 */
export declare const DEFAULT_FONT = 'Arial';
export declare const DEFAULT_SIZE = 16;
/**
 * List formatting defaults
 */
export declare const DEFAULT_LIST_INDENT_BASE_PX = 24;
export declare const DEFAULT_LIST_INDENT_STEP_PX = 24;
export declare const DEFAULT_LIST_HANGING_PX = 18;
export declare const DEFAULT_NUMBERING_TYPE = 'decimal';
export declare const DEFAULT_LVL_TEXT = '%1.';
/**
 * Locale defaults
 */
export declare const DEFAULT_DECIMAL_SEPARATOR = '.';
/**
 * Section defaults
 */
export declare const DEFAULT_COLUMN_GAP_INCHES = 0.5;
/**
 * BiDi indentation defaults
 */
export declare const MIN_BIDI_CLAMP_INDENT_PX = 1;
export declare const DEFAULT_BIDI_INDENT_PX = 24;
/**
 * Section type defaults
 */
export declare const DEFAULT_PARAGRAPH_SECTION_TYPE: SectionType;
export declare const DEFAULT_BODY_SECTION_TYPE: SectionType;
/**
 * Tracked changes mark types
 */
export declare const TRACK_INSERT_MARK = 'trackInsert';
export declare const TRACK_DELETE_MARK = 'trackDelete';
export declare const TRACK_FORMAT_MARK = 'trackFormat';
/**
 * Map mark types to tracked change kinds
 */
export declare const TRACK_CHANGE_KIND_MAP: Record<string, TrackedChangeKind>;
/**
 * Tracked change priority for selecting between overlapping marks
 */
export declare const TRACK_CHANGE_PRIORITY: Record<TrackedChangeKind, number>;
/**
 * Valid tracked changes mode values.
 * Used for runtime validation to prevent unsafe type casts.
 */
export declare const VALID_TRACKED_MODES: readonly ['review', 'original', 'final', 'off'];
/**
 * Maximum allowed length for JSON-stringified run mark payloads.
 * Set to 10KB to balance flexibility with DoS protection.
 */
export declare const MAX_RUN_MARK_JSON_LENGTH = 10000;
/**
 * Maximum number of marks allowed in before/after arrays.
 * Prevents memory exhaustion from malicious payloads while supporting
 * reasonable formatting complexity.
 */
export declare const MAX_RUN_MARK_ARRAY_LENGTH = 100;
/**
 * Maximum nesting depth for mark attribute objects.
 * Protects against stack overflow from deeply nested structures.
 */
export declare const MAX_RUN_MARK_DEPTH = 5;
/**
 * Default hyperlink configuration
 */
export declare const DEFAULT_HYPERLINK_CONFIG: HyperlinkConfig;
/**
 * Atomic inline node types that cannot contain content
 */
export declare const ATOMIC_INLINE_TYPES: Set<string>;
/**
 * Token inline types mapping
 */
export declare const TOKEN_INLINE_TYPES: Map<string, 'pageNumber' | 'totalPageCount' | 'pageReference'>;
/**
 * Valid link target values
 */
export declare const VALID_LINK_TARGETS: Set<string>;
/**
 * Bullet marker characters
 */
export declare const BULLET_MARKERS: string[];
/**
 * Valid wrap types for images/drawings
 */
export declare const WRAP_TYPES: Set<string>;
/**
 * Valid wrap text values
 */
export declare const WRAP_TEXT_VALUES: Set<string>;
/**
 * Valid horizontal relative positioning values
 */
export declare const H_RELATIVE_VALUES: Set<string>;
/**
 * Valid vertical relative positioning values
 */
export declare const V_RELATIVE_VALUES: Set<string>;
/**
 * Valid horizontal alignment values
 */
export declare const H_ALIGN_VALUES: Set<string>;
/**
 * Valid vertical alignment values
 */
export declare const V_ALIGN_VALUES: Set<string>;
