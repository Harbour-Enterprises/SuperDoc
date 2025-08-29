/**
 * Mark class is used to create Mark extensions.
 */
export class Mark {
    /**
     * Static method for creating Mark extension.
     * @param args Arguments for the constructor.
     */
    static create(...args: any[]): Mark;
    constructor(config: any);
    type: string;
    name: string;
    options: any;
    storage: any;
    isExternal: boolean;
    config: {
        name: string;
    };
}
