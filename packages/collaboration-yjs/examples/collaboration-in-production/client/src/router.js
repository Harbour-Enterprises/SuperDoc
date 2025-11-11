import { createRouter, createWebHistory } from 'vue-router';
import DocumentEditor from './DocumentEditor.vue';

const routes = [
  {
    path: '/doc/:documentId',
    name: 'Document',
    component: DocumentEditor
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
