export function updateColumns(node: any, colgroup: any, table: any, cellMinWidth: any, overrideCol: any, overrideValue: any): void;
export function createTableView({ editor }: {
    editor: any;
}): {
    new (node: any, cellMinWidth: any): {
        editor: any;
        node: any;
        dom: HTMLDivElement;
        table: HTMLTableElement;
        colgroup: HTMLTableColElement;
        contentDOM: HTMLTableSectionElement;
        cellMinWidth: any;
        update(node: any): boolean;
        ignoreMutation(mutation: any): boolean;
    };
};
