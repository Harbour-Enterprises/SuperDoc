export const useCommentsStore: import("pinia").StoreDefinition<"comments", Pick<{
    COMMENT_EVENTS: Readonly<{
        RESOLVED: "resolved";
        NEW: "new";
        ADD: "add";
        UPDATE: "update";
        DELETED: "deleted";
        PENDING: "pending";
        SELECTED: "selected";
        COMMENTS_LIST: "comments-list";
        CHANGE_ACCEPTED: "change-accepted";
        CHANGE_REJECTED: "change-rejected";
    }>;
    isDebugging: boolean;
    hasInitializedComments: import("vue").Ref<boolean, boolean>;
    hasSyncedCollaborationComments: import("vue").Ref<boolean, boolean>;
    editingCommentId: import("vue").Ref<any, any>;
    activeComment: import("vue").Ref<any, any>;
    commentDialogs: import("vue").Ref<any[], any[]>;
    overlappingComments: import("vue").Ref<any[], any[]>;
    overlappedIds: Set<any>;
    suppressInternalExternal: import("vue").Ref<boolean, boolean>;
    pendingComment: import("vue").Ref<any, any>;
    currentCommentText: import("vue").Ref<string, string>;
    commentsList: import("vue").Ref<any[], any[]>;
    isCommentsListVisible: import("vue").Ref<boolean, boolean>;
    generalCommentIds: import("vue").Ref<any[], any[]>;
    editorCommentIds: import("vue").Ref<any[], any[]>;
    commentsParentElement: import("vue").Ref<any, any>;
    editorCommentPositions: import("vue").Ref<{}, {}>;
    hasInitializedLocations: import("vue").Ref<boolean, boolean>;
    floatingCommentsOffset: import("vue").Ref<number, number>;
    sortedConversations: import("vue").Ref<any[], any[]>;
    visibleConversations: import("vue").Ref<any[], any[]>;
    skipSelectionUpdate: import("vue").Ref<boolean, boolean>;
    isFloatingCommentsReady: import("vue").Ref<boolean, boolean>;
    getConfig: import("vue").ComputedRef<{
        name: string;
        readOnly: boolean;
        allowResolve: boolean;
        showResolved: boolean;
    }>;
    documentsWithConverations: import("vue").ComputedRef<any>;
    getGroupedComments: import("vue").ComputedRef<{
        parentComments: any[];
        resolvedComments: any[];
    }>;
    getFloatingComments: import("vue").ComputedRef<any[]>;
    init: (config?: any) => void;
    getComment: (id: string) => any;
    setActiveComment: (superdoc: any, id: string | undefined | null) => void;
    getCommentLocation: (selection: any, parent: any) => {
        top: any;
        left: any;
    };
    hasOverlapId: (id: any) => any;
    getPendingComment: ({ selection, documentId, parentCommentId, ...options }: {
        selection: any;
        documentId: string;
        parentCommentId: string;
    }) => any;
    showAddComment: (superdoc: any) => void;
    addComment: ({ superdoc, comment }: {
        superdoc: any;
    }) => void;
    cancelComment: (superdoc: any) => void;
    deleteComment: ({ commentId: commentIdToDelete, superdoc }: {
        commentId: any;
        superdoc: any;
    }) => void;
    removePendingComment: (superdoc: any) => void;
    processLoadedDocxComments: ({ superdoc, editor, comments, documentId }: {
        comments: any[];
        documentId: string;
    }) => void;
    translateCommentsForExport: () => any[];
    handleEditorLocationsUpdate: (allCommentPositions: any) => void;
    handleTrackedChangeUpdate: ({ superdoc, params }: {
        superdoc: any;
        params: any;
    }) => void;
}, "COMMENT_EVENTS" | "isDebugging" | "hasInitializedComments" | "hasSyncedCollaborationComments" | "editingCommentId" | "activeComment" | "commentDialogs" | "overlappingComments" | "overlappedIds" | "suppressInternalExternal" | "pendingComment" | "currentCommentText" | "commentsList" | "isCommentsListVisible" | "generalCommentIds" | "editorCommentIds" | "commentsParentElement" | "editorCommentPositions" | "hasInitializedLocations" | "floatingCommentsOffset" | "sortedConversations" | "visibleConversations" | "skipSelectionUpdate" | "isFloatingCommentsReady">, Pick<{
    COMMENT_EVENTS: Readonly<{
        RESOLVED: "resolved";
        NEW: "new";
        ADD: "add";
        UPDATE: "update";
        DELETED: "deleted";
        PENDING: "pending";
        SELECTED: "selected";
        COMMENTS_LIST: "comments-list";
        CHANGE_ACCEPTED: "change-accepted";
        CHANGE_REJECTED: "change-rejected";
    }>;
    isDebugging: boolean;
    hasInitializedComments: import("vue").Ref<boolean, boolean>;
    hasSyncedCollaborationComments: import("vue").Ref<boolean, boolean>;
    editingCommentId: import("vue").Ref<any, any>;
    activeComment: import("vue").Ref<any, any>;
    commentDialogs: import("vue").Ref<any[], any[]>;
    overlappingComments: import("vue").Ref<any[], any[]>;
    overlappedIds: Set<any>;
    suppressInternalExternal: import("vue").Ref<boolean, boolean>;
    pendingComment: import("vue").Ref<any, any>;
    currentCommentText: import("vue").Ref<string, string>;
    commentsList: import("vue").Ref<any[], any[]>;
    isCommentsListVisible: import("vue").Ref<boolean, boolean>;
    generalCommentIds: import("vue").Ref<any[], any[]>;
    editorCommentIds: import("vue").Ref<any[], any[]>;
    commentsParentElement: import("vue").Ref<any, any>;
    editorCommentPositions: import("vue").Ref<{}, {}>;
    hasInitializedLocations: import("vue").Ref<boolean, boolean>;
    floatingCommentsOffset: import("vue").Ref<number, number>;
    sortedConversations: import("vue").Ref<any[], any[]>;
    visibleConversations: import("vue").Ref<any[], any[]>;
    skipSelectionUpdate: import("vue").Ref<boolean, boolean>;
    isFloatingCommentsReady: import("vue").Ref<boolean, boolean>;
    getConfig: import("vue").ComputedRef<{
        name: string;
        readOnly: boolean;
        allowResolve: boolean;
        showResolved: boolean;
    }>;
    documentsWithConverations: import("vue").ComputedRef<any>;
    getGroupedComments: import("vue").ComputedRef<{
        parentComments: any[];
        resolvedComments: any[];
    }>;
    getFloatingComments: import("vue").ComputedRef<any[]>;
    init: (config?: any) => void;
    getComment: (id: string) => any;
    setActiveComment: (superdoc: any, id: string | undefined | null) => void;
    getCommentLocation: (selection: any, parent: any) => {
        top: any;
        left: any;
    };
    hasOverlapId: (id: any) => any;
    getPendingComment: ({ selection, documentId, parentCommentId, ...options }: {
        selection: any;
        documentId: string;
        parentCommentId: string;
    }) => any;
    showAddComment: (superdoc: any) => void;
    addComment: ({ superdoc, comment }: {
        superdoc: any;
    }) => void;
    cancelComment: (superdoc: any) => void;
    deleteComment: ({ commentId: commentIdToDelete, superdoc }: {
        commentId: any;
        superdoc: any;
    }) => void;
    removePendingComment: (superdoc: any) => void;
    processLoadedDocxComments: ({ superdoc, editor, comments, documentId }: {
        comments: any[];
        documentId: string;
    }) => void;
    translateCommentsForExport: () => any[];
    handleEditorLocationsUpdate: (allCommentPositions: any) => void;
    handleTrackedChangeUpdate: ({ superdoc, params }: {
        superdoc: any;
        params: any;
    }) => void;
}, "getConfig" | "documentsWithConverations" | "getGroupedComments" | "getFloatingComments">, Pick<{
    COMMENT_EVENTS: Readonly<{
        RESOLVED: "resolved";
        NEW: "new";
        ADD: "add";
        UPDATE: "update";
        DELETED: "deleted";
        PENDING: "pending";
        SELECTED: "selected";
        COMMENTS_LIST: "comments-list";
        CHANGE_ACCEPTED: "change-accepted";
        CHANGE_REJECTED: "change-rejected";
    }>;
    isDebugging: boolean;
    hasInitializedComments: import("vue").Ref<boolean, boolean>;
    hasSyncedCollaborationComments: import("vue").Ref<boolean, boolean>;
    editingCommentId: import("vue").Ref<any, any>;
    activeComment: import("vue").Ref<any, any>;
    commentDialogs: import("vue").Ref<any[], any[]>;
    overlappingComments: import("vue").Ref<any[], any[]>;
    overlappedIds: Set<any>;
    suppressInternalExternal: import("vue").Ref<boolean, boolean>;
    pendingComment: import("vue").Ref<any, any>;
    currentCommentText: import("vue").Ref<string, string>;
    commentsList: import("vue").Ref<any[], any[]>;
    isCommentsListVisible: import("vue").Ref<boolean, boolean>;
    generalCommentIds: import("vue").Ref<any[], any[]>;
    editorCommentIds: import("vue").Ref<any[], any[]>;
    commentsParentElement: import("vue").Ref<any, any>;
    editorCommentPositions: import("vue").Ref<{}, {}>;
    hasInitializedLocations: import("vue").Ref<boolean, boolean>;
    floatingCommentsOffset: import("vue").Ref<number, number>;
    sortedConversations: import("vue").Ref<any[], any[]>;
    visibleConversations: import("vue").Ref<any[], any[]>;
    skipSelectionUpdate: import("vue").Ref<boolean, boolean>;
    isFloatingCommentsReady: import("vue").Ref<boolean, boolean>;
    getConfig: import("vue").ComputedRef<{
        name: string;
        readOnly: boolean;
        allowResolve: boolean;
        showResolved: boolean;
    }>;
    documentsWithConverations: import("vue").ComputedRef<any>;
    getGroupedComments: import("vue").ComputedRef<{
        parentComments: any[];
        resolvedComments: any[];
    }>;
    getFloatingComments: import("vue").ComputedRef<any[]>;
    init: (config?: any) => void;
    getComment: (id: string) => any;
    setActiveComment: (superdoc: any, id: string | undefined | null) => void;
    getCommentLocation: (selection: any, parent: any) => {
        top: any;
        left: any;
    };
    hasOverlapId: (id: any) => any;
    getPendingComment: ({ selection, documentId, parentCommentId, ...options }: {
        selection: any;
        documentId: string;
        parentCommentId: string;
    }) => any;
    showAddComment: (superdoc: any) => void;
    addComment: ({ superdoc, comment }: {
        superdoc: any;
    }) => void;
    cancelComment: (superdoc: any) => void;
    deleteComment: ({ commentId: commentIdToDelete, superdoc }: {
        commentId: any;
        superdoc: any;
    }) => void;
    removePendingComment: (superdoc: any) => void;
    processLoadedDocxComments: ({ superdoc, editor, comments, documentId }: {
        comments: any[];
        documentId: string;
    }) => void;
    translateCommentsForExport: () => any[];
    handleEditorLocationsUpdate: (allCommentPositions: any) => void;
    handleTrackedChangeUpdate: ({ superdoc, params }: {
        superdoc: any;
        params: any;
    }) => void;
}, "setActiveComment" | "init" | "getComment" | "getCommentLocation" | "hasOverlapId" | "getPendingComment" | "showAddComment" | "addComment" | "cancelComment" | "deleteComment" | "removePendingComment" | "processLoadedDocxComments" | "translateCommentsForExport" | "handleEditorLocationsUpdate" | "handleTrackedChangeUpdate">>;
//# sourceMappingURL=comments-store.d.ts.map