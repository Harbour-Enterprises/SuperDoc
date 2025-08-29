export function createColGroup(node: any, cellMinWidth: any, overrideCol: any, overrideValue: any): {
    colgroup?: undefined;
    tableWidth?: undefined;
    tableMinWidth?: undefined;
    colgroupValues?: undefined;
} | {
    colgroup: {}[];
    tableWidth: string;
    tableMinWidth: string;
    colgroupValues: number[];
};
