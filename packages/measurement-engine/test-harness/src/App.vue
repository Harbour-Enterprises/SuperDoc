<script setup>
import '@/assets/styles/elements/prosemirror.css';
import { computed, ref } from 'vue';
import MeasurementEditors from './components/MeasurementEditors.vue';
import superdocLogo from './assets/superdoc-logo.webp';

const measurementEditorsRef = ref(null);

const isLoadingDocument = computed(() => measurementEditorsRef.value?.isLoadingDocument?.value ?? false);

const handleUploadChange = async (event) => {
  if (isLoadingDocument.value) return;

  const [file] = event?.target?.files ?? [];
  if (!file) {
    event.target.value = '';
    return;
  }

  await measurementEditorsRef.value?.loadDocument?.(file);
  event.target.value = '';
};
</script>

<template>
  <div class="main-container">
    <div class="ambient-glow" aria-hidden="true" />
    <header class="header">
      <div class="brand">
        <div class="brand-mark">
          <img :src="superdocLogo" alt="Superdoc logo" class="brand-logo" />
        </div>
        <div class="brand-copy">
          <span class="brand-pill">Superdoc Labs</span>
          <div class="title">Measurement harness</div>
          <p class="subtitle">Preview pagination diagnostics with live measurement output.</p>
        </div>
      </div>

      <label class="upload-label" :class="{ disabled: isLoadingDocument }">
        <span>{{ isLoadingDocument ? 'Loading...' : 'Upload DOCX' }}</span>
        <input
          class="upload-input"
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          :disabled="isLoadingDocument"
          @change="handleUploadChange"
        />
      </label>
    </header>

    <div class="stage">
      <div class="editor-wrapper">
        <MeasurementEditors ref="measurementEditorsRef" />
      </div>
    </div>
  </div>
</template>

<style scoped>
:global(body) {
  margin: 0;
  font-family:
    'Inter',
    'SF Pro Text',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  background: #05060f;
}

.main-container {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 32px 40px 48px;
  box-sizing: border-box;
  background: radial-gradient(120% 100% at 10% 0%, rgba(111, 173, 255, 0.14), transparent 55%),
    linear-gradient(160deg, #0a1022 0%, #0b142e 42%, #05060f 100%);
}

.ambient-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(450px at 12% 8%, rgba(130, 174, 255, 0.18), transparent 60%),
    radial-gradient(420px at 85% 16%, rgba(92, 218, 211, 0.12), transparent 58%);
  filter: blur(0);
  opacity: 0.9;
}

.header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  width: 100%;
  max-width: 1784px;
  margin: 0;
  margin-right: auto;
  align-self: flex-start;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  background: rgba(12, 17, 31, 0.72);
  backdrop-filter: blur(16px);
  box-shadow: 0 20px 60px rgba(8, 12, 25, 0.35);
  color: #e6ecff;
}

.brand {
  display: flex;
  align-items: center;
  gap: 18px;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border-radius: 14px;
  background: radial-gradient(120% 120% at 20% 16%, rgba(255, 255, 255, 0.35), transparent 55%),
    linear-gradient(135deg, rgba(99, 122, 255, 0.8), rgba(44, 204, 210, 0.8));
  border: 1px solid rgba(165, 188, 255, 0.4);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.4),
    0 12px 24px rgba(8, 12, 24, 0.45);
  overflow: hidden;
}

.brand-logo {
  width: 72%;
  height: 72%;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(9, 14, 30, 0.35));
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.brand-pill {
  align-self: flex-start;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: rgba(229, 237, 255, 0.85);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.title {
  font-size: 26px;
  font-weight: 700;
  color: #f8fbff;
}

.subtitle {
  margin: 0;
  color: rgba(229, 237, 255, 0.72);
  font-size: 14px;
  font-weight: 400;
}

.upload-label {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.05));
  color: #f6f9ff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.upload-label:hover:not(.disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.35);
}

.upload-label.disabled {
  opacity: 0.6;
  cursor: progress;
  box-shadow: none;
}

.upload-input {
  display: none;
}

.stage {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 12px;
  margin-top: 32px;
  padding: 36px 20px 36px 32px;
  width: auto;
  max-width: 100%;
  align-self: flex-start;
  margin-right: auto;
  border-radius: 32px;
  border: 1px solid rgba(90, 112, 255, 0.08);
  background: linear-gradient(135deg, rgba(16, 22, 39, 0.9), rgba(16, 29, 49, 0.65));
  box-shadow: 0 32px 88px rgba(7, 13, 26, 0.45);
}

.editor-wrapper {
  flex: 1;
  display: flex;
  background: rgba(10, 14, 26, 0.78);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 20px 60px rgba(6, 12, 24, 0.45);
  padding: 0 16px 24px 16px;
  box-sizing: border-box;
  backdrop-filter: blur(18px);
}

.editor-wrapper > * {
  flex: 0 1 auto;
}

@media (max-width: 1200px) {
  .main-container {
    padding: 28px 28px 40px;
  }

  .header {
    padding: 20px 24px;
  }

  .stage {
    flex-direction: column;
    padding: 28px;
    gap: 28px;
  }
}

@media (max-width: 768px) {
  .main-container {
    padding: 24px 18px 32px;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .brand {
    width: 100%;
  }

  .upload-label {
    align-self: stretch;
    justify-content: center;
  }

  .stage {
    padding: 24px;
    margin-top: 28px;
  }
}
</style>
