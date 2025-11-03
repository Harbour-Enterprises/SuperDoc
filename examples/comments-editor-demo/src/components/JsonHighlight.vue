<template>
  <pre class="json-highlight"><code v-html="highlightedJson"></code></pre>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  json: {
    type: String,
    required: true
  }
});

const highlightedJson = computed(() => {
  try {
    // Parse and re-stringify to ensure proper formatting
    const obj = JSON.parse(props.json);
    const formatted = JSON.stringify(obj, null, 2);
    
    // Apply syntax highlighting
    return formatted
      // Strings (including keys)
      .replace(/"([^"\\]|\\.)*":/g, '<span class="json-key">"$&</span>')
      .replace(/: "([^"\\]|\\.)*"/g, ': <span class="json-string">"$1"</span>')
      // Numbers
      .replace(/: (\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
      // Booleans
      .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
      // Null
      .replace(/: (null)/g, ': <span class="json-null">$1</span>')
      // Fix the key quotes that were captured
      .replace(/"<span class="json-key">""/g, '<span class="json-key">"')
      .replace(/""<\/span>/g, '"</span>')
      .replace(/<\/span>:/g, '"</span>:');
  } catch (e) {
    return props.json;
  }
});
</script>

<style scoped>
.json-highlight {
  margin: 0;
  padding: 1.5rem;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow: auto;
  border-radius: 4px;
}

.json-highlight code {
  white-space: pre;
}

:deep(.json-key) {
  color: #9cdcfe;
}

:deep(.json-string) {
  color: #ce9178;
}

:deep(.json-number) {
  color: #b5cea8;
}

:deep(.json-boolean) {
  color: #569cd6;
}

:deep(.json-null) {
  color: #569cd6;
}
</style>