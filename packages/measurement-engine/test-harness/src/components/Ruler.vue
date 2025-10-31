<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';

const rulerRef = ref(null);
const segments = ref([]);

const INCH_IN_PX = 96;
const MINOR_TICKS = [
  { id: 'quarter', fraction: 0.25 },
  { id: 'half', fraction: 0.5 },
  { id: 'three-quarter', fraction: 0.75 },
];

const updateSegments = () => {
  if (!rulerRef.value) {
    return;
  }

  const height = rulerRef.value.offsetHeight || 0;
  const count = Math.max(1, Math.ceil(height / INCH_IN_PX));
  segments.value = Array.from({ length: count }, (_, index) => index);
};

let resizeObserver;
let fallbackListenerAttached = false;

onMounted(() => {
  updateSegments();
  if (!rulerRef.value) {
    return;
  }
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => updateSegments());
  }

  if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(updateSegments);
    resizeObserver.observe(rulerRef.value);
  } else if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateSegments);
    fallbackListenerAttached = true;
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();

  if (fallbackListenerAttached && typeof window !== 'undefined') {
    window.removeEventListener('resize', updateSegments);
  }
});
</script>

<template>
  <div ref="rulerRef" class="ruler" aria-hidden="true">
    <div v-for="mark in segments" :key="mark" class="inch-segment">
      <span class="label">{{ mark }}"</span>
      <span
        v-for="tick in MINOR_TICKS"
        :key="`${mark}-${tick.id}`"
        class="tick minor"
        :class="tick.id"
        :style="{ top: `${tick.fraction * 100}%` }"
      />
    </div>
  </div>
</template>

<style scoped>
.ruler {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 72px;
  min-width: 72px;
  background: linear-gradient(180deg, rgba(39, 54, 92, 0.92), rgba(20, 29, 52, 0.95));
  border-left: 1px solid rgba(99, 122, 255, 0.3);
  border-right: 1px solid rgba(62, 78, 135, 0.45);
  box-shadow:
    inset -6px 0 12px rgba(0, 0, 0, 0.32),
    0 20px 40px rgba(7, 11, 24, 0.6);
  overflow: hidden;
}

.ruler::before,
.ruler::after {
  content: '';
  position: absolute;
  right: 0;
  width: 60%;
  height: 1px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.32), rgba(174, 197, 255, 0.05));
}

.ruler::before {
  top: 0;
}

.ruler::after {
  bottom: 0;
}

.inch-segment {
  position: relative;
  flex: 0 0 1in;
  box-sizing: border-box;
}

.inch-segment::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 60%;
  height: 1px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.4), rgba(105, 148, 255, 0.15));
}

.label {
  position: absolute;
  left: 8px;
  top: 4px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(224, 232, 255, 0.78);
  pointer-events: none;
  text-shadow: 0 1px 2px rgba(5, 8, 16, 0.6);
}

.tick {
  position: absolute;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(229, 238, 255, 0.85), rgba(125, 189, 255, 0.5));
}

.tick.minor {
  background: linear-gradient(90deg, rgba(200, 222, 255, 0.6), rgba(95, 152, 255, 0.35));
}

.tick.minor.quarter,
.tick.minor.three-quarter {
  width: 40%;
}

.tick.minor.half {
  width: 55%;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.9), rgba(160, 206, 255, 0.7));
}
</style>
