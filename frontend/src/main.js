import { createApp } from 'vue';
import App from './App.vue';
import posthog from './posthog';

const app = createApp(App);

app.config.globalProperties.$posthog = posthog;
window.posthog = posthog;

app.mount('#app');