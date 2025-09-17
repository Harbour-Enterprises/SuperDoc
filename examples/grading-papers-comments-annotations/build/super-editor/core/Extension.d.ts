/**
 * Extension class is used to create extensions.
 */
export class Extension {
    /**
     * Static method for creating an extension.
     * @param args Arguments for the constructor.
     */
    static create(...args: any[]): Extension;
    constructor(config: any);
    type: string;
    name: string;
    options: any;
    storage: any;
    config: {
        name: string;
    };
}
//# sourceMappingURL=Extension.d.ts.map