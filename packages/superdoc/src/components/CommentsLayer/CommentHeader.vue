<script setup>
import { formatDate } from './helpers';
import { superdocIcons } from '@superdoc/icons.js';
import { NDropdown } from 'naive-ui';
import { computed, getCurrentInstance } from 'vue';
import { isAllowed, PERMISSIONS } from '@superdoc/core/collaboration/permissions.js';
import { useCommentsStore } from '@superdoc/stores/comments-store';
import Avatar from '@superdoc/components/general/Avatar.vue';

const emit = defineEmits(['resolve', 'reject', 'overflow-select']);
const commentsStore = useCommentsStore();
const props = defineProps({
  user: {
    type: Object,
    required: true,
  },
  timestamp: {
    type: Number,
    required: false,
  },
  config: {
    type: Object,
    required: true,
  },
  overflowOptions: {
    type: Array,
    required: false,
  },
  comment: {
    type: Object,
    required: false,
  },
  isPendingInput: {
    type: Boolean,
    required: false,
    default: false,
  }
});

const { proxy } = getCurrentInstance();
const role = proxy.$superdoc.config.role;
const isInternal = proxy.$superdoc.config.isInternal;
const isOwnComment = props.comment.creatorEmail === proxy.$superdoc.config.user.email;

const generallyAllowed = computed(() => {
  if (!props.comment) return false;
  if (props.comment.resolvedTime) return false;
  if (commentsStore.pendingComment) return false;
  if (props.comment.parentCommentId) return false;
  if (props.isPendingInput) return false;
  return true;
});

const allowResolve = computed(() => {
  if (!generallyAllowed.value) return false;

  if (isOwnComment) return isAllowed(PERMISSIONS.RESOLVE_OWN, role, isInternal);
  else return isAllowed(PERMISSIONS.RESOLVE_OTHER, role, isInternal);
});

const allowReject = computed(() => {
  if (!generallyAllowed.value) return false;
  if (!props.comment.trackedChange) return false;

  if (isOwnComment) return isAllowed(PERMISSIONS.REJECT_OWN, role, isInternal);
  else return isAllowed(PERMISSIONS.REJECT_OTHER, role, isInternal);
});

const allowOverflow = computed(() => {
  if (!generallyAllowed.value) return false;
  if (props.comment.trackedChange) return false;
  if (!props.overflowOptions || !props.overflowOptions.length) return false;
  if (props.isPendingInput) return false;

  return true;
});

const handleResolve = () => emit('resolve');
const handleReject = () => emit('reject');
const handleSelect = (value) => emit('overflow-select', value);

</script>

<template>
  <div class="card-section comment-header">
    <div class="comment-header-left">
      <Avatar :user="props.user" class="avatar" />
      <div class="user-info">
        <div class="user-name">{{ props.user.name }}</div>
        <div class="user-timestamp" v-if="props.comment.createdTime">{{ formatDate(props.comment.createdTime) }}</div>
      </div>
    </div>

    <!-- Regular comments options -->
    <div class="overflow-menu">
      <div 
        v-if="allowResolve"
        class="overflow-menu__icon" 
        v-html="superdocIcons.markDone"
        @click.stop.prevent="handleResolve">
      </div>

      <div 
        v-if="allowReject"
        class="overflow-menu__icon" 
        v-html="superdocIcons.rejectChange"
        @click.stop.prevent="handleReject">
      </div>

      <n-dropdown
        v-if="allowOverflow"
        trigger="click"
        :options="overflowOptions"
        @select="handleSelect"
      >
        <div class="overflow-menu__icon" @click.stop.prevent>
          <div class="overflow-icon" v-html="superdocIcons.overflow"></div>
        </div>
      </n-dropdown>
    </div>
  </div>
</template>

<style scoped>
.comment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.comment-header-left {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.avatar {
  margin-right: 10px;
}
.user-info {
  display: flex;
  flex-direction: column;
  font-size: 12px;
}
.user-name {
  font-weight: 600;
  line-height: 1.2em;
}
.user-timestamp {
  line-height: 1.2em;
  font-size: 12px;
  color: #999;
}
.overflow-menu {
  flex-shrink: 1;
  display: flex;
  gap: 6px;
}
.overflow-menu__icon {
  box-sizing: content-box;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  padding: 3px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 250ms ease;
}
.overflow-menu__icon:hover {
  background-color: #DBDBDB;
}
.overflow-menu__icon :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
  fill: currentColor;
}
.overflow-icon {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  width: 10px;
  height: 16px;
}

</style>