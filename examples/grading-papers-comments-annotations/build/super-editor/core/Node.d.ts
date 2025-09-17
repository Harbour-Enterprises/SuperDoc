/**
 * Node class is used to create Node extensions.
 */
export class Node {
    /**
     * Static method for creating Node extension.
     * @param args Arguments for the constructor.
     */
    static create(...args: any[]): Node;
    constructor(config: any);
    type: string;
    name: string;
    options: any;
    storage: any;
    config: {
        name: string;
    };
}
//# sourceMappingURL=Node.d.ts.map