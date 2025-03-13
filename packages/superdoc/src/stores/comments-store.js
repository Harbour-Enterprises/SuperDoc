import { defineStore } from 'pinia';
import { ref, reactive, computed, unref } from 'vue';
import { comments_module_events } from '@harbour-enterprises/common';
import { useSuperdocStore } from '@superdoc/stores/superdoc-store';
import { syncCommentsToClients } from '../core/collaboration/helpers.js';
import { Editor, } from '@harbour-enterprises/super-editor';
import { getRichTextExtensions } from '@harbour-enterprises/super-editor';
import useComment from '@superdoc/components/CommentsLayer/use-comment';

export const useCommentsStore = defineStore('comments', () => {
  const superdocStore = useSuperdocStore();
  const commentsConfig = reactive({
    name: 'comments',
    readOnly: false,
    allowResolve: true,
    showResolved: false,
  });

  const COMMENT_EVENTS = comments_module_events;
  const hasInitializedComments = ref(false);
  const hasSyncedCollaborationComments = ref(false);
  const commentsParentElement = ref(null);
  const activeComment = ref(null);
  const commentDialogs = ref([]);
  const overlappingComments = ref([]);
  const overlappedIds = new Set([]);
  const suppressInternalExternal = ref(true);
  const currentCommentText = ref('');
  const commentsList = ref([]);
  const isCommentsListVisible = ref(false);
  const lastChange = ref(Date.now());
  const editorCommentIds = ref([]);

  // Floating comments
  const floatingCommentsOffset = ref(0);
  const sortedConversations = ref([]);
  const visibleConversations = ref([]);
  const skipSelectionUpdate = ref(false);
  const isFloatingCommentsReady = ref(false);
  const generalCommentIds = ref([]);

  const pendingComment = ref(null);

  /**
   * Initialize the store
   * 
   * @param {Object} config The comments module config from SuperDoc
   * @returns {void}
   */
  const init = (config = {}) => {
    const updatedConfig = {...commentsConfig, ...config};
    Object.assign(commentsConfig, updatedConfig);
  
    suppressInternalExternal.value = commentsConfig.suppressInternalExternal || false;

    // Map initial comments state
    if (config.comments && config.comments.length) {
      commentsList.value = config.comments?.map((c) => useComment(c)) || [];
    };
  };

  /**
   * Get a comment by either ID or imported ID
   * 
   * @param {string} id The comment ID
   * @returns {Object} The comment object
   */
  const getComment = (id) => {
    if (id === undefined || id === null) return null;
    return commentsList.value.find((c) => c.commentId == id || c.importedId == id);
  };

  /**
   * Set the active comment or clear all active comments
   * 
   * @param {string | undefined | null} id The comment ID
   * @returns {void}
   */
  const setActiveComment = (id) => {
    // If no ID, we clear any focused comments
    if (id === undefined || id === null) {
      return activeComment.value = null;
    };

    const comment = getComment(id);
    if (comment) activeComment.value = comment.commentId;
  };

  /**
   * Called when a tracked change is updated. Creates a new comment if necessary, 
   * or updates an existing tracked-change comment.
   * 
   * @param {Object} param0 
   * @param {Object} param0.superdoc The SuperDoc instance
   * @param {Object} param0.params The tracked change params
   * @returns {void}
   */
  const handleTrackedChangeUpdate = ({ superdoc, params }) => {
    const { changeId, trackedChangeText, trackedChangeType, deletedText } = params;

    const existingTrackedChange = commentsList.value.find((comment) => comment.commentId === changeId)
    if (!existingTrackedChange) {
      const comment = getPendingComment({
        documentId: 'test',
        commentId: changeId,
        trackedChange: true,
        trackedChangeText,
        trackedChangeType,
        deletedText,
      });

      addComment({ superdoc, comment });
    } else {
      existingTrackedChange.trackedChangeText = trackedChangeText;
      existingTrackedChange.trackedChangeType = trackedChangeType;
    }

    syncCommentsToClients(superdoc);
  };

  const showAddComment = (superdoc) => {    
    superdoc.emit('comments-update', { type: COMMENT_EVENTS.PENDING });

    const selection = { ...superdocStore.activeSelection };
    selection.selectionBounds = { ...selection.selectionBounds };

    if (superdocStore.selectionPosition?.source) {
      superdocStore.selectionPosition.source = null;
    };

    pendingComment.value = getPendingComment({ selection, documentId: selection.documentId, parentCommentId: null });
    if (!superdoc.config.isInternal) pendingComment.value.isInternal = false;

    if (superdoc.activeEditor?.commands) {
      superdoc.activeEditor.commands.insertComment({ ...pendingComment.value.getValues(), commentId: 'pending' });
    };
  
    if (pendingComment.value.selection.source === 'super-editor' && superdocStore.selectionPosition) {
      superdocStore.selectionPosition.source = 'super-editor';
    }

    activeComment.value = pendingComment.value.commentID;
  };

  /**
   * Generate the comments list separating resolved and active
   * We only return parent comments here, since CommentDialog.vue will handle threaded comments
  */
  const getGroupedComments = computed(() => {
    const parentComments = [];
    const resolvedComments = [];
    const childCommentMap = new Map();
  
    commentsList.value.forEach((comment) => {
      // Track resolved comments
      if (comment.resolvedTime) {
        resolvedComments.push(comment);
      }
  
      // Track parent comments
      else if (!comment.parentCommentId && !comment.resolvedTime) {
        parentComments.push({ ...comment });
      }
  
      // Track child comments (threaded comments)
      else if (comment.parentCommentId) {
        if (!childCommentMap.has(comment.parentCommentId)) {
          childCommentMap.set(comment.parentCommentId, []);
        }
        childCommentMap.get(comment.parentCommentId).push(comment);
      }
    });
  
    // Return only parent comments
    const sortedParentComments = parentComments.sort((a, b) => a.createdTime - b.createdTime);
    const sortedResolvedComments = resolvedComments.sort((a, b) => a.createdTime - b.createdTime);
  
    return {
      parentComments: sortedParentComments,
      resolvedComments: sortedResolvedComments,
    };
  });

  const hasOverlapId = (id) => overlappedIds.includes(id);
  const documentsWithConverations = computed(() => {
    return superdocStore.documents;
  });

  const getConfig = computed(() => {
    return commentsConfig;
  });

  const getCommentLocation = (selection, parent) => {
    const containerBounds = selection.getContainerLocation(parent);
    const top = containerBounds.top + selection.selectionBounds.top;
    const left = containerBounds.left + selection.selectionBounds.left;
    return {
      top: top,
      left: left,
    };
  };

  const updateLastChange = () => {
    setTimeout(() => {
      lastChange.value = Date.now();
    }, 50);
  };

  const initialCheck = () => {
    const currentDialogs = document.querySelectorAll('.comment-box');
    currentDialogs.forEach((d) => {
      const conversationObject = getAllConversations.value.find((conversation) => {
        return conversation.conversationId === d.dataset.id;
      });
      if (!conversationObject) return;
      checkOverlaps(d, conversationObject);
    });
  };

  const checkOverlaps = (currentElement, dialog, doc) => {
    const currentDialogs = document.querySelectorAll('.comment-box');
    const currentBounds = currentElement.getBoundingClientRect();

    const overlaps = [];
    currentDialogs.forEach((d) => {
      if (d.dataset.id === dialog.conversationId) return;
      const bounds = d.getBoundingClientRect();

      if (Math.abs(bounds.top - currentBounds.top) < 50 || Math.abs(bounds.bottom - currentBounds.bottom) < 50) {
        if (!d.dataset?.id) {
          // Then this is a group
          const groupIndex = d.dataset.index;
          const group = overlappingComments.value[groupIndex];
          group?.unshift(dialog);
        } else {
          let dialogObject = dialog.doc?.conversations?.find((c) => c.conversationId === d.dataset.id);
          if (!dialogObject) dialogObject = doc.conversations.find((c) => c.conversationId === d.dataset.id);
          overlaps.unshift(dialogObject);
          overlaps.unshift(dialog);
          dialogObject.group = true;
        }
        dialog.group = true;
      }
    });
    if (overlaps.length) {
      const overlapsGroup = overlappingComments.value.find((group) => {
        return group.some((c) => c.conversationId === dialog.conversationId);
      });

      if (overlapsGroup) {
        const filtered = overlaps.filter((o) => !overlapsGroup.some((o) => o.conversationId === o.conversationId));
        overlapsGroup.push(...filtered);
      } else {
        overlappingComments.value.unshift(overlaps);
      }
    }
  };

  /**
   * Get a new pending comment
   * 
   * @param {Object} param0 
   * @param {Object} param0.selection The selection object
   * @param {String} param0.documentId The document ID
   * @param {String} param0.parentCommentId The parent comment
   * @returns {Object} The new comment object
   */
  const getPendingComment = ({ selection, documentId, parentCommentId, ...options }) => {
    return _getNewcomment({ selection, documentId, parentCommentId, ...options });
  };

  /**
   * Get the new comment object
   * 
   * @param {Object} param0 
   * @param {Object} param0.selection The selection object
   * @param {String} param0.documentId The document ID
   * @param {String} param0.parentCommentId The parent comment ID
   * @returns {Object} The new comment object
   */
  const _getNewcomment = ({ selection, documentId, parentCommentId, ...options }) => {
    let activeDocument;
    if (documentId) activeDocument = superdocStore.getDocument(documentId);
    else if (selection) activeDocument = superdocStore.getDocument(selection.documentId);

    return useComment({
      ...options,
      fileId: activeDocument.id,
      fileType: activeDocument.type,
      parentCommentId,
      creatorEmail: superdocStore.user.email,
      creatorName: superdocStore.user.name,
      commentText: currentCommentText.value,
      selection,
   });
  };

  /**
   * Remove the pending comment
   * 
   * @returns {void}
   */
  const removePendingComment = (superdoc) => {
    currentCommentText.value = '';
    pendingComment.value = null;
    activeComment.value = null;
    superdocStore.selectionPosition = null;

    superdoc.activeEditor?.commands.removeComment({ commentId: 'pending' });
  };

  /**
   * Add a new comment to the document
   * 
   * @param {Object} param0 
   * @param {Object} param0.superdoc The SuperDoc instance
   * @returns {void}
   */
  const addComment = ({ superdoc, comment }) => {    
    let parentComment = commentsList.value.find((c) => c.commentId === activeComment.value);
    if (!parentComment) parentComment = comment;

    const newComment = useComment(comment.getValues());
    newComment.setText({ text: currentCommentText.value, suppressUpdate: true });
    newComment.selection.source = pendingComment.value?.selection?.source;

    // Set isInternal flag
    if (parentComment) {
      const isParentInternal = parentComment.isInternal;
      newComment.isInternal = isParentInternal;
    }

    // If the current user is not internal, set the comment to external
    if (!superdoc.config.isInternal) newComment.isInternal = false;

    // Add the new comments to our global list
    commentsList.value.push(newComment);

    // If this is not a tracked change, and it belongs to a Super Editor, and its not a child comment
    // We need to let the editor know about the new comment
    if (!comment.trackedChange && superdoc.activeEditor?.commands && !comment.parentCommentId) {
      // Add the comment to the active editor
      superdoc.activeEditor.commands.insertComment(newComment.getValues());
    };

    // If collaboration is enabled, sync the comments to all clients
    syncCommentsToClients(superdoc);

    // Clean up the pending comment
    removePendingComment(superdoc);

    // Emit event for end users
    superdoc.emit('comments-update', { type: COMMENT_EVENTS.ADD, comment: newComment.getValues() });

  };

  const deleteComment = ({ commentId: commentIdToDelete, superdoc }) => {
    const commentIndex = commentsList.value.findIndex((c) => c.commentId === commentIdToDelete);
    const comment = commentsList.value[commentIndex];
    const { commentId, importedId } = comment;
    const { fileId } = comment;

    superdoc.activeEditor?.commands?.removeComment({ commentId, importedId });

    commentsList.value.splice(commentIndex, 1);

    const emitData = {
      type: COMMENT_EVENTS.DELETED,
      comment: comment.getValues(),
      changes: [{ key: 'deleted', commentId, fileId }],
    };
    superdoc.emit('comments-update', emitData);
    syncCommentsToClients(superdoc);
  }

  /**
   * Cancel the pending comment
   * 
   * @returns {void}
   */
  const cancelComment = (superdoc) => {
    removePendingComment(superdoc);
  }

  /**
   * Initialize loaded comments into SuperDoc by mapping the imported 
   * comment data to SuperDoc useComment objects.
   * 
   * Updates the commentsList ref with the new comments.
   * 
   * @param {Object} param0 
   * @param {Array} param0.comments The comments to be loaded
   * @param {String} param0.documentId The document ID
   * @returns {void}
   */
  const processLoadedDocxComments = ({ comments, documentId }) => {
    const document = superdocStore.getDocument(documentId);

    comments.forEach((comment) => {
      const importedName = `${comment.creatorName.replace('(imported)', '')} (imported)`
      const newComment = useComment({
        fileId: documentId,
        fileType: document.type,
        importedId: comment.importedId ? Number(comment.importedId): null,
        commentId: comment.id,
        parentCommentId: comment.parentCommentId,
        creatorEmail: comment.creatorEmail,
        creatorName: importedName,
        commentText: getHTmlFromComment(comment.textJson),
        resolvedTime: comment.isDone ? Date.now() : null,
        resolvedByEmail: comment.isDone ? comment.creatorEmail : null,
        resolvedByName: comment.isDone ? importedName : null,
      });
      commentsList.value.push(newComment);
    });

    updateLastChange();
  }

  const prepareCommentsForExport = () => {
    const processedComments = []
    commentsList.value.forEach((comment) => {
      const values = comment.getValues();
      const richText = values.commentText;
      const schema = convertHtmlToSchema(richText);
      processedComments.push({
        ...values,
        commentJSON: schema,
      });
    });
    return processedComments;
  };

  const convertHtmlToSchema = (commentHTML) => {
    const div = document.createElement('div');
    div.innerHTML = commentHTML;
    const editor = new Editor({
      mode: 'text',
      isHeadless: true,
      content: div,
      extensions: getRichTextExtensions(),
    });
    return editor.getJSON().content[0];
  };

  /**
   * Triggered when the editor locations are updated
   * Updates floating comment locations from the editor
   * 
   * @param {DOMElement} parentElement The parent element of the editor
   * @returns {void}
   */
  const handleEditorLocationsUpdate = (parentElement, allCommentIds = []) => {
    editorCommentIds.value = allCommentIds;
    commentsParentElement.value = parentElement;

    // Track comment IDs that we do not find in the editor
    // These will remain as 'general' comments
    generalCommentIds.value = commentsList.value
      .filter((c) => {
        const isSuperEditor = c.selection.source === 'super-editor';
        const noCommentInEditor = !allCommentIds.includes(c.commentId || c.importedId);
        return isSuperEditor && noCommentInEditor && !c.trackedChange;
      })
      .map((c) => c.commentId || c.importedId);

    setTimeout(() => {
      const allCommentElements = document.querySelectorAll('[data-thread-id]');
      const trackedChanges = document.querySelectorAll('.track-delete, .track-insert');
      trackedChanges.forEach((change) => {
        const threadId = change.dataset.id;
        const comment = getComment(threadId);
        const coords = change.getBoundingClientRect();
        if (comment) {
          comment.updatePosition(coords, parentElement);
        };
      })

      allCommentElements.forEach((commentElement) => {
        const threadId = commentElement.dataset.threadId;
        const comment = getComment(threadId);
        const coords = commentElement.getBoundingClientRect();
        if (comment) {
          comment.updatePosition(coords, parentElement);
        }
      });

      updateLastChange();
      isFloatingCommentsReady.value = true;
    }, 50)
  };

  /**
   * Get HTML content from the comment text JSON (which uses DOCX schema)
   * 
   * @param {Object} commentTextJson The comment text JSON
   * @returns {string} The HTML content
   */
  const getHTmlFromComment = (commentTextJson) => {
    const editor = new Editor({
      mode: 'text',
      isHeadless: true,
      content: commentTextJson,
      loadFromSchema: true,
      extensions: getRichTextExtensions(),
    });
    return editor.getHTML();
  };

  return {
    COMMENT_EVENTS,
    hasInitializedComments,
    hasSyncedCollaborationComments,
    activeComment,
    commentDialogs,
    overlappingComments,
    overlappedIds,
    suppressInternalExternal,
    pendingComment,
    currentCommentText,
    commentsList,
    isCommentsListVisible,
    lastChange,
    generalCommentIds,
    editorCommentIds,
    commentsParentElement,

    // Floating comments
    floatingCommentsOffset,
    sortedConversations,
    visibleConversations,
    skipSelectionUpdate,
    isFloatingCommentsReady,

    // Getters
    getConfig,
    documentsWithConverations,
    getAllConversations,
    getAllConversationsFiltered,
    getAllGroups,
    getGroupedComments,

    // Actions
    init,
    getComment,
    setActiveComment,
    getCommentLocation,
    hasOverlapId,
    checkOverlaps,
    initialCheck,
    getPendingComment,
    showAddComment,
    addComment,
    cancelComment,
    deleteComment,
    removePendingComment,
    processLoadedDocxComments,
    prepareCommentsForExport,
    handleEditorLocationsUpdate,
    handleTrackedChangeUpdate,
    updateLastChange,
  };
});
