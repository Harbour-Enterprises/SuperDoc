export function isWordHtml(html: any): boolean;
/**
 * Handle HTML paste events.
 *
 * @param {String} html The HTML string to be pasted.
 * @param {Editor} editor The editor instance.
 * @param {String} source HTML content source
 * @returns {Boolean} Returns true if the paste was handled.
 */
export function handleHtmlPaste(html: string, editor: Editor, source: string): boolean;
/**
 * Handle HTML content before it is inserted into the editor.
 * This function is used to clean and sanitize HTML content,
 * converting em units to pt and removing unnecessary tags.
 * @param {String} html The HTML string to be processed.
 * @param {Editor} editor The editor instance.
 * @returns {DocumentFragment} The processed HTML string.
 */
export function htmlHandler(html: string, editor: Editor): DocumentFragment;
/**
 *  Cleans and sanitizes HTML content by removing unnecessary tags, entities, and extra whitespace.
 *
 * @param {String} html The HTML string to be processed.
 * @returns {String} The processed HTML string with em units converted to pt units.
 */
export function cleanHtmlUnnecessaryTags(html: string): string;
/**
 * Recursive function to sanitize HTML and remove forbidden tags.
 * @param {string} html The HTML string to be sanitized.
 * @param {string[]} forbiddenTags The list of forbidden tags to remove from the HTML.
 * @returns {DocumentFragment} The sanitized HTML as a DocumentFragment.
 */
export function sanitizeHtml(html: string, forbiddenTags?: string[]): DocumentFragment;
/**
 * Reusable paste-handling utility that replicates the logic formerly held only
 * inside the `inputRulesPlugin` paste handler. This allows other components
 * (e.g. slash-menu items) to invoke the same paste logic without duplicating
 * code.
 *
 * @param {Object}   params
 * @param {Editor}   params.editor  The SuperEditor instance.
 * @param {View}     params.view    The ProseMirror view associated with the editor.
 * @param {String}   html           HTML clipboard content (may be empty).
 * @returns {Boolean}               Whether the paste was handled.
 */
export function handleClipboardPaste({ editor, view }: {
    editor: Editor;
    view: View;
}, html: string): boolean;
export class InputRule {
    constructor(config: any);
    match: any;
    handler: any;
}
export function inputRulesPlugin({ editor, rules }: {
    editor: any;
    rules: any;
}): Plugin<any>;
export function convertEmToPt(html: string): string;
import { Plugin } from 'prosemirror-state';
