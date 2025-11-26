import { ref, reactive, type Ref } from 'vue';
import type { Comment } from './types';

/**
 * Position coordinates for floating comment
 */
export interface FloatingPosition {
  /** Top position in pixels */
  top: number;
  /** Left position in pixels */
  left: number;
  /** Right position in pixels */
  right: number;
  /** Bottom position in pixels */
  bottom: number;
}

/**
 * Parameters for initializing a floating comment
 */
export interface UseFloatingCommentParams extends Comment {
  /** The comment ID is required for floating comments */
  commentId: string;
}

/**
 * Return type of the useFloatingComment composable
 */
export interface UseFloatingCommentReturn {
  /** Unique identifier for the floating comment */
  id: string;
  /** Reference to the comment data */
  comment: Ref<UseFloatingCommentParams>;
  /** Reactive position coordinates */
  position: FloatingPosition;
  /** Offset value for positioning */
  offset: Ref<number>;
}

/**
 * Vue composable for managing floating comment state
 *
 * This composable provides reactive state management for floating comments,
 * including position tracking and offset calculations for proper positioning
 * in the document viewer.
 *
 * @param params - Floating comment initialization parameters
 * @returns Floating comment state and properties
 *
 * @example
 * const floatingComment = useFloatingComment({
 *   commentId: 'comment-123',
 *   commentText: 'This is a comment',
 *   // ... other comment properties
 * });
 *
 * floatingComment.position.top = 100;
 * floatingComment.offset.value = 20;
 */
export function useFloatingComment(params: UseFloatingCommentParams): UseFloatingCommentReturn {
  const id = params.commentId;
  const comment = ref(params);

  const position = reactive<FloatingPosition>({
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  });
  const offset = ref<number>(0);

  return {
    id,
    comment,
    position,
    offset,
  };
}
