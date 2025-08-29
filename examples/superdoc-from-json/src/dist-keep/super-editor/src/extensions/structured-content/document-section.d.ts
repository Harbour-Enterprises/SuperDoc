/**
 * @module DocumentSection
 * @sidebarTitle Document Section
 * @snippetPath /snippets/extensions/document-section.mdx
 */
export const DocumentSection: Node;
/**
 * Document section attributes
 */
export type SectionAttributes = {
    /**
     * - Unique section identifier
     */
    id?: number;
    /**
     * - Display label (becomes w:alias in Word)
     */
    title?: string;
    /**
     * - Additional metadata stored in w:tag
     */
    description?: string;
    /**
     * - Business type for filtering/logic (e.g., 'legal', 'pricing')
     */
    sectionType?: string;
    /**
     * - Lock state (maps to w:lock="sdtContentLocked")
     */
    isLocked?: boolean;
};
/**
 * Create a new document section
 */
export type SectionCreate = {
    /**
     * - Unique ID. Auto-increments from existing sections if omitted
     */
    id?: number;
    /**
     * - Label shown in section header
     */
    title?: string;
    /**
     * - Metadata for tracking (stored in Word's w:tag)
     */
    description?: string;
    /**
     * - Business classification
     */
    sectionType?: string;
    /**
     * - Prevent editing when true
     */
    isLocked?: boolean;
    /**
     * - HTML content to insert
     */
    html?: string;
    /**
     * - ProseMirror JSON (overrides html if both provided)
     */
    json?: any;
};
/**
 * Update an existing section
 */
export type SectionUpdate = {
    /**
     * - Target section ID (required)
     */
    id: number;
    /**
     * - Replace content with HTML
     */
    html?: string;
    /**
     * - Replace content with ProseMirror JSON (overrides html)
     */
    json?: any;
    /**
     * - Update attributes only (preserves content)
     */
    attrs?: Partial<SectionAttributes>;
};
import { Node } from '@core/index.js';
