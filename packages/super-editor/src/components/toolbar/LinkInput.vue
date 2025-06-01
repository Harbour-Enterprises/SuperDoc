<script setup>
import { ref, computed, watch, getCurrentInstance, onMounted } from 'vue';
import { toolbarIcons } from './toolbarIcons.js';

const emit = defineEmits(['submit', 'cancel']);
const props = defineProps({
  initialText: {
    type: String,
    default: '',
  },
  href: {
    type: String,
    default: '',
  },
  showInput: {
    type: Boolean,
    default: true,
  },
  showLink: {
    type: Boolean,
    default: true,
  },
  goToAnchor: {
    type: Function,
    default: () => {},
  },
});

const { proxy } = getCurrentInstance();
const handleSubmit = () => {
  if (proxy?.$submit instanceof Function) proxy.$submit();
  if (rawUrl.value && validUrl.value) {
    emit('submit', { text: text.value, href: url.value });
    return;
  } else if (!rawUrl.value) {
    emit('submit', { text: text.value, href: null });
    return;
  }
  console.debug('[LinkInput] Invalid URL in handleSubmit');
  urlError.value = true;
};

const handleRemove = () => {
  emit('submit', { text: text.value, href: null });
};

const urlError = ref(false);
const text = ref(props.initialText);
const rawUrl = ref(props.href);
const url = computed(() => {
  if (!rawUrl.value?.startsWith('http')) return 'http://' + rawUrl.value;
  return rawUrl.value;
});

const validUrl = computed(() => {
  const urlSplit = url.value.split('.').filter(Boolean);
  return url.value.includes('.') && urlSplit.length > 1;
});

const getApplyText = computed(() => (showApply.value ? 'Apply' : 'Remove'));
const isDisabled = computed(() => !validUrl.value);
const showApply = computed(() => !showRemove.value);
const showRemove = computed(() => props.href && !rawUrl.value);
const isAnchor = computed(() => props.href.startsWith('#'));

const openLink = () => {
  window.open(url.value, '_blank');
};

watch(
  () => props.href,
  (newVal) => {
    rawUrl.value = newVal;
  },
);

const focusInput = () => {
  const input = document.querySelector('.link-input-ctn input');
  if (!input) return;
  input.focus();
};

onMounted(() => {
  if (props.showInput) focusInput();
});
</script>

<template>
  <div class="link-input-ctn">
    <div class="link-title" v-if="!href">Add link</div>
    <div class="link-title" v-else-if="isAnchor">Page anchor</div>
    <div class="link-title" v-else>Edit link</div>

    <div v-if="showInput && !isAnchor">
      <div class="input-row">
        <div class="input-icon" v-html="toolbarIcons.linkInput"></div>
        <input
          type="text"
          placeholder="Type or paste a link"
          :class="{ error: urlError }"
          v-model="rawUrl"
          @keydown.enter.stop.prevent="handleSubmit"
          @keydown="urlError = false"
        />

        <div
          class="open-link-icon"
          :class="{ disabled: !validUrl }"
          v-html="toolbarIcons.openLink"
          @click="openLink"
          data-item="btn-link-open"
        ></div>
      </div>
      <div class="input-row link-buttons">
        <button class="remove-btn" @click="handleRemove" v-if="href" data-item="btn-link-remove">
          <div class="remove-btn__icon" v-html="toolbarIcons.removeLink"></div>
          Remove
        </button>
        <button
          class="submit-btn"
          v-if="showApply"
          @click="handleSubmit"
          :class="{ 'disable-btn': isDisabled }"
          data-item="btn-link-apply"
        >
          {{ getApplyText }}
        </button>
      </div>
    </div>

    <div v-else-if="isAnchor" class="input-row go-to-anchor clickable">
      <a @click.stop.prevent="goToAnchor">Go to {{ href.startsWith('#_') ? href.substring(2) : href }}</a>
    </div>
  </div>
</template>

<style scoped>
.link-input-ctn :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
  fill: currentColor;
}

.open-link-icon {
  margin-left: 10px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid transparent;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
  cursor: pointer;
}

.open-link-icon:hover {
  color: #1355ff;
  background-color: white;
  border: 1px solid #dbdbdb;
}

.open-link-icon :deep(svg) {
  width: 15px;
  height: 15px;
}

.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}
.link-buttons {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.remove-btn__icon {
  display: inline-flex;
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  margin-right: 4px;
}

.link-buttons button {
  margin-left: 5px;
}
.disable-btn {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}
.go-to-anchor a {
  font-size: 14px;
  text-decoration: underline;
}
.clickable {
  cursor: pointer;
}
.link-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
}

.input-icon {
  position: absolute;
  transform: rotate(45deg);
  left: 25px;
  width: auto;
  height: 12px;
  color: #999;
  pointer-events: none;
}

.hasBottomMargin {
  margin-bottom: 1em;
}

.link-input-ctn {
  width: 320px;
  display: flex;
  flex-direction: column;
  padding: 1em;
  border-radius: 5px;
  background-color: #fff;
  box-sizing: border-box;
}
.remove-btn {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 10px 16px;
  border-radius: 8px;
  outline: none;
  background-color: white;
  color: black;
  font-weight: 400;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid #ebebeb;
  box-sizing: border-box;
}
.remove-btn:hover {
  background-color: #dbdbdb;
}
.submit-btn {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 10px 16px;
  border-radius: 8px;
  outline: none;
  border: none;
  background-color: #1355ff;
  color: white;
  font-weight: 400;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-sizing: border-box;
}
.submit-btn:hover {
  background-color: #0d47c1;
}

.input-row {
  align-content: baseline;
  display: flex;
  align-items: center;
}

.input-row input {
  font-size: 13px;
  flex-grow: 1;
  padding: 10px;
  border-radius: 8px;
  padding-left: 32px;
  box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.15);
  color: #666;
  border: 1px solid #ddd;
  box-sizing: border-box;
}
.input-row input:active,
.input-row input:focus {
  outline: none;
  border: 1px solid #1355ff;
}

.input-row {
  font-size: 16px;
}

.error {
  border-color: red !important;
  background-color: #ff00001a;
}

.submit {
  cursor: pointer;
}
</style>
