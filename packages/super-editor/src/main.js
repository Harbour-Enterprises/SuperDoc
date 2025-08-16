import './dev/style.css';
import { createApp } from 'vue';
import { vClickOutside } from '@harbour-enterprises/common';
import Playground from './dev/components/Playground.vue';

const app = createApp(Playground);
app.directive('click-outside', vClickOutside);
app.mount('#app');
