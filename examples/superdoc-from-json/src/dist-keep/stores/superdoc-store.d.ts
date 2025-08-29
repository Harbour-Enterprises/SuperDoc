export const useSuperdocStore: import("pinia").StoreDefinition<"superdoc", Pick<{
    commentsStore: any;
    documents: import("vue").Ref<any[], any[]>;
    documentBounds: import("vue").Ref<any[], any[]>;
    pages: {};
    documentUsers: import("vue").Ref<any[], any[]>;
    users: import("vue").Ref<any[], any[]>;
    activeZoom: import("vue").Ref<number, number>;
    documentScroll: {
        scrollTop: number;
        scrollLeft: number;
    };
    isInternal: import("vue").Ref<boolean, boolean>;
    selectionPosition: import("vue").Ref<{
        left: number;
        top: number;
        width: number;
        height: number;
        source: any;
    }, {
        left: number;
        top: number;
        width: number;
        height: number;
        source: any;
    } | {
        left: number;
        top: number;
        width: number;
        height: number;
        source: any;
    }>;
    activeSelection: import("vue").Ref<any, any>;
    isReady: import("vue").Ref<boolean, boolean>;
    user: {
        name: any;
        email: any;
    };
    modules: {};
    areDocumentsReady: import("vue").ComputedRef<boolean>;
    init: (config: any) => Promise<void>;
    reset: () => void;
    handlePageReady: (documentId: any, index: any, containerBounds: any) => void;
    getDocument: (documentId: any) => any;
    getPageBounds: (documentId: any, page: any) => {
        top: number;
    };
}, any>, Pick<{
    commentsStore: any;
    documents: import("vue").Ref<any[], any[]>;
    documentBounds: import("vue").Ref<any[], any[]>;
    pages: {};
    documentUsers: import("vue").Ref<any[], any[]>;
    users: import("vue").Ref<any[], any[]>;
    activeZoom: import("vue").Ref<number, number>;
    documentScroll: {
        scrollTop: number;
        scrollLeft: number;
    };
    isInternal: import("vue").Ref<boolean, boolean>;
    selectionPosition: import("vue").Ref<{
        left: number;
        top: number;
        width: number;
        height: number;
        source: any;
    }, {
        left: number;
        top: number;
        width: number;
        height: number;
        source: any;
    } | {
        left: number;
        top: number;
        width: number;
        height: number;
        source: any;
    }>;
    activeSelection: import("vue").Ref<any, any>;
    isReady: import("vue").Ref<boolean, boolean>;
    user: {
        name: any;
        email: any;
    };
    modules: {};
    areDocumentsReady: import("vue").ComputedRef<boolean>;
    init: (config: any) => Promise<void>;
    reset: () => void;
    handlePageReady: (documentId: any, index: any, containerBounds: any) => void;
    getDocument: (documentId: any) => any;
    getPageBounds: (documentId: any, page: any) => {
        top: number;
    };
}, any>, Pick<{
    commentsStore: any;
    documents: import("vue").Ref<any[], any[]>;
    documentBounds: import("vue").Ref<any[], any[]>;
    pages: {};
    documentUsers: import("vue").Ref<any[], any[]>;
    users: import("vue").Ref<any[], any[]>;
    activeZoom: import("vue").Ref<number, number>;
    documentScroll: {
        scrollTop: number;
        scrollLeft: number;
    };
    isInternal: import("vue").Ref<boolean, boolean>;
    selectionPosition: import("vue").Ref<{
        left: number;
        top: number;
        width: number;
        height: number;
        source: any;
    }, {
        left: number;
        top: number;
        width: number;
        height: number;
        source: any;
    } | {
        left: number;
        top: number;
        width: number;
        height: number;
        source: any;
    }>;
    activeSelection: import("vue").Ref<any, any>;
    isReady: import("vue").Ref<boolean, boolean>;
    user: {
        name: any;
        email: any;
    };
    modules: {};
    areDocumentsReady: import("vue").ComputedRef<boolean>;
    init: (config: any) => Promise<void>;
    reset: () => void;
    handlePageReady: (documentId: any, index: any, containerBounds: any) => void;
    getDocument: (documentId: any) => any;
    getPageBounds: (documentId: any, page: any) => {
        top: number;
    };
}, any>>;
//# sourceMappingURL=superdoc-store.d.ts.map