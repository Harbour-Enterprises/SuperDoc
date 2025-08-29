export default function useDocument(params: any, superdocConfig: any): {
    id: any;
    data: any;
    html: any;
    markdown: any;
    type: string;
    config: any;
    state: any;
    role: any;
    core: import("vue").Ref<any, any>;
    ydoc: import("vue").ShallowRef<any, any>;
    provider: import("vue").ShallowRef<any, any>;
    socket: import("vue").ShallowRef<any, any>;
    isNewFile: import("vue").Ref<any, any>;
    container: import("vue").Ref<any, any>;
    pageContainers: import("vue").Ref<any[], any[]>;
    isReady: import("vue").Ref<boolean, boolean>;
    rulers: import("vue").Ref<any, any>;
    rawFields: import("vue").Ref<any, any>;
    fields: import("vue").Ref<any, any>;
    annotations: import("vue").Ref<any, any>;
    conversations: import("vue").Ref<any, any>;
    setEditor: (ref: any) => any;
    getEditor: () => any;
    removeComments: () => void;
    restoreComments: () => void;
    removeConversation: (conversationId: any) => void;
};
//# sourceMappingURL=use-document.d.ts.map