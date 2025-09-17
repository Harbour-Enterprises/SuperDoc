export function useFieldValueWatcher(field: any, originalValue: any): {
    value: any;
};
export function useField(field: any): {
    id: import("vue").Ref<any, any>;
    icon: import("vue").Ref<any, any>;
    iconPack: import("vue").Ref<any, any>;
    label: import("vue").Ref<any, any>;
    placeholder: any;
    fieldType: import("vue").Ref<any, any>;
    fieldSubType: import("vue").Ref<any, any>;
    value: any;
    format: import("vue").Ref<any, any>;
    logicRules: import("vue").Ref<any, any>;
    hidden: import("vue").Ref<boolean, boolean>;
    originalJSON: any;
    fieldStyle: {
        fontFamily: any;
        fontSize: any;
        originalFontSize: any;
    };
    valueGetter: any;
};
export function useImageField(field: any): {
    fontfamily: import("vue").Ref<any, any>;
    iteminputtype: import("vue").Ref<any, any>;
};
export function useSelectField(field: any): {
    options: import("vue").Ref<any, any>;
};
export function useCheckboxField(field: any): {
    options: import("vue").Ref<any, any>;
};
//# sourceMappingURL=use-field.d.ts.map