/**
 * Tracked change type for comments
 */
export type TrackedChangeType = 'trackInsert' | 'trackDelete' | 'both' | 'trackFormat';

/**
 * Imported author information
 */
export interface ImportedAuthor {
  /** The name of the imported author */
  name?: string;
  /** The email of the imported author */
  email?: string;
}

/**
 * Text mark/formatting attributes
 */
export interface MarkAttrs {
  /** Text color */
  color?: string;
  /** Font family */
  fontFamily?: string;
  /** Font size (e.g., "10pt") */
  fontSize?: string;
  /** Style identifier */
  styleId?: string | null;
}

/**
 * Text mark/formatting information
 */
export interface Mark {
  /** The type of mark (e.g., "textStyle") */
  type: string;
  /** The attributes of the text mark */
  attrs: MarkAttrs;
}

/**
 * Comment content element
 */
export interface CommentContent {
  /** The type of content (e.g., "text") */
  type: string;
  /** Array of text marks/formatting */
  marks?: Mark[];
  /** The actual text content */
  text?: string;
}

/**
 * Spacing configuration for paragraph
 */
export interface ParagraphSpacing {
  /** Line spacing after the paragraph */
  lineSpaceAfter?: number;
  /** Line spacing before the paragraph */
  lineSpaceBefore?: number;
  /** Line spacing value */
  line?: number;
  /** Line spacing rule */
  lineRule?: string | null;
}

/**
 * Paragraph attributes for comment JSON
 */
export interface ParagraphAttrs {
  /** Line height for Paragraph */
  lineHeight?: string | null;
  /** Text indentation */
  textIndent?: string | null;
  /** Paragraph ID */
  paraId?: string | null;
  /** Text ID */
  textId?: string | null;
  /** Revision Identifier for Paragraph */
  rsidR?: string | null;
  /** Default Revision Identifier for Runs */
  rsidRDefault?: string | null;
  /** Revision Identifier for Paragraph Properties */
  rsidP?: string | null;
  /** Revision Identifier for Paragraph Glyph Formatting */
  rsidRPr?: string | null;
  /** Revision Identifier for Paragraph Deletion */
  rsidDel?: string | null;
  /** Spacing configuration */
  spacing?: ParagraphSpacing;
  /** Additional attributes */
  extraAttrs?: Record<string, unknown>;
  /** Marks attributes */
  marksAttrs?: unknown[] | null;
  /** Indentation settings */
  indent?: unknown;
  /** Border settings */
  borders?: unknown;
  /** CSS class */
  class?: string | null;
  /** Style identifier */
  styleId?: string | null;
  /** SuperDoc block identifier (uuid) */
  sdBlockId?: string | null;
  /** Additional attributes */
  attributes?: unknown;
  /** Associated filename */
  filename?: string | null;
  /** Keep lines together setting */
  keepLines?: boolean | null;
  /** Keep with next paragraph setting */
  keepNext?: boolean | null;
  /** Paragraph properties */
  paragraphProperties?: Record<string, unknown> | null;
  /** Drop cap settings */
  dropcap?: string | null;
  /** Page break source */
  pageBreakSource?: string | null;
  /** Text justification */
  justify?: unknown;
  /** Tab stops configuration */
  tabStops?: unknown;
}

/**
 * Structured JSON representation of the comment content
 */
export interface CommentJSON {
  /** The type of content (e.g., "paragraph") */
  type: string;
  /** Paragraph attributes */
  attrs?: ParagraphAttrs;
  /** Array of content elements */
  content?: CommentContent[];
}

/**
 * Selection bounds for comment positioning
 */
export interface SelectionBounds {
  /** Top position */
  top?: number;
  /** Left position */
  left?: number;
  /** Right position */
  right?: number;
  /** Bottom position */
  bottom?: number;
  /** Width */
  width?: number;
  /** Height */
  height?: number;
}

/**
 * Selection information for a comment
 */
export interface CommentSelection {
  /** The ID of the document */
  documentId: string;
  /** The page number where the comment is located */
  page: number;
  /** The bounds of the selected text */
  selectionBounds: SelectionBounds;
  /** Optional source of the selection */
  source?: string;
}

/**
 * Mention of a user in a comment
 */
export interface Mention {
  /** Name of the mentioned user */
  name: string;
  /** Email of the mentioned user */
  email: string;
}

/**
 * A comment in the document
 */
export interface Comment {
  /** Unique identifier for the comment */
  commentId: string;
  /** Parent's comment ID */
  parentCommentId?: string;
  /** ID of the file the comment belongs to */
  fileId?: string;
  /** MIME type of the file (e.g., "application/vnd.openxmlformats-officedocument.wordprocessingml.document") */
  fileType?: string;
  /** Array of mentioned users/entities */
  mentions?: Mention[];
  /** Name of the comment creator */
  creatorName?: string;
  /** Email of the comment creator */
  creatorEmail?: string;
  /** Image/avatar of the comment creator */
  creatorImage?: string;
  /** Timestamp when the comment was created */
  createdTime?: number;
  /** Imported comment's ID */
  importedId?: string;
  /** Information about imported author */
  importedAuthor?: ImportedAuthor | null;
  /** Whether the comment is internal */
  isInternal?: boolean;
  /** HTML text content of the comment */
  commentText?: string;
  /** Selection information for the comment */
  selection?: CommentSelection;
  /** Whether this is a tracked change */
  trackedChange?: boolean;
  /** Text of the tracked change */
  trackedChangeText?: string | null;
  /** Type of tracked change */
  trackedChangeType?: TrackedChangeType | null;
  /** Text that was deleted */
  deletedText?: string | null;
  /** Timestamp when comment was resolved */
  resolvedTime?: number | null;
  /** Email of user who resolved the comment */
  resolvedByEmail?: string | null;
  /** Name of user who resolved the comment */
  resolvedByName?: string | null;
  /** Structured JSON representation of the comment content */
  commentJSON?: CommentJSON;
  /** Version number when comment was created */
  createdAtVersionNumber?: number;
  /** Unique user identifier */
  uid?: string;
}
