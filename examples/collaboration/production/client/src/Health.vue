<template>
  <div class="health-container">
    <h1>Server Health Status</h1>
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="error">
      <h2>Error</h2>
      <pre>{{ error }}</pre>
    </div>
    <div v-else class="health-data">
      <pre>{{ JSON.stringify(healthData, null, 2) }}</pre>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Health',
  data() {
    return {
      healthData: null,
      loading: true,
      error: null
    };
  },
  async created() {
    await this.fetchHealth();
  },
  methods: {
    async fetchHealth() {
      try {
        this.loading = true;
        this.error = null;
        
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3050';
        const response = await fetch(`${apiUrl}/health`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        this.healthData = await response.json();
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.health-container {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.loading {
  text-align: center;
  font-size: 1.2rem;
  color: #666;
}

.error {
  color: #d32f2f;
}

.error h2 {
  margin-bottom: 1rem;
}

.health-data pre {
  background-color: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  border: 1px solid #ddd;
  overflow-x: auto;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>