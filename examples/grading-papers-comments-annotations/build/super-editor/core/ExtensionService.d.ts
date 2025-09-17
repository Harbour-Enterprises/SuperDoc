/**
 * ExtensionService is the main class to work with extensions.
 */
export class ExtensionService {
    /**
     * Static method for creating ExtensionService.
     * @param args Arguments for the constructor.
     */
    static create(...args: any[]): ExtensionService;
    /**
     * Get an array of resolved extensions (e.g. sorted by priority).
     * @param extensions Array of extensions.
     * @returns Array of resolved extensions.
     */
    static getResolvedExtensions(extensions: any): any;
    /**
     * Sort extensions by priority.
     * @param extensions Array of extensions.
     * @returns Array of sorted extensions by priority.
     */
    static sortByPriority(extensions: any): any;
    constructor(extensions: any, userExtensions: any, editor: any);
    editor: any;
    schema: import("prosemirror-model").Schema<string, string>;
    extensions: any;
    externalExtensions: any[];
    splittableMarks: any[];
    /**
     * Get all attributes defined in the extensions.
     * @returns Array of attributes.
     */
    get attributes(): any[];
    /**
     * Get all commands defined in the extensions.
     * @returns Object with commands (key - command name, value - function).
     */
    get commands(): {};
    /**
     * Get all helper methods defined in the extensions.
     * Each extension can define its own helper methods.
     * Example: editor.helpers.linkedStyles.getStyles()
     * @returns {Object} Object with helper methods for extensions.
     */
    get helpers(): any;
    /**
     * Get all PM plugins defined in the extensions.
     * And also keyboard shortcuts.
     * @returns Array of PM plugins.
     */
    get plugins(): any[];
    /**
     * Get all node views from the extensions.
     * @returns An object with all node views.
     */
    get nodeViews(): {
        [k: string]: any;
    };
    #private;
}
//# sourceMappingURL=ExtensionService.d.ts.map