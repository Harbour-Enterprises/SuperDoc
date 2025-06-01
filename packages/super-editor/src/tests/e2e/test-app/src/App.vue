<script setup>
import '@harbour-enterprises/super-editor/style.css';
import '@harbour-enterprises/common/styles/common-styles.css';
import { onMounted, shallowRef, ref } from 'vue';
import { Editor, getStarterExtensions } from '@harbour-enterprises/super-editor';
import paginationTestDocx from '@testData/pagination-blank.docx?url';
import paginationTestDocxWithHardBreak from '@testData/pagination-with-hard-break.docx?url';

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const getFileObject = async (fileUrl, name, type) => {
  const response = await fetch(fileUrl);
  const blob = await response.blob();
  return new File([blob], name, { type });
};

const editorDiv = ref(null);
const editor = shallowRef(null);

window.initTestApp = async (fileToLoad, options = {}) => {
  editorDiv.value.innerHTML = '';
  const fileObject = await getFileObject(fileToLoad, 'testdoc.docx', DOCX);
  const [docx, media, mediaFiles, fonts] = await Editor.loadXmlData(fileObject, true);

  editor.value = new Editor({
    element: document.getElementById('editor'),
    content: docx,
    media,
    mediaFiles,
    fonts,
    pagination: true,
    extensions: getStarterExtensions(),
    ...options,
  });
};

onMounted(() => {
  // Get the file to load from the query params
  const fileToLoad = window.location.search.split('=')[1];
  initTestApp(fileToLoad === 'hard-break' ? paginationTestDocxWithHardBreak : paginationTestDocx);
});
</script>

<template>
  <div id="editor" ref="editorDiv" class="super-editor">Initial content</div>
</template>

<style>
.super-editor {
  border: 1px solid black;
}
</style>
