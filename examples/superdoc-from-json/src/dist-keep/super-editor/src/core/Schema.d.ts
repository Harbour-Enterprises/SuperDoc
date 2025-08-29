/**
 * Schema class is used to create and work with schema.
 */
export class Schema {
    /**
     * Creates PM schema by resolved extensions.
     * @param extensions List of extensions.
     * @param editor Editor instance.
     * @returns PM schema
     */
    static createSchemaByExtensions(extensions: any, editor: any): PmSchema<string, string>;
    /**
     * Creates nodes schema by Node extensions.
     * @param nodeExtensions Node extensions.
     * @param attributes List of all extension attributes.
     * @param editor Editor instance.
     * @returns Nodes schema.
     */
    static #createNodesSchema(nodeExtensions: any, attributes: any, editor: any): {
        [k: string]: any;
    };
    /**
     * Creates marks schema by Marks extensions.
     * @param markExtensions Marks extensions.
     * @param attributes List of all extension attributes.
     * @param editor Editor instance.
     * @returns Marks schema.
     */
    static #createMarksSchema(markExtensions: any, attributes: any, editor: any): {
        [k: string]: any;
    };
}
import { Schema as PmSchema } from 'prosemirror-model';
