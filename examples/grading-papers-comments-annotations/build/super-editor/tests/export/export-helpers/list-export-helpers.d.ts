export function testListNodes({ node, expectedLevel, expectedNumPr, text }: TestListNodesParams): void;
export function getListAttrFromNumPr(attrName: string, node: any): string;
/**
 * A type definition for the parameters of the testListNodes function.
 */
export type TestListNodesParams = {
    /**
     * - The node object to be tested
     */
    node: any;
    /**
     * - The expected level of the node
     */
    expectedLevel: number;
    /**
     * - The expected numPr id of the node
     */
    expectedNumPr: number;
    /**
     * - The expected text content of the node
     */
    text: string;
};
//# sourceMappingURL=list-export-helpers.d.ts.map