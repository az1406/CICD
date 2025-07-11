<template>
  <h1>{{ message }}</h1>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const message = ref('Loading...');

onMounted(async () => {
  try {
    // Use absolute URL for local Docker Compose setup
    const res = await fetch('/api/message');
    const data = await res.json();
    message.value = data.message;
  } catch (e) {
    message.value = 'Failed to load message.';
  }
});
</script>

<style>
h1 {
  color: #42b983;
  text-align: center;
  margin-top: 2rem;
}
</style>
