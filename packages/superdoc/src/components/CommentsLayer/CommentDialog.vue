<script setup>
import { computed, toRefs, ref, getCurrentInstance, onMounted, nextTick } from 'vue';
import { NDropdown, NTooltip, NSelect } from 'naive-ui';
import { storeToRefs } from 'pinia';
import { useCommentsStore } from '@superdoc/stores/comments-store';
import { useSuperdocStore } from '@superdoc/stores/superdoc-store';
import { SuperInput } from '@harbour-enterprises/super-editor';
import { superdocIcons } from '@superdoc/icons.js';
import useSelection from '@superdoc/helpers/use-selection';
import useComment from '@superdoc/components/CommentsLayer/use-comment';
import Avatar from '@superdoc/components/general/Avatar.vue';
import InternalDropdown from './InternalDropdown.vue';
import CommentHeader from './CommentHeader.vue';
import CommentInput from './CommentInput.vue';

const emit = defineEmits(['click-outside', 'ready', 'dialog-exit']);
const props = defineProps({
  comment: {
    type: Object,
    required: true,
  },
  autoFocus: {
    type: Boolean,
    default: false,
  },
  parent: {
  type: Object,
    required: false,
  },
});

const { proxy } = getCurrentInstance();
const superdocStore = useSuperdocStore();
const commentsStore = useCommentsStore();

/* Comments store refs */
const { addComment, cancelComment, deleteComment, removePendingComment, } = commentsStore;
const {
  suppressInternalExternal,
  getConfig,
  activeComment,
  floatingCommentsOffset,
  pendingComment,
  currentCommentText,
} = storeToRefs(commentsStore);

const { activeZoom } = storeToRefs(superdocStore);

const isInternal = ref(true);
const isEditing = ref(false);
const isFocused = ref(false);
const commentInput = ref(null);
const commentDialogElement = ref(null);

const isActiveComment = computed(() => activeComment.value === props.comment.commentId);
const showButtons = computed(() => {
  return !getConfig.readOnly
    && isActiveComment.value
    && !props.comment.resolvedTime
    && !isEditing.value;
});

const showSeparator = computed(() => (index) => {
  if (showInputSection.value && index === comments.value.length - 1) return true;
  return comments.value.length > 1
    && index !== comments.value.length - 1
});

const showInputSection = computed(() => {
  return !getConfig.readOnly
    && isActiveComment.value
    && !props.comment.resolvedTime
    && !isEditing.value;
});

const comments = computed(() => {
  const parentComment = props.comment;
  return commentsStore.commentsList
    .filter((c) => {
      const isThreadedComment = c.parentCommentId === parentComment.commentId;
      const isThisComment = c.commentId === props.comment.commentId;
      return isThreadedComment || isThisComment;
    })
    .sort((a, b) => a.commentId === props.comment.commetnId && a.createdTime - b.createdTime);
});

const getCommentUser = computed(() => (comment) => {
  return {
    name: comment.creatorName,
    email: comment.creatorEmail,
  };
});

const allowResolve = computed(() => (comment) => {
  const isAllowOverride = getConfig.value.allowResolveOverride;
  if (isAllowOverride) return true;

  const allowedInConfig = getConfig.value.allowResolve;
  const isParentCommentUser = comment.creatorEmail === superdocStore.user.email;
  const isResolved = comment.resolvedTime;
  const isParentComment = !comment.parentCommentId;
  return allowedInConfig
    && (isParentCommentUser || !comment.creatorEmail)
    && isParentComment
    && !isResolved;
});

const isInternalDropdownDisabled = computed(() => {
  if (props.comment.resolvedTime) return true;
  return getConfig.value.readOnly;
});

const overflowOptions = [
  { label: 'Edit', key: 'edit' },
  { label: 'Delete', key: 'delete' },
];

const showOverflow = computed(() => (comment) => {
  if (!!props.comment.resolvedTime) return [];
  if (getConfig.value.readOnly) return [];

  // If this comment belongs to the current user, allow edit, delete
  if (comment.creatorEmail === superdocStore.user.email) {
    return overflowOptions;
  };

  // Allow no overflow if the comment does not belong to the current user
  return [];
});

const isEditingThisComment = computed(() => (comment) => {
  return isEditing.value === comment.commentId;
});

const shouldShowInternalExternal = computed(() => {
  if (!proxy.$superdoc.config.isInternal) return false;
  return !suppressInternalExternal.value;
});

const hasTextContent = computed(() => {
  return currentCommentText.value && currentCommentText.value !== "<p></p>";
});

const setFocus = () => {
  if (props.comment.resolvedTime) return;
  activeComment.value = props.comment.commentId;
  props.comment.setActive(proxy.$superdoc);
};

const handleClickOutside = (e) => {
  if (e.target.classList.contains('n-dropdown-option-body__label')) return;
  if (e.target.classList.contains('comment-highlight')) return;
  if (activeComment.value === props.comment.commentId) {
    floatingCommentsOffset.value = 0;
    emit('dialog-exit');
  };

  activeComment.value = null;
};

const handleAddComment = () => {
  const options = {
    documentId: props.comment.fileId,
    isInternal: pendingComment.value ? pendingComment.value.isInternal : isInternal.value,
    parentCommentId: pendingComment.value ? null : props.comment.commentId,
  };

  if (pendingComment.value) {
    const selection = pendingComment.value.selection.getValues();
    options.selection = selection;
  };

  const comment = commentsStore.getPendingComment(options);
  addComment({ superdoc: proxy.$superdoc, comment })
};

const handleResolve = () => {
  props.comment.resolveComment({
    email: superdocStore.user.email,
    name: superdocStore.user.name,
    superdoc: proxy.$superdoc,
  });

  nextTick(() => {
    commentsStore.lastUpdate = new Date();
    activeComment.value = null;
  });
};

