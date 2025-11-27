import { createRouter, createWebHistory } from 'vue-router';
import DocumentEditor from './DocumentEditor.vue';
import Health from './Health.vue';

const routes = [
  {
    path: '/',
    redirect: '/random'
  },
  {
    path: '/doc/:documentId',
    name: 'Document',
    component: DocumentEditor,
    beforeEnter: (to) => {
      // Redirect if trying to access default document directly
      if (to.params.documentId === 'default') {
        return '/random';
      }
    }
  },
  {
    path: '/random',
    redirect: () => {
      const randomId = Math.random().toString(36).substring(2, 15);
      return `/doc/${randomId}`;
    }
  },
  {
    path: '/health',
    name: 'Health',
    component: Health
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
