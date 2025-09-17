export default function useConversation(params: any): {
    getValues: () => any;
    markDone: (email: any, name: any) => void;
    conversationId: any;
    thread: import("vue").Ref<any, any>;
    documentId: any;
    creatorEmail: any;
    creatorName: any;
    comments: import("vue").Ref<any, any>;
    selection: any;
    markedDone: import("vue").Ref<any, any>;
    markedDoneByEmail: import("vue").Ref<any, any>;
    markedDoneByName: import("vue").Ref<any, any>;
    isFocused: import("vue").Ref<any, any>;
    group: import("vue").Ref<any, any>;
    conversationElement: import("vue").Ref<any, any>;
    suppressHighlight: import("vue").Ref<any, any>;
    suppressClick: import("vue").Ref<any, any>;
    isInternal: import("vue").Ref<any, any>;
    isTrackedChange: import("vue").Ref<any, any>;
    trackedChange: any;
};
//# sourceMappingURL=use-conversation.d.ts.map