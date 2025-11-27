<script setup lang="ts">
import { ref, shallowRef, onMounted, onBeforeUnmount } from 'vue';
import type { Editor as EditorType } from '@/index.js';
import { Editor } from '@/index.js';
import { getRichTextExtensions, Placeholder } from '@extensions/index.js';
import type { Transaction } from 'prosemirror-state';

interface Props {
  modelValue?: string;
  placeholder?: string;
  options?: Record<string, unknown>;
  users?: unknown[];
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
  (e: 'focus', payload: { editor: EditorType; transaction: Transaction }): void;
  (e: 'blur', payload: { editor: EditorType; transaction: Transaction }): void;
}

const emit = defineEmits<Emits>();
const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Type something...',
  options: () => ({}),
  users: () => [],
});

const editor = shallowRef<EditorType>();
const editorElem = ref<HTMLElement | null>(null);
const isFocused = ref(false);

const onTransaction = ({ editor, transaction }: { editor: EditorType; transaction: Transaction }): void => {
  const contents = editor.getHTML();
  emit('update:modelValue', contents);
};

const onFocus = ({ editor, transaction }: { editor: EditorType; transaction: Transaction }): void => {
  isFocused.value = true;
  updateUsersState();
  emit('focus', { editor, transaction });
};

const onBlur = ({ editor, transaction }: { editor: EditorType; transaction: Transaction }): void => {
  isFocused.value = false;
  emit('blur', { editor, transaction });
};

const initEditor = async (): Promise<void> => {
  Placeholder.options.placeholder = props.placeholder || 'Type something...';

  props.options.onTransaction = onTransaction;
  props.options.onFocus = onFocus;
  props.options.onBlur = onBlur;
  editor.value = new Editor({
    mode: 'text',
    content: document.getElementById('currentContent'),
    element: editorElem.value,
    extensions: getRichTextExtensions(),
    users: props.users,
    ...props.options,
  });
};

const handleFocus = (): void => {
  isFocused.value = true;
  editor.value?.view?.focus();
};

const updateUsersState = (): void => {
  editor.value?.setOptions({ users: props.users });
};

onMounted(() => {
  initEditor();
});

onBeforeUnmount(() => {
  editor.value?.destroy();
  editor.value = null;
});
</script>

<template>
  <div class="super-editor super-input" :class="{ 'super-input-active': isFocused }" @click.stop.prevent="handleFocus">
    <div id="currentContent" style="display: none" v-html="modelValue"></div>
    <div ref="editorElem" class="editor-element super-editor__element"></div>
  </div>
</template>

<style scoped>
.super-editor {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  border: 1px solid #999;
  outline: none;
  transition: border 0.2s ease;
  background-color: white;
}

.super-input {
  font-size: 13px;
  font-family: inherit;
}

.editor-element {
  height: 100%;
  width: 100%;
  border: none;
  outline: none;
}

.super-input-active {
  border: 1px solid #007bff;
  outline: none;
}
</style>
