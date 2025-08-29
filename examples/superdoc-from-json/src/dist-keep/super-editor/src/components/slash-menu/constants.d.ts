export namespace ICONS {
    export { plusIconSvg as addRowBefore };
    export { plusIconSvg as addRowAfter };
    export { plusIconSvg as addColumnBefore };
    export { plusIconSvg as addColumnAfter };
    export { trashIconSvg as deleteRow };
    export { trashIconSvg as deleteColumn };
    export { trashIconSvg as deleteTable };
    export { borderNoneIconSvg as deleteBorders };
    export { arrowsToDotIconSvg as mergeCells };
    export { arrowsLeftRightIconSvg as splitCell };
    export { wrenchIconSvg as fixTables };
    export { magicWandIcon as ai };
    export { linkIconSvg as link };
    export { tableIconSvg as table };
    export { scissorsIconSvg as cut };
    export { copyIconSvg as copy };
    export { pasteIconSvg as paste };
    export { plusIconSvg as addDocumentSection };
    export { trashIconSvg as removeDocumentSection };
}
export namespace TEXTS {
    let addRowBefore: string;
    let addRowAfter: string;
    let addColumnBefore: string;
    let addColumnAfter: string;
    let deleteRow: string;
    let deleteColumn: string;
    let deleteTable: string;
    let transparentBorders: string;
    let mergeCells: string;
    let splitCell: string;
    let fixTables: string;
    let insertText: string;
    let replaceText: string;
    let insertLink: string;
    let insertTable: string;
    let editTable: string;
    let cut: string;
    let copy: string;
    let paste: string;
    let removeDocumentSection: string;
    let createDocumentSection: string;
}
export const tableActionsOptions: ({
    label: string;
    command: string;
    icon: any;
    props: {
        'data-item': string;
        ariaLabel: string;
    };
    bottomBorder?: undefined;
} | {
    label: string;
    command: string;
    icon: any;
    bottomBorder: boolean;
    props: {
        'data-item': string;
        ariaLabel: string;
    };
})[];
export namespace TRIGGERS {
    let slash: string;
    let click: string;
}
