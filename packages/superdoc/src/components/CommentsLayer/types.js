/**
 * @typedef {Object} Comment
 * @property {string} commentId - Unique identifier for the comment
 * @property {string} parentCommentId - Parent's comment ID
 * @property {string} fileId - ID of the file the comment belongs to
 * @property {string} fileType - MIME type of the file (e.g., "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
 * @property {Array} mentions - Array of mentioned users/entities
 * @property {string} creatorName - Name of the comment creator
 * @property {number} createdTime - Timestamp when the comment was created
 * @property {string} importedId - Imported comment's ID
 * @property {Object} importedAuthor - Information about imported author
 * @property {string} importedAuthor.name - The name of the imported author
 * @property {boolean} isInternal - Whether the comment is internal
 * @property {string} commentText - HTML text content of the comment
 * @property {Object} selection - Selection information for the comment
 * @property {string} selection.documentId - The ID of the document
 * @property {number} selection.page - The page number where the comment is located
 * @property {Object} selection.selectionBounds - The bounds of the selected text
 * @property {boolean} trackedChange - Whether this is a tracked change
 * @property {string|null} trackedChangeText - Text of the tracked change
 * @property {'trackInsert' | 'trackDelete' | 'both' | 'trackFormat'} trackedChangeType - Type of tracked change
 * @property {string|null} deletedText - Text that was deleted
 * @property {number|null} resolvedTime - Timestamp when comment was resolved
 * @property {string|null} resolvedByEmail - Email of user who resolved the comment
 * @property {string|null} resolvedByName - Name of user who resolved the comment
 * @property {CommentJSON} commentJSON - Structured JSON representation of the comment content
 */

/**
 * @typedef {Object} CommentContent
 * @property {string} type - The type of content (e.g., "text")
 * @property {Array<Object>} marks - Array of text marks/formatting
 * @property {string} marks[].type - The type of mark (e.g., "textStyle")
 * @property {Object} marks[].attrs - The attributes of the text mark
 * @property {string} marks[].attrs.color - Text color
 * @property {string} marks[].attrs.fontFamily - Font family
 * @property {string} marks[].attrs.fontSize - Font size (e.g., "10pt")
 * @property {string|null} marks[].attrs.styleId - Style identifier
 * @property {string} text - The actual text content
 */

/**
 * @typedef {Object} CommentJSON
 * @property {string} type - The type of content (e.g., "paragraph")
 * @property {Object} attrs - Paragraph attributes
 * @property {string|null} attrs.lineHeight - Line height for Paragraph
 * @property {string|null} attrs.textIndent - Text indentation
 * @property {string|null} attrs.paraId - Paragraph ID
 * @property {string|null} attrs.textId - Text ID
 * @property {string|null} attrs.rsidR - Revision Identifier for Paragraph
 * @property {string|null} attrs.rsidRDefault - Default Revision Identifier for Runs
 * @property {string|null} attrs.rsidP - Revision Identifier for Paragraph Properties
 * @property {string|null} attrs.rsidRPr - Revision Identifier for Paragraph Glyph Formatting
 * @property {string|null} attrs.rsidDel - Revision Identifier for Paragraph Deletion
 * @property {Object} attrs.spacing - Spacing configuration
 * @property {number} attrs.spacing.lineSpaceAfter - Line spacing after the paragraph
 * @property {number} attrs.spacing.lineSpaceBefore - Line spacing before the paragraph
 * @property {number} attrs.spacing.line - Line spacing value
 * @property {string|null} attrs.spacing.lineRule - Line spacing rule
 * @property {Object} attrs.extraAttrs - Additional attributes
 * @property {Array|null} attrs.marksAttrs - Marks attributes
 * @property {any} attrs.indent - Indentation settings
 * @property {any} attrs.borders - Border settings
 * @property {string|null} attrs.class - CSS class
 * @property {string|null} attrs.styleId - Style identifier
 * @property {string|null} attrs.sdBlockId - SuperDoc block identifier (uuid)
 * @property {any} attrs.attributes - Additional attributes
 * @property {string|null} attrs.filename - Associated filename
 * @property {boolean | null} attrs.keepLines - Keep lines together setting
 * @property {boolean|null} attrs.keepNext - Keep with next paragraph setting
 * @property {Object|null} attrs.paragraphProperties - Paragraph properties
 * @property {string|null} attrs.dropcap - Drop cap settings
 * @property {string|null} attrs.pageBreakSource - Page break source
 * @property {any} attrs.justify - Text justification
 * @property {any} attrs.tabStops - Tab stops configuration
 * @property {Array<CommentContent>} content - Array of content elements
 */

export {};
