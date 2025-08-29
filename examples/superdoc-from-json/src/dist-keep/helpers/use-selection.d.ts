export default function useSelection(params: any): {
    documentId: import("vue").Ref<any, any>;
    page: import("vue").Ref<any, any>;
    selectionBounds: any;
    source: import("vue").Ref<any, any>;
    getValues: () => {
        documentId: any;
        page: any;
        selectionBounds: any;
        source: any;
    };
    getContainerId: () => string;
    getContainerLocation: (parentContainer: any) => {
        top: number;
        left: number;
    };
};
//# sourceMappingURL=use-selection.d.ts.map