export const useHrbrFieldsStore: import("pinia").StoreDefinition<"hrbr-fields", Pick<{
    hrbrFieldsConfig: {
        name: string;
    };
    fieldComponentsMap: Readonly<{
        TEXTINPUT: any;
        HTMLINPUT: any;
        SELECT: any;
        CHECKBOXINPUT: any;
        SIGNATUREINPUT: any;
        IMAGEINPUT: any;
    }>;
    getAnnotations: import("vue").ComputedRef<any[]>;
    getField: (documentId: any, fieldId: any) => any;
}, "hrbrFieldsConfig" | "fieldComponentsMap">, Pick<{
    hrbrFieldsConfig: {
        name: string;
    };
    fieldComponentsMap: Readonly<{
        TEXTINPUT: any;
        HTMLINPUT: any;
        SELECT: any;
        CHECKBOXINPUT: any;
        SIGNATUREINPUT: any;
        IMAGEINPUT: any;
    }>;
    getAnnotations: import("vue").ComputedRef<any[]>;
    getField: (documentId: any, fieldId: any) => any;
}, "getAnnotations">, Pick<{
    hrbrFieldsConfig: {
        name: string;
    };
    fieldComponentsMap: Readonly<{
        TEXTINPUT: any;
        HTMLINPUT: any;
        SELECT: any;
        CHECKBOXINPUT: any;
        SIGNATUREINPUT: any;
        IMAGEINPUT: any;
    }>;
    getAnnotations: import("vue").ComputedRef<any[]>;
    getField: (documentId: any, fieldId: any) => any;
}, "getField">>;
//# sourceMappingURL=hrbr-fields-store.d.ts.map