const handleOverflowSelect = (value, comment) => {
  switch (value) {
    case 'edit':
      currentCommentText.value = comment.commentText;
      isEditing.value = comment.commentId;
      break;
    case 'delete':
      deleteComment({ superdoc: proxy.$superdoc, commentId: comment.commentId });
      break;
  };
};

const handleCommentUpdate = (comment) => {
  isEditing.value = null;
  comment.setText({ text: currentCommentText.value, superdoc: proxy.$superdoc });
  removePendingComment();
}

const handleInternalExternalSelect = (value) => {
  const isPendingComment = !!pendingComment.value;
  const isInternal = value.toLowerCase() === 'internal';

  if (!isPendingComment) props.comment.setIsInternal({ isInternal: isInternal, superdoc: proxy.$superdoc });
  else pendingComment.value.isInternal = isInternal;
};

const getSidebarCommentStyle = computed(() => {
  const style = {};


  const comment = props.comment;
  if (isActiveComment.value) {
    style.backgroundColor = 'white';
    style.zIndex = 10;
  }

  if (pendingComment.value && pendingComment.value.commentId === props.comment.commentId) {
    const top = Math.max(96, pendingComment.value.selection?.selectionBounds.top - 50);
    style.position = 'absolute';
    style.top = top + 'px';
  }

  return style;
});

onMounted(() => {
  if (props.autoFocus) {
    nextTick(() => setFocus());
  };
  emit('ready', { commentId: props.comment.commentId, elementRef: commentDialogElement });
})
</script>

<template>
  <div
    class="comments-dialog"
    :class="{ 'is-active': isActiveComment, 'is-resolved': props.comment.resolvedTime }"
    v-click-outside="handleClickOutside"
    @click.stop.prevent="setFocus"
    :style="getSidebarCommentStyle"
    ref="commentDialogElement"
  >

    <div v-if="shouldShowInternalExternal" class="existing-internal-input">
      <InternalDropdown
        class="internal-dropdown"
        :is-disabled="isInternalDropdownDisabled"
        :state="comment.isInternal ? 'internal' : 'external'"
        @select="handleInternalExternalSelect"
      />
    </div>

    <!-- Comments and their threaded (sub) comments are rendered here -->
    <div v-for="(comment, index) in comments" :key="index" class="conversation-item">
      <CommentHeader
        :user="getCommentUser(comment)"
        :config="getConfig"
        :timestamp="comment.createdTime"
        :allow-resolve="allowResolve(comment)"
        :overflow-options="showOverflow(comment)"
        @resolve="handleResolve"
        @overflow-select="handleOverflowSelect($event, comment)"
      />

      <!-- Show the comment text, unless we enter edit mode, then show an input and update buttons -->
      <div class="card-section comment-body">
        <div v-if="!isEditingThisComment(comment)" class="comment" v-html="comment.commentText"></div>
        <div v-else class="comment-editing">
          <CommentInput
            :user="superdocStore.user"
            :users="proxy.$superdoc.users"
            :config="getConfig"
            :include-header="false"
          />
          <div class="comment-footer">
            <button class="sd-button" @click.stop.prevent="cancelComment">Cancel</button>
            <button
              class="sd-button primary"
              @click.stop.prevent="handleCommentUpdate(comment)"
              >
                Update
              </button>
          </div>
        </div>
      </div>
      <div class="comment-separator" v-if="showSeparator(index)"></div>
    </div>
  
    <!-- This area is appended to a comment if adding a new sub comment -->
    <div v-if="showInputSection && !getConfig.readOnly">
      <CommentInput
        ref="commentInput"
        :user="superdocStore.user"
        :users="proxy.$superdoc.users"
        :config="getConfig"
      />

      <div class="comment-footer" v-if="showButtons && !getConfig.readOnly">
        <button class="sd-button" @click.stop.prevent="cancelComment">Cancel</button>
        <button
          class="sd-button primary"
          @click.stop.prevent="handleAddComment"
          :disabled="!hasTextContent"
          :class="{ disabled: !hasTextContent }">
            Comment
          </button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.change-type {
  font-style: italic;
  font-weight: 600;
}
.comment-separator {
  background-color: #dbdbdb;
  height: 1px;
  width: 100%;
  margin: 10px 0;
}
.existing-internal-input {
  margin-bottom: 10px;
}
.initial-internal-dropdown {
  margin-top: 10px;
}
.comments-dialog {
  display: flex;
  flex-direction: column;
  padding: 10px 15px;
  border-radius: 12px;
  background-color: #f3f6fd;
  transition: background-color 250ms ease;
  -webkit-box-shadow: 0px 4px 12px 0px rgba(50, 50, 50, 0.15);
  -moz-box-shadow: 0px 4px 12px 0px rgba(50, 50, 50, 0.15);
  box-shadow: 0px 4px 12px 0px rgba(50, 50, 50, 0.15);
  z-index: 5;
  max-width: 300px;
  min-width: 200px;
  width: 100%;
}
.is-active {
  z-index: 10;
}
.input-section {
  margin-top: 10px;
}
.sd-button {
  font-size: 12px;
  margin-left: 5px;
}
.comment {
  font-size: 13px;
  margin: 10px 0;
}
.is-resolved {
  background-color: #f0f0f0;
}
.comment-footer {
  margin: 5px 0 5px;
  display: flex;
  justify-content: flex-end;
  width: 100%;
}
.internal-dropdown {
  display: inline-block;
}

.comment-editing {
  padding-bottom: 10px;
}
.comment-editing button {
  margin-left: 5px;
}
.tracked-change {
  margin: 0;
}
</style>
