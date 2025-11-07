/**
 * A map of plugin names to their helper API objects.
 * Each plugin defines its own helper methods.
 *
 * Example:
 * editor.helpers.linkedStyles.getStyles()
 */
export type EditorHelpers = Record<string, Record<string, Function>>;

/**
 * Export format options
 */
export type ExportFormat = 'docx' | 'json' | 'html' | 'markdown';

/**
 * Editor node options
 */
export interface EditorNodeOptions {
  [key: string]: any;
}

/**
 * Editor node storage
 */
export interface EditorNodeStorage {
  [key: string]: any;
}

/**
 * Re-export commonly used types
 */
export type {
  OxmlNodeConfig,
  OxmlNode,
} from '../OxmlNode.js';

export type {
  User,
  FieldValue,
  DocxNode,
  DocxFileEntry,
  EditorOptions,
  PermissionParams,
  EditorExtension,
  CollaborationProvider,
} from './EditorConfig.js';
