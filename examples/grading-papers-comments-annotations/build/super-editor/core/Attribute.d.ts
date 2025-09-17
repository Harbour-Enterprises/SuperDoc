/**
 * Attribute class is a space that contains
 * methods for working with attributes.
 */
export class Attribute {
    /**
     * Get a list of all attributes defined in the extensions.
     * @param extensions List of all extensions.
     * @returns Extension attributes.
     */
    static getAttributesFromExtensions(extensions: any): any[];
    /**
     * Get a list of global attributes defined in the extensions.
     * @param extensions List of all extensions.
     * @param defaultAttribute Default attribute.
     * @returns Global extension attributes.
     */
    static #getGlobalAttributes(extensions: any, defaultAttribute: any): any[];
    /**
     * Get a list of attributes defined in the Node and Mark extensions.
     * @param extensions List of all extensions.
     * @param defaultAttribute Default attribute.
     * @returns Node and Mark extension attributes.
     */
    static #getNodeAndMarksAttributes(extensions: any, defaultAttribute: any): {
        type: any;
        name: string;
        attribute: any;
    }[];
    /**
     * Inserts extension attributes into parseRule attributes.
     * @param parseRule PM ParseRule.
     * @param extensionAttrs List of attributes to insert.
     */
    static insertExtensionAttrsToParseRule(parseRule: any, extensionAttrs: any): any;
    /**
     * Get attributes to render.
     * @param nodeOrMark Node or Mark.
     * @param extensionAttrs Extension attributes.
     */
    static getAttributesToRender(nodeOrMark: any, extensionAttrs: any): {};
    /**
     * Merges attributes.
     * @param objects Objects with attributes.
     * @returns Object with merged attributes.
     */
    static mergeAttributes(...objects: any[]): {};
    /**
     * Get extension attributes that should be splitted by keepOnSplit flag.
     * @param extensionAttrs Array of attributes.
     * @param typeName The type of the extension.
     * @param attributes The extension attributes.
     * @returns The splitted attributes.
     */
    static getSplittedAttributes(extensionAttrs: any, typeName: any, attributes: any): {
        [k: string]: any;
    };
    /**
     * Get mark attrs on the current editor state.
     * @param state The current editor state.
     * @param typeOrName The mark type or name.
     * @returns The mark attrs.
     */
    static getMarkAttributes(state: any, typeOrName: any): any;
    /**
     * Get node attrs on the current editor state.
     * @param state The current editor state.
     * @param typeOrName The node type or name.
     * @returns The node attrs.
     */
    static getNodeAttributes(state: any, typeOrName: any): any;
    /**
     * Get node or mark attrs on the current editor state.
     * @param state The current editor state.
     * @param typeOrName The node/mark type or name.
     * @returns The attrs of the node/mark or an empty object.
     */
    static getAttributes(state: any, typeOrName: any): any;
}
//# sourceMappingURL=Attribute.d.ts.map