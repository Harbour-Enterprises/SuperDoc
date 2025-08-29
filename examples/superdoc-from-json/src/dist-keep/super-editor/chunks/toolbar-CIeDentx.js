import { computed, createElementBlock, openBlock, createElementVNode, createCommentVNode, normalizeClass, normalizeStyle, ref, withKeys, unref, withModifiers, createBlock, toDisplayString, withDirectives, vModelText, nextTick, getCurrentInstance, createVNode, readonly, watch, onMounted, onBeforeUnmount, reactive, onBeforeMount, inject, onActivated, onDeactivated, createTextVNode, Fragment, Comment, defineComponent, provide, h, Teleport, toRef, renderSlot, isVNode, shallowRef, watchEffect, mergeProps, Transition, vShow, cloneVNode, Text, renderList, withCtx } from "vue";
import { H as process$1 } from "./converter-Gn2vfeVr.js";
import { _ as _export_sfc, u as useHighContrastMode, g as global$1 } from "./editor-BrHzJHI5.js";
const sanitizeNumber = (value, defaultNumber) => {
  let sanitized = value.replace(/[^0-9.]/g, "");
  sanitized = parseFloat(sanitized);
  if (isNaN(sanitized)) sanitized = defaultNumber;
  sanitized = parseFloat(sanitized);
  return sanitized;
};
const throttle = (func, wait, options) => {
  let timeout, context, args, result;
  let previous = 0;
  if (!options) options = {};
  const later = function() {
    previous = options.leading === false ? 0 : Date.now();
    timeout = null;
    result = func.apply(context, args);
    if (!timeout) context = args = null;
  };
  const throttled = function() {
    const _now = Date.now();
    if (!previous && options.leading === false) previous = _now;
    const remaining = wait - (_now - previous);
    context = this;
    args = arguments;
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = _now;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    } else if (!timeout && options.trailing !== false) {
      timeout = setTimeout(later, remaining);
    }
    return result;
  };
  throttled.cancel = function() {
    clearTimeout(timeout);
    previous = 0;
    timeout = context = args = null;
  };
  return throttled;
};
const boldIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M0 64C0 46.3 14.3 32 32 32l48 0 16 0 128 0c70.7 0 128 57.3 128 128c0 31.3-11.3 60.1-30 82.3c37.1 22.4 62 63.1 62 109.7c0 70.7-57.3 128-128 128L96 480l-16 0-48 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l16 0 0-160L48 96 32 96C14.3 96 0 81.7 0 64zM224 224c35.3 0 64-28.7 64-64s-28.7-64-64-64L112 96l0 128 112 0zM112 288l0 128 144 0c35.3 0 64-28.7 64-64s-28.7-64-64-64l-32 0-112 0z"/></svg>';
const italicIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M128 64c0-17.7 14.3-32 32-32l192 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-58.7 0L160 416l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 480c-17.7 0-32-14.3-32-32s14.3-32 32-32l58.7 0L224 96l-64 0c-17.7 0-32-14.3-32-32z"/></svg>';
const underlineIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M16 64c0-17.7 14.3-32 32-32l96 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-16 0 0 128c0 53 43 96 96 96s96-43 96-96l0-128-16 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l96 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-16 0 0 128c0 88.4-71.6 160-160 160s-160-71.6-160-160L64 96 48 96C30.3 96 16 81.7 16 64zM0 448c0-17.7 14.3-32 32-32l384 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 480c-17.7 0-32-14.3-32-32z"/></svg>';
const listIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M40 48C26.7 48 16 58.7 16 72l0 48c0 13.3 10.7 24 24 24l48 0c13.3 0 24-10.7 24-24l0-48c0-13.3-10.7-24-24-24L40 48zM192 64c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L192 64zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-288 0zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-288 0zM16 232l0 48c0 13.3 10.7 24 24 24l48 0c13.3 0 24-10.7 24-24l0-48c0-13.3-10.7-24-24-24l-48 0c-13.3 0-24 10.7-24 24zM40 368c-13.3 0-24 10.7-24 24l0 48c0 13.3 10.7 24 24 24l48 0c13.3 0 24-10.7 24-24l0-48c0-13.3-10.7-24-24-24l-48 0z"/></svg>';
const listOlIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M24 56c0-13.3 10.7-24 24-24l32 0c13.3 0 24 10.7 24 24l0 120 16 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-80 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l16 0 0-96-8 0C34.7 80 24 69.3 24 56zM86.7 341.2c-6.5-7.4-18.3-6.9-24 1.2L51.5 357.9c-7.7 10.8-22.7 13.3-33.5 5.6s-13.3-22.7-5.6-33.5l11.1-15.6c23.7-33.2 72.3-35.6 99.2-4.9c21.3 24.4 20.8 60.9-1.1 84.7L86.8 432l33.2 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-88 0c-9.5 0-18.2-5.6-22-14.4s-2.1-18.9 4.3-25.9l72-78c5.3-5.8 5.4-14.6 .3-20.5zM224 64l256 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-256 0c-17.7 0-32-14.3-32-32s14.3-32 32-32zm0 160l256 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-256 0c-17.7 0-32-14.3-32-32s14.3-32 32-32zm0 160l256 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-256 0c-17.7 0-32-14.3-32-32s14.3-32 32-32z"/></svg>';
const imageIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M0 96C0 60.7 28.7 32 64 32l384 0c35.3 0 64 28.7 64 64l0 320c0 35.3-28.7 64-64 64L64 480c-35.3 0-64-28.7-64-64L0 96zM323.8 202.5c-4.5-6.6-11.9-10.5-19.8-10.5s-15.4 3.9-19.8 10.5l-87 127.6L170.7 297c-4.6-5.7-11.5-9-18.7-9s-14.2 3.3-18.7 9l-64 80c-5.8 7.2-6.9 17.1-2.9 25.4s12.4 13.6 21.6 13.6l96 0 32 0 208 0c8.9 0 17.1-4.9 21.2-12.8s3.6-17.4-1.4-24.7l-120-176zM112 192a48 48 0 1 0 0-96 48 48 0 1 0 0 96z"/></svg>';
const linkIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M579.8 267.7c56.5-56.5 56.5-148 0-204.5c-50-50-128.8-56.5-186.3-15.4l-1.6 1.1c-14.4 10.3-17.7 30.3-7.4 44.6s30.3 17.7 44.6 7.4l1.6-1.1c32.1-22.9 76-19.3 103.8 8.6c31.5 31.5 31.5 82.5 0 114L422.3 334.8c-31.5 31.5-82.5 31.5-114 0c-27.9-27.9-31.5-71.8-8.6-103.8l1.1-1.6c10.3-14.4 6.9-34.4-7.4-44.6s-34.4-6.9-44.6 7.4l-1.1 1.6C206.5 251.2 213 330 263 380c56.5 56.5 148 56.5 204.5 0L579.8 267.7zM60.2 244.3c-56.5 56.5-56.5 148 0 204.5c50 50 128.8 56.5 186.3 15.4l1.6-1.1c14.4-10.3 17.7-30.3 7.4-44.6s-30.3-17.7-44.6-7.4l-1.6 1.1c-32.1 22.9-76 19.3-103.8-8.6C74 372 74 321 105.5 289.5L217.7 177.2c31.5-31.5 82.5-31.5 114 0c27.9 27.9 31.5 71.8 8.6 103.9l-1.1 1.6c-10.3 14.4-6.9 34.4 7.4 44.6s34.4 6.9 44.6-7.4l1.1-1.6C433.5 260.8 427 182 377 132c-56.5-56.5-148-56.5-204.5 0L60.2 244.3z"/></svg>';
const alignLeftIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M288 64c0 17.7-14.3 32-32 32L32 96C14.3 96 0 81.7 0 64S14.3 32 32 32l224 0c17.7 0 32 14.3 32 32zm0 256c0 17.7-14.3 32-32 32L32 352c-17.7 0-32-14.3-32-32s14.3-32 32-32l224 0c17.7 0 32 14.3 32 32zM0 192c0-17.7 14.3-32 32-32l384 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 224c-17.7 0-32-14.3-32-32zM448 448c0 17.7-14.3 32-32 32L32 480c-17.7 0-32-14.3-32-32s14.3-32 32-32l384 0c17.7 0 32 14.3 32 32z"/></svg>';
const alignCenterIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M352 64c0-17.7-14.3-32-32-32L128 32c-17.7 0-32 14.3-32 32s14.3 32 32 32l192 0c17.7 0 32-14.3 32-32zm96 128c0-17.7-14.3-32-32-32L32 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l384 0c17.7 0 32-14.3 32-32zM0 448c0 17.7 14.3 32 32 32l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L32 416c-17.7 0-32 14.3-32 32zM352 320c0-17.7-14.3-32-32-32l-192 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l192 0c17.7 0 32-14.3 32-32z"/></svg>';
const alignRightIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M448 64c0 17.7-14.3 32-32 32L192 96c-17.7 0-32-14.3-32-32s14.3-32 32-32l224 0c17.7 0 32 14.3 32 32zm0 256c0 17.7-14.3 32-32 32l-224 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l224 0c17.7 0 32 14.3 32 32zM0 192c0-17.7 14.3-32 32-32l384 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 224c-17.7 0-32-14.3-32-32zM448 448c0 17.7-14.3 32-32 32L32 480c-17.7 0-32-14.3-32-32s14.3-32 32-32l384 0c17.7 0 32 14.3 32 32z"/></svg>';
const alignJustifyIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M448 64c0-17.7-14.3-32-32-32L32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32zm0 256c0-17.7-14.3-32-32-32L32 288c-17.7 0-32 14.3-32 32s14.3 32 32 32l384 0c17.7 0 32-14.3 32-32zM0 192c0 17.7 14.3 32 32 32l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L32 160c-17.7 0-32 14.3-32 32zM448 448c0-17.7-14.3-32-32-32L32 416c-17.7 0-32 14.3-32 32s14.3 32 32 32l384 0c17.7 0 32-14.3 32-32z"/></svg>';
const indentIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M0 64C0 46.3 14.3 32 32 32l384 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 96C14.3 96 0 81.7 0 64zM192 192c0-17.7 14.3-32 32-32l192 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-192 0c-17.7 0-32-14.3-32-32zm32 96l192 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-192 0c-17.7 0-32-14.3-32-32s14.3-32 32-32zM0 448c0-17.7 14.3-32 32-32l384 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 480c-17.7 0-32-14.3-32-32zM127.8 268.6L25.8 347.9C15.3 356.1 0 348.6 0 335.3L0 176.7c0-13.3 15.3-20.8 25.8-12.6l101.9 79.3c8.2 6.4 8.2 18.9 0 25.3z"/></svg>';
const outdentIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M0 64C0 46.3 14.3 32 32 32l384 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 96C14.3 96 0 81.7 0 64zM192 192c0-17.7 14.3-32 32-32l192 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-192 0c-17.7 0-32-14.3-32-32zm32 96l192 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-192 0c-17.7 0-32-14.3-32-32s14.3-32 32-32zM0 448c0-17.7 14.3-32 32-32l384 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 480c-17.7 0-32-14.3-32-32zM.2 268.6c-8.2-6.4-8.2-18.9 0-25.3l101.9-79.3c10.5-8.2 25.8-.7 25.8 12.6l0 158.6c0 13.3-15.3 20.8-25.8 12.6L.2 268.6z"/></svg>';
const paintRollerIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M0 64C0 28.7 28.7 0 64 0L352 0c35.3 0 64 28.7 64 64l0 64c0 35.3-28.7 64-64 64L64 192c-35.3 0-64-28.7-64-64L0 64zM160 352c0-17.7 14.3-32 32-32l0-16c0-44.2 35.8-80 80-80l144 0c17.7 0 32-14.3 32-32l0-32 0-90.5c37.3 13.2 64 48.7 64 90.5l0 32c0 53-43 96-96 96l-144 0c-8.8 0-16 7.2-16 16l0 16c17.7 0 32 14.3 32 32l0 128c0 17.7-14.3 32-32 32l-64 0c-17.7 0-32-14.3-32-32l0-128z"/></svg>';
const textSlashIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L355.7 253.5 400.2 96 503 96 497 120.2c-4.3 17.1 6.1 34.5 23.3 38.8s34.5-6.1 38.8-23.3l11-44.1C577.6 61.3 554.7 32 523.5 32L376.1 32l-.3 0L204.5 32c-22 0-41.2 15-46.6 36.4l-6.3 25.2L38.8 5.1zm168 131.7c.1-.3 .2-.7 .3-1L217 96l116.7 0L301.3 210.8l-94.5-74.1zM243.3 416L192 416c-17.7 0-32 14.3-32 32s14.3 32 32 32l160 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-42.2 0 17.6-62.1L272.9 311 243.3 416z"/></svg>';
const rotateLeftIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M48.5 224L40 224c-13.3 0-24-10.7-24-24L16 72c0-9.7 5.8-18.5 14.8-22.2s19.3-1.7 26.2 5.2L98.6 96.6c87.6-86.5 228.7-86.2 315.8 1c87.5 87.5 87.5 229.3 0 316.8s-229.3 87.5-316.8 0c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0c62.5 62.5 163.8 62.5 226.3 0s62.5-163.8 0-226.3c-62.2-62.2-162.7-62.5-225.3-1L185 183c6.9 6.9 8.9 17.2 5.2 26.2s-12.5 14.8-22.2 14.8L48.5 224z"/></svg>';
const rotateRightIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M463.5 224l8.5 0c13.3 0 24-10.7 24-24l0-128c0-9.7-5.8-18.5-14.8-22.2s-19.3-1.7-26.2 5.2L413.4 96.6c-87.6-86.5-228.7-86.2-315.8 1c-87.5 87.5-87.5 229.3 0 316.8s229.3 87.5 316.8 0c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0c-62.5 62.5-163.8 62.5-226.3 0s-62.5-163.8 0-226.3c62.2-62.2 162.7-62.5 225.3-1L327 183c-6.9 6.9-8.9 17.2-5.2 26.2s12.5 14.8 22.2 14.8l119.5 0z"/></svg>';
const calendarCheckIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M128 0c17.7 0 32 14.3 32 32l0 32 128 0 0-32c0-17.7 14.3-32 32-32s32 14.3 32 32l0 32 48 0c26.5 0 48 21.5 48 48l0 48L0 160l0-48C0 85.5 21.5 64 48 64l48 0 0-32c0-17.7 14.3-32 32-32zM0 192l448 0 0 272c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 192zM329 305c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-95 95-47-47c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l64 64c9.4 9.4 24.6 9.4 33.9 0L329 305z"/></svg>';
const calendarXmarkIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M128 0c17.7 0 32 14.3 32 32l0 32 128 0 0-32c0-17.7 14.3-32 32-32s32 14.3 32 32l0 32 48 0c26.5 0 48 21.5 48 48l0 48L0 160l0-48C0 85.5 21.5 64 48 64l48 0 0-32c0-17.7 14.3-32 32-32zM0 192l448 0 0 272c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 192zM305 305c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-47 47-47-47c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l47 47-47 47c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l47-47 47 47c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-47-47 47-47z"/></svg>';
const listCheckIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M152.1 38.2c9.9 8.9 10.7 24 1.8 33.9l-72 80c-4.4 4.9-10.6 7.8-17.2 7.9s-12.9-2.4-17.6-7L7 113C-2.3 103.6-2.3 88.4 7 79s24.6-9.4 33.9 0l22.1 22.1 55.1-61.2c8.9-9.9 24-10.7 33.9-1.8zm0 160c9.9 8.9 10.7 24 1.8 33.9l-72 80c-4.4 4.9-10.6 7.8-17.2 7.9s-12.9-2.4-17.6-7L7 273c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l22.1 22.1 55.1-61.2c8.9-9.9 24-10.7 33.9-1.8zM224 96c0-17.7 14.3-32 32-32l224 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-224 0c-17.7 0-32-14.3-32-32zm0 160c0-17.7 14.3-32 32-32l224 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-224 0c-17.7 0-32-14.3-32-32zM160 416c0-17.7 14.3-32 32-32l288 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-288 0c-17.7 0-32-14.3-32-32zM48 368a48 48 0 1 1 0 96 48 48 0 1 1 0-96z"/></svg>';
const userEditIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512l293.1 0c-3.1-8.8-3.7-18.4-1.4-27.8l15-60.1c2.8-11.3 8.6-21.5 16.8-29.7l40.3-40.3c-32.1-31-75.7-50.1-123.9-50.1l-91.4 0zm435.5-68.3c-15.6-15.6-40.9-15.6-56.6 0l-29.4 29.4 71 71 29.4-29.4c15.6-15.6 15.6-40.9 0-56.6l-14.4-14.4zM375.9 417c-4.1 4.1-7 9.2-8.4 14.9l-15 60.1c-1.4 5.5 .2 11.2 4.2 15.2s9.7 5.6 15.2 4.2l60.1-15c5.6-1.4 10.8-4.3 14.9-8.4L576.1 358.7l-71-71L375.9 417z"/></svg>';
const eyeIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64c-7.1 0-13.9-1.2-20.3-3.3c-5.5-1.8-11.9 1.6-11.7 7.4c.3 6.9 1.3 13.8 3.2 20.7c13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-11.1-41.5-47.8-69.4-88.6-71.1c-5.8-.2-9.2 6.1-7.4 11.7c2.1 6.4 3.3 13.2 3.3 20.3z"/></svg>';
const fileIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M0 64C0 28.7 28.7 0 64 0L224 0l0 128c0 17.7 14.3 32 32 32l128 0 0 288c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm384 64l-128 0L256 0 384 128z"/></svg>';
const fontIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M254 52.8C249.3 40.3 237.3 32 224 32s-25.3 8.3-30 20.8L57.8 416 32 416c-17.7 0-32 14.3-32 32s14.3 32 32 32l96 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-1.8 0 18-48 159.6 0 18 48-1.8 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l96 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-25.8 0L254 52.8zM279.8 304l-111.6 0L224 155.1 279.8 304z"/></svg>';
const fileHalfDashedIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M64 0C28.7 0 0 28.7 0 64L0 320l384 0 0-160-128 0c-17.7 0-32-14.3-32-32L224 0 64 0zM256 0l0 128 128 0L256 0zM0 416l64 0 0-64L0 352l0 64zm288 32l-80 0 0 64 80 0 0-64zm-112 0l-80 0 0 64 80 0 0-64zM64 448L0 448c0 35.3 28.7 64 64 64l0-64zm256 0l0 64c35.3 0 64-28.7 64-64l-64 0zm64-32l0-64-64 0 0 64 64 0z"/></svg>';
const commentIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M512 240c0 114.9-114.6 208-256 208c-37.1 0-72.3-6.4-104.1-17.9c-11.9 8.7-31.3 20.6-54.3 30.6C73.6 471.1 44.7 480 16 480c-6.5 0-12.3-3.9-14.8-9.9c-2.5-6-1.1-12.8 3.4-17.4c0 0 0 0 0 0s0 0 0 0s0 0 0 0c0 0 0 0 0 0l.3-.3c.3-.3 .7-.7 1.3-1.4c1.1-1.2 2.8-3.1 4.9-5.7c4.1-5 9.6-12.4 15.2-21.6c10-16.6 19.5-38.4 21.4-62.9C17.7 326.8 0 285.1 0 240C0 125.1 114.6 32 256 32s256 93.1 256 208z"/></svg>';
const circleIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512z"/></svg>';
const checkIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/></svg>';
const xmarkIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/></svg>';
const upRightFromSquareIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M352 0c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9L370.7 96 201.4 265.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L416 141.3l41.4 41.4c9.2 9.2 22.9 11.9 34.9 6.9s19.8-16.6 19.8-29.6l0-128c0-17.7-14.3-32-32-32L352 0zM80 32C35.8 32 0 67.8 0 112L0 432c0 44.2 35.8 80 80 80l320 0c44.2 0 80-35.8 80-80l0-112c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 112c0 8.8-7.2 16-16 16L80 448c-8.8 0-16-7.2-16-16l0-320c0-8.8 7.2-16 16-16l112 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L80 32z"/></svg>';
const ellipsisVerticalIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M64 360a56 56 0 1 0 0 112 56 56 0 1 0 0-112zm0-160a56 56 0 1 0 0 112 56 56 0 1 0 0-112zM120 96A56 56 0 1 0 8 96a56 56 0 1 0 112 0z"/></svg>';
const caretUpIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M182.6 137.4c-12.5-12.5-32.8-12.5-45.3 0l-128 128c-9.2 9.2-11.9 22.9-6.9 34.9s16.6 19.8 29.6 19.8l256 0c12.9 0 24.6-7.8 29.6-19.8s2.2-25.7-6.9-34.9l-128-128z"/></svg>';
const caretDownIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M137.4 374.6c12.5 12.5 32.8 12.5 45.3 0l128-128c9.2-9.2 11.9-22.9 6.9-34.9s-16.6-19.8-29.6-19.8L32 192c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9l128 128z"/></svg>';
const rulerSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M177.9 494.1c-18.7 18.7-49.1 18.7-67.9 0L17.9 401.9c-18.7-18.7-18.7-49.1 0-67.9l50.7-50.7 48 48c6.2 6.2 16.4 6.2 22.6 0s6.2-16.4 0-22.6l-48-48 41.4-41.4 48 48c6.2 6.2 16.4 6.2 22.6 0s6.2-16.4 0-22.6l-48-48 41.4-41.4 48 48c6.2 6.2 16.4 6.2 22.6 0s6.2-16.4 0-22.6l-48-48 41.4-41.4 48 48c6.2 6.2 16.4 6.2 22.6 0s6.2-16.4 0-22.6l-48-48 50.7-50.7c18.7-18.7 49.1-18.7 67.9 0l92.1 92.1c18.7 18.7 18.7 49.1 0 67.9L177.9 494.1z"/></svg>';
const paintbrushSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M339.3 367.1c27.3-3.9 51.9-19.4 67.2-42.9L568.2 74.1c12.6-19.5 9.4-45.3-7.6-61.2S517.7-4.4 499.1 9.6L262.4 187.2c-24 18-38.2 46.1-38.4 76.1L339.3 367.1zm-19.6 25.4l-116-104.4C143.9 290.3 96 339.6 96 400c0 3.9 .2 7.8 .6 11.6C98.4 429.1 86.4 448 68.8 448L64 448c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0c61.9 0 112-50.1 112-112c0-2.5-.1-5-.2-7.5z"/></svg>';
const highlighterIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M315 315l158.4-215L444.1 70.6 229 229 315 315zm-187 5s0 0 0 0l0-71.7c0-15.3 7.2-29.6 19.5-38.6L420.6 8.4C428 2.9 437 0 446.2 0c11.4 0 22.4 4.5 30.5 12.6l54.8 54.8c8.1 8.1 12.6 19 12.6 30.5c0 9.2-2.9 18.2-8.4 25.6L334.4 396.5c-9 12.3-23.4 19.5-38.6 19.5L224 416l-25.4 25.4c-12.5 12.5-32.8 12.5-45.3 0l-50.7-50.7c-12.5-12.5-12.5-32.8 0-45.3L128 320zM7 466.3l63-63 70.6 70.6-31 31c-4.5 4.5-10.6 7-17 7L24 512c-13.3 0-24-10.7-24-24l0-4.7c0-6.4 2.5-12.5 7-17z"/></svg>\n';
const magicWandIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M224 96l16-32 32-16-32-16-16-32-16 32-32 16 32 16 16 32zM80 160l26.7-53.3L160 80l-53.3-26.7L80 0 53.3 53.3 0 80l53.3 26.7L80 160zm352 128l-26.7 53.3L352 368l53.3 26.7L432 448l26.7-53.3L512 368l-53.3-26.7L432 288zm70.6-193.8L417.8 9.4C411.5 3.1 403.3 0 395.2 0c-8.2 0-16.4 3.1-22.6 9.4L9.4 372.5c-12.5 12.5-12.5 32.8 0 45.3l84.9 84.9c6.3 6.3 14.4 9.4 22.6 9.4 8.2 0 16.4-3.1 22.6-9.4l363.1-363.2c12.5-12.5 12.5-32.8 0-45.2zM359.5 203.5l-50.9-50.9 86.6-86.6 50.9 50.9-86.6 86.6z"/></svg>';
const tableIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M64 256l0-96 160 0 0 96L64 256zm0 64l160 0 0 96L64 416l0-96zm224 96l0-96 160 0 0 96-160 0zM448 256l-160 0 0-96 160 0 0 96zM64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64L64 32z"/></svg>';
const tableColumnsIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M0 96C0 60.7 28.7 32 64 32l384 0c35.3 0 64 28.7 64 64l0 320c0 35.3-28.7 64-64 64L64 480c-35.3 0-64-28.7-64-64L0 96zm64 64l0 256 160 0 0-256L64 160zm384 0l-160 0 0 256 160 0 0-256z"/></svg>';
const arrowsLeftRightIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M406.6 374.6l96-96c12.5-12.5 12.5-32.8 0-45.3l-96-96c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L402.7 224l-293.5 0 41.4-41.4c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-96 96c-12.5 12.5-12.5 32.8 0 45.3l96 96c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.3 288l293.5 0-41.4 41.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0z"/></svg>';
const arrowsToDotIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M256 0c17.7 0 32 14.3 32 32l0 32 32 0c12.9 0 24.6 7.8 29.6 19.8s2.2 25.7-6.9 34.9l-64 64c-12.5 12.5-32.8 12.5-45.3 0l-64-64c-9.2-9.2-11.9-22.9-6.9-34.9s16.6-19.8 29.6-19.8l32 0 0-32c0-17.7 14.3-32 32-32zM169.4 393.4l64-64c12.5-12.5 32.8-12.5 45.3 0l64 64c9.2 9.2 11.9 22.9 6.9 34.9s-16.6 19.8-29.6 19.8l-32 0 0 32c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-32-32 0c-12.9 0-24.6-7.8-29.6-19.8s-2.2-25.7 6.9-34.9zM32 224l32 0 0-32c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l64 64c12.5 12.5 12.5 32.8 0 45.3l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6l0-32-32 0c-17.7 0-32-14.3-32-32s14.3-32 32-32zm297.4 54.6c-12.5-12.5-12.5-32.8 0-45.3l64-64c9.2-9.2 22.9-11.9 34.9-6.9s19.8 16.6 19.8 29.6l0 32 32 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-32 0 0 32c0 12.9-7.8 24.6-19.8 29.6s-25.7 2.2-34.9-6.9l-64-64zM256 224a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"/></svg>';
const plusIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"/></svg>';
const trashIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M135.2 17.7C140.6 6.8 151.7 0 163.8 0L284.2 0c12.1 0 23.2 6.8 28.6 17.7L320 32l96 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 96C14.3 96 0 81.7 0 64S14.3 32 32 32l96 0 7.2-14.3zM32 128l384 0 0 320c0 35.3-28.7 64-64 64L96 512c-35.3 0-64-28.7-64-64l0-320zm96 64c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16s16-7.2 16-16l0-224c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16s16-7.2 16-16l0-224c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16s16-7.2 16-16l0-224c0-8.8-7.2-16-16-16z"/></svg>';
const wrenchIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M352 320c88.4 0 160-71.6 160-160c0-15.3-2.2-30.1-6.2-44.2c-3.1-10.8-16.4-13.2-24.3-5.3l-76.8 76.8c-3 3-7.1 4.7-11.3 4.7L336 192c-8.8 0-16-7.2-16-16l0-57.4c0-4.2 1.7-8.3 4.7-11.3l76.8-76.8c7.9-7.9 5.4-21.2-5.3-24.3C382.1 2.2 367.3 0 352 0C263.6 0 192 71.6 192 160c0 19.1 3.4 37.5 9.5 54.5L19.9 396.1C7.2 408.8 0 426.1 0 444.1C0 481.6 30.4 512 67.9 512c18 0 35.3-7.2 48-19.9L297.5 310.5c17 6.2 35.4 9.5 54.5 9.5zM80 408a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"/></svg>';
const borderNoneIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M32 480a32 32 0 1 1 0-64 32 32 0 1 1 0 64zm96-64a32 32 0 1 1 0 64 32 32 0 1 1 0-64zm0-384a32 32 0 1 1 0 64 32 32 0 1 1 0-64zm0 256a32 32 0 1 1 0-64 32 32 0 1 1 0 64zM320 416a32 32 0 1 1 0 64 32 32 0 1 1 0-64zm0-320a32 32 0 1 1 0-64 32 32 0 1 1 0 64zm0 128a32 32 0 1 1 0 64 32 32 0 1 1 0-64zM224 480a32 32 0 1 1 0-64 32 32 0 1 1 0 64zm0-448a32 32 0 1 1 0 64 32 32 0 1 1 0-64zm0 256a32 32 0 1 1 0-64 32 32 0 1 1 0 64zM416 416a32 32 0 1 1 0 64 32 32 0 1 1 0-64zm0-384a32 32 0 1 1 0 64 32 32 0 1 1 0-64zM32 96a32 32 0 1 1 0-64 32 32 0 1 1 0 64zM416 224a32 32 0 1 1 0 64 32 32 0 1 1 0-64zM32 288a32 32 0 1 1 0-64 32 32 0 1 1 0 64zm192 32a32 32 0 1 1 0 64 32 32 0 1 1 0-64zm192 64a32 32 0 1 1 0-64 32 32 0 1 1 0 64zM32 320a32 32 0 1 1 0 64 32 32 0 1 1 0-64zM416 192a32 32 0 1 1 0-64 32 32 0 1 1 0 64zM32 128a32 32 0 1 1 0 64 32 32 0 1 1 0-64zm192 64a32 32 0 1 1 0-64 32 32 0 1 1 0 64z"/></svg>';
const upDownIconSvg = '<svg xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" viewBox="3 4 18 16"><path stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 10V5m0 0L4 7m2-2 2 2m-2 7v5m0 0 2-2m-2 2-2-2m8-10h8m0 5h-8m0 5h8"></path></svg>\n';
const magnifyingGlassSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"/></svg>\n';
const scissorsIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M278.1 256L444.5 89.6c4.7-4.7 4.7-12.3 0-17-32.8-32.8-86-32.8-118.8 0L210.2 188.1l-24.9-24.9c4.3-10.9 6.7-22.8 6.7-35.3 0-53-43-96-96-96S0 75 0 128s43 96 96 96c4.5 0 9-.3 13.4-.9L142.3 256l-32.9 32.9c-4.4-.6-8.8-.9-13.4-.9-53 0-96 43-96 96s43 96 96 96 96-43 96-96c0-12.5-2.4-24.3-6.7-35.3l24.9-24.9L325.7 439.4c32.8 32.8 86 32.8 118.8 0 4.7-4.7 4.7-12.3 0-17L278.1 256zM96 160c-17.6 0-32-14.4-32-32s14.4-32 32-32 32 14.4 32 32-14.4 32-32 32zm0 256c-17.6 0-32-14.4-32-32s14.4-32 32-32 32 14.4 32 32-14.4 32-32 32z"/></svg>';
const copyIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M320 448v40c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V120c0-13.3 10.7-24 24-24h72v296c0 30.9 25.1 56 56 56h168zm0-344V0H152c-13.3 0-24 10.7-24 24v368c0 13.3 10.7 24 24 24h272c13.3 0 24-10.7 24-24V128H344c-13.2 0-24-10.8-24-24zm121-31L375 7A24 24 0 0 0 358.1 0H352v96h96v-6.1a24 24 0 0 0 -7-17z"/></svg>';
const pasteIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M128 184c0-30.9 25.1-56 56-56h136V56c0-13.3-10.7-24-24-24h-80.6C204.3 12.9 183.6 0 160 0s-44.3 12.9-55.4 32H24C10.7 32 0 42.7 0 56v336c0 13.3 10.7 24 24 24h104V184zm32-144c13.3 0 24 10.7 24 24s-10.7 24-24 24-24-10.7-24-24 10.7-24 24-24zm184 248h104v200c0 13.3-10.7 24-24 24H184c-13.3 0-24-10.7-24-24V184c0-13.3 10.7-24 24-24h136v104c0 13.2 10.8 24 24 24zm104-38.1V256h-96v-96h6.1a24 24 0 0 1 17 7l65.9 65.9a24 24 0 0 1 7 17z"/></svg>';
const strikethroughSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M161.3 144c3.2-17.2 14-30.1 33.7-38.6c21.1-9 51.8-12.3 88.6-6.5c11.9 1.9 48.8 9.1 60.1 12c17.1 4.5 34.6-5.6 39.2-22.7s-5.6-34.6-22.7-39.2c-14.3-3.8-53.6-11.4-66.6-13.4c-44.7-7-88.3-4.2-123.7 10.9c-36.5 15.6-64.4 44.8-71.8 87.3c-.1 .6-.2 1.1-.2 1.7c-2.8 23.9 .5 45.6 10.1 64.6c4.5 9 10.2 16.9 16.7 23.9L32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l448 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-209.9 0-.4-.1-1.1-.3c-36-10.8-65.2-19.6-85.2-33.1c-9.3-6.3-15-12.6-18.2-19.1c-3.1-6.1-5.2-14.6-3.8-27.4zM348.9 337.2c2.7 6.5 4.4 15.8 1.9 30.1c-3 17.6-13.8 30.8-33.9 39.4c-21.1 9-51.7 12.3-88.5 6.5c-18-2.9-49.1-13.5-74.4-22.1c-5.6-1.9-11-3.7-15.9-5.4c-16.8-5.6-34.9 3.5-40.5 20.3s3.5 34.9 20.3 40.5c3.6 1.2 7.9 2.7 12.7 4.3c0 0 0 0 0 0s0 0 0 0c24.9 8.5 63.6 21.7 87.6 25.6c0 0 0 0 0 0l.2 0c44.7 7 88.3 4.2 123.7-10.9c36.5-15.6 64.4-44.8 71.8-87.3c3.6-21 2.7-40.4-3.1-58.1l-75.7 0c7 5.6 11.4 11.2 13.9 17.2z"/></svg>\n';
const toolbarIcons = {
  undo: rotateLeftIconSvg,
  redo: rotateRightIconSvg,
  bold: boldIconSvg,
  italic: italicIconSvg,
  underline: underlineIconSvg,
  color: fontIconSvg,
  link: linkIconSvg,
  image: imageIconSvg,
  alignLeft: alignLeftIconSvg,
  alignRight: alignRightIconSvg,
  alignCenter: alignCenterIconSvg,
  alignJustify: alignJustifyIconSvg,
  bulletList: listIconSvg,
  numberedList: listOlIconSvg,
  indentLeft: outdentIconSvg,
  indentRight: indentIconSvg,
  pageBreak: fileHalfDashedIconSvg,
  copyFormat: paintRollerIconSvg,
  clearFormatting: textSlashIconSvg,
  trackChanges: listCheckIconSvg,
  trackChangesFinal: fileIconSvg,
  trackChangesOriginal: eyeIconSvg,
  trackChangesAccept: calendarCheckIconSvg,
  trackChangesReject: calendarXmarkIconSvg,
  documentMode: userEditIconSvg,
  documentEditingMode: userEditIconSvg,
  documentSuggestingMode: commentIconSvg,
  documentViewingMode: eyeIconSvg,
  colorOption: circleIconSvg,
  colorOptionCheck: checkIconSvg,
  linkInput: linkIconSvg,
  removeLink: xmarkIconSvg,
  openLink: upRightFromSquareIconSvg,
  overflow: ellipsisVerticalIconSvg,
  dropdownCaretUp: caretUpIconSvg,
  dropdownCaretDown: caretDownIconSvg,
  ruler: rulerSvg,
  paintbrush: paintbrushSvg,
  highlight: highlighterIcon,
  ai: magicWandIcon,
  table: tableIconSvg,
  tableActions: tableColumnsIconSvg,
  splitCell: arrowsLeftRightIconSvg,
  mergeCells: arrowsToDotIconSvg,
  addRowBefore: plusIconSvg,
  addRowAfter: plusIconSvg,
  addColumnBefore: plusIconSvg,
  addColumnAfter: plusIconSvg,
  deleteRow: trashIconSvg,
  deleteColumn: trashIconSvg,
  deleteTable: trashIconSvg,
  deleteBorders: borderNoneIconSvg,
  fixTables: wrenchIconSvg,
  lineHeight: upDownIconSvg,
  search: magnifyingGlassSvg,
  cut: scissorsIconSvg,
  copy: copyIconSvg,
  paste: pasteIconSvg,
  strikethrough: strikethroughSvg
};
const _hoisted_1$4 = { class: "toolbar-icon" };
const _hoisted_2$3 = ["innerHTML"];
const _sfc_main$5 = {
  __name: "ToolbarButtonIcon",
  props: {
    name: {
      type: String,
      required: true
    },
    color: {
      type: String,
      default: null
    },
    icon: {
      type: String,
      default: null
    }
  },
  setup(__props) {
    const props = __props;
    const getBarColor = computed(() => {
      if (props.name === "color") return { backgroundColor: props.color || "#111111" };
      if (props.name === "highlight") return { backgroundColor: props.color || "#D6D6D6" };
    });
    const hasColorBar = computed(() => {
      return ["color", "highlight"].includes(props.name);
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$4, [
        createElementVNode("div", {
          class: normalizeClass(["toolbar-icon__icon", [`toolbar-icon__icon--${props.name}`]]),
          innerHTML: __props.icon
        }, null, 10, _hoisted_2$3),
        hasColorBar.value ? (openBlock(), createElementBlock("div", {
          key: 0,
          class: "color-bar",
          style: normalizeStyle(getBarColor.value)
        }, null, 4)) : createCommentVNode("", true)
      ]);
    };
  }
};
const ToolbarButtonIcon = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["__scopeId", "data-v-6d7523ab"]]);
const _hoisted_1$3 = ["role", "aria-label", "onKeydown"];
const _hoisted_2$2 = ["data-item"];
const _hoisted_3$2 = {
  key: 1,
  class: "button-label"
};
const _hoisted_4$1 = { key: 2 };
const _hoisted_5 = ["onKeydown", "id"];
const _hoisted_6 = ["placeholder", "onKeydown", "id"];
const _hoisted_7 = ["innerHTML"];
const _hoisted_8 = {
  "aria-live": "polite",
  class: "visually-hidden"
};
const _sfc_main$4 = {
  __name: "ToolbarButton",
  props: {
    iconColor: {
      type: String,
      default: null
    },
    active: {
      type: Boolean,
      default: false
    },
    isNarrow: {
      type: Boolean,
      default: false
    },
    isWide: {
      type: Boolean,
      default: false
    },
    toolbarItem: {
      type: Object,
      required: true
    },
    defaultLabel: {
      type: String,
      default: null
    },
    isOverflowItem: {
      type: Boolean,
      default: false
    }
  },
  emits: ["buttonClick", "textSubmit"],
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    const props = __props;
    const {
      name,
      active,
      icon,
      label,
      hideLabel,
      iconColor,
      hasCaret,
      disabled,
      inlineTextInputVisible,
      hasInlineTextInput,
      minWidth,
      style: style2,
      attributes
    } = props.toolbarItem;
    const inlineTextInput = ref(label);
    const inlineInput = ref(null);
    const { isHighContrastMode } = useHighContrastMode();
    const handleClick = () => {
      if (hasInlineTextInput) {
        nextTick(() => {
          inlineInput.value?.focus();
          inlineInput.value?.select();
        });
      }
      emit("buttonClick");
    };
    const handleInputSubmit = () => {
      const value = inlineTextInput.value;
      const cleanValue = value.replace(/[^0-9]/g, "");
      emit("textSubmit", cleanValue);
      inlineTextInput.value = cleanValue;
    };
    const getStyle = computed(() => {
      if (style2.value) return style2.value;
      return {
        minWidth: props.minWidth
      };
    });
    const caretIcon = computed(() => {
      return active.value ? toolbarIcons.dropdownCaretUp : toolbarIcons.dropdownCaretDown;
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["toolbar-item", unref(attributes).className]),
        style: normalizeStyle(getStyle.value),
        role: __props.isOverflowItem ? "menuitem" : "button",
        "aria-label": unref(attributes).ariaLabel,
        onClick: handleClick,
        onKeydown: withKeys(withModifiers(handleClick, ["stop"]), ["enter"]),
        tabindex: "0"
      }, [
        createElementVNode("div", {
          class: normalizeClass(["toolbar-button", {
            active: unref(active),
            disabled: unref(disabled),
            narrow: __props.isNarrow,
            wide: __props.isWide,
            "has-inline-text-input": unref(hasInlineTextInput),
            "high-contrast": unref(isHighContrastMode)
          }]),
          "data-item": `btn-${unref(name) || ""}`
        }, [
          unref(icon) ? (openBlock(), createBlock(ToolbarButtonIcon, {
            key: 0,
            color: unref(iconColor),
            class: "toolbar-icon",
            icon: unref(icon),
            name: unref(name)
          }, null, 8, ["color", "icon", "name"])) : createCommentVNode("", true),
          unref(label) && !unref(hideLabel) && !unref(inlineTextInputVisible) ? (openBlock(), createElementBlock("div", _hoisted_3$2, toDisplayString(unref(label)), 1)) : createCommentVNode("", true),
          unref(inlineTextInputVisible) ? (openBlock(), createElementBlock("span", _hoisted_4$1, [
            unref(name) === "fontSize" ? withDirectives((openBlock(), createElementBlock("input", {
              key: 0,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => inlineTextInput.value = $event),
              onKeydown: withKeys(withModifiers(handleInputSubmit, ["prevent"]), ["enter"]),
              type: "text",
              class: normalizeClass(["button-text-input", { "high-contrast": unref(isHighContrastMode) }]),
              id: "inlineTextInput-" + unref(name),
              autocomplete: "off",
              ref_key: "inlineInput",
              ref: inlineInput
            }, null, 42, _hoisted_5)), [
              [vModelText, inlineTextInput.value]
            ]) : withDirectives((openBlock(), createElementBlock("input", {
              key: 1,
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => inlineTextInput.value = $event),
              placeholder: unref(label),
              onKeydown: withKeys(withModifiers(handleInputSubmit, ["prevent"]), ["enter"]),
              type: "text",
              class: "button-text-input",
              id: "inlineTextInput-" + unref(name),
              autocomplete: "off",
              ref_key: "inlineInput",
              ref: inlineInput
            }, null, 40, _hoisted_6)), [
              [vModelText, inlineTextInput.value]
            ])
          ])) : createCommentVNode("", true),
          unref(hasCaret) ? (openBlock(), createElementBlock("div", {
            key: 3,
            class: "dropdown-caret",
            innerHTML: caretIcon.value,
            style: normalizeStyle({ opacity: unref(disabled) ? 0.6 : 1 })
          }, null, 12, _hoisted_7)) : createCommentVNode("", true),
          createElementVNode("div", _hoisted_8, toDisplayString(`${unref(attributes).ariaLabel} ${unref(active) ? "selected" : "unset"}`), 1)
        ], 10, _hoisted_2$2)
      ], 46, _hoisted_1$3);
    };
  }
};
const ToolbarButton = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["__scopeId", "data-v-303b3245"]]);
const _hoisted_1$2 = {
  class: "toolbar-separator",
  role: "separator",
  "aria-label": "Toolbar separator"
};
const _sfc_main$3 = {
  __name: "ToolbarSeparator",
  props: {
    active: {
      type: Boolean,
      default: false
    }
  },
  emits: ["command"],
  setup(__props, { emit: __emit }) {
    const { isHighContrastMode } = useHighContrastMode();
    const getSeparatorColor = () => {
      if (isHighContrastMode.value) {
        return "#000";
      }
      return "#dbdbdb";
    };
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$2, [
        createElementVNode("div", {
          class: "separator-inner",
          style: normalizeStyle({ backgroundColor: getSeparatorColor() })
        }, null, 4)
      ]);
    };
  }
};
const ToolbarSeparator = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["__scopeId", "data-v-4ef9aa18"]]);
const _hoisted_1$1 = { class: "overflow-menu" };
const _hoisted_2$1 = { class: "overflow-menu-trigger" };
const _hoisted_3$1 = {
  key: 0,
  class: "overflow-menu_items",
  role: "group"
};
const _sfc_main$2 = {
  __name: "OverflowMenu",
  props: {
    toolbarItem: {
      type: Object,
      required: true
    },
    overflowItems: {
      type: Array,
      required: true
    }
  },
  emits: ["buttonClick"],
  setup(__props, { emit: __emit }) {
    const { proxy } = getCurrentInstance();
    const emit = __emit;
    const props = __props;
    const isDropdownOpened = computed(() => props.toolbarItem.expand.value);
    const overflowToolbarItem = computed(() => ({
      ...props.toolbarItem,
      active: isDropdownOpened.value
    }));
    const toggleOverflowMenu = () => {
      emit("buttonClick", props.toolbarItem);
    };
    const handleCommand = ({ item, argument }) => {
      proxy.$toolbar.emitCommand({ item, argument });
    };
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$1, [
        createElementVNode("div", _hoisted_2$1, [
          createVNode(ToolbarButton, {
            "toolbar-item": overflowToolbarItem.value,
            onButtonClick: toggleOverflowMenu
          }, null, 8, ["toolbar-item"])
        ]),
        isDropdownOpened.value ? (openBlock(), createElementBlock("div", _hoisted_3$1, [
          createVNode(ButtonGroup, {
            class: "superdoc-toolbar-overflow",
            "toolbar-items": __props.overflowItems,
            "from-overflow": "",
            onCommand: handleCommand
          }, null, 8, ["toolbar-items"])
        ])) : createCommentVNode("", true)
      ]);
    };
  }
};
const OverflowMenu = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-8bf2f427"]]);
function plugin$1(options) {
  let _bPrefix = ".";
  let _ePrefix = "__";
  let _mPrefix = "--";
  let c2;
  if (options) {
    let t = options.blockPrefix;
    if (t) {
      _bPrefix = t;
    }
    t = options.elementPrefix;
    if (t) {
      _ePrefix = t;
    }
    t = options.modifierPrefix;
    if (t) {
      _mPrefix = t;
    }
  }
  const _plugin = {
    install(instance) {
      c2 = instance.c;
      const ctx2 = instance.context;
      ctx2.bem = {};
      ctx2.bem.b = null;
      ctx2.bem.els = null;
    }
  };
  function b(arg) {
    let memorizedB;
    let memorizedE;
    return {
      before(ctx2) {
        memorizedB = ctx2.bem.b;
        memorizedE = ctx2.bem.els;
        ctx2.bem.els = null;
      },
      after(ctx2) {
        ctx2.bem.b = memorizedB;
        ctx2.bem.els = memorizedE;
      },
      $({ context, props }) {
        arg = typeof arg === "string" ? arg : arg({ context, props });
        context.bem.b = arg;
        return `${(props === null || props === void 0 ? void 0 : props.bPrefix) || _bPrefix}${context.bem.b}`;
      }
    };
  }
  function e(arg) {
    let memorizedE;
    return {
      before(ctx2) {
        memorizedE = ctx2.bem.els;
      },
      after(ctx2) {
        ctx2.bem.els = memorizedE;
      },
      $({ context, props }) {
        arg = typeof arg === "string" ? arg : arg({ context, props });
        context.bem.els = arg.split(",").map((v) => v.trim());
        return context.bem.els.map((el) => `${(props === null || props === void 0 ? void 0 : props.bPrefix) || _bPrefix}${context.bem.b}${_ePrefix}${el}`).join(", ");
      }
    };
  }
  function m(arg) {
    return {
      $({ context, props }) {
        arg = typeof arg === "string" ? arg : arg({ context, props });
        const modifiers = arg.split(",").map((v) => v.trim());
        function elementToSelector(el) {
          return modifiers.map((modifier) => `&${(props === null || props === void 0 ? void 0 : props.bPrefix) || _bPrefix}${context.bem.b}${el !== void 0 ? `${_ePrefix}${el}` : ""}${_mPrefix}${modifier}`).join(", ");
        }
        const els = context.bem.els;
        if (els !== null) {
          if (process$1.env.NODE_ENV !== "production" && els.length >= 2) {
            throw Error(`[css-render/plugin-bem]: m(${arg}) is invalid, using modifier inside multiple elements is not allowed`);
          }
          return elementToSelector(els[0]);
        } else {
          return elementToSelector();
        }
      }
    };
  }
  function notM(arg) {
    return {
      $({ context, props }) {
        arg = typeof arg === "string" ? arg : arg({ context, props });
        const els = context.bem.els;
        if (process$1.env.NODE_ENV !== "production" && els !== null && els.length >= 2) {
          throw Error(`[css-render/plugin-bem]: notM(${arg}) is invalid, using modifier inside multiple elements is not allowed`);
        }
        return `&:not(${(props === null || props === void 0 ? void 0 : props.bPrefix) || _bPrefix}${context.bem.b}${els !== null && els.length > 0 ? `${_ePrefix}${els[0]}` : ""}${_mPrefix}${arg})`;
      }
    };
  }
  const cB2 = ((...args) => c2(b(args[0]), args[1], args[2]));
  const cE2 = ((...args) => c2(e(args[0]), args[1], args[2]));
  const cM2 = ((...args) => c2(m(args[0]), args[1], args[2]));
  const cNotM2 = ((...args) => c2(notM(args[0]), args[1], args[2]));
  Object.assign(_plugin, {
    cB: cB2,
    cE: cE2,
    cM: cM2,
    cNotM: cNotM2
  });
  return _plugin;
}
function ampCount(selector) {
  let cnt = 0;
  for (let i = 0; i < selector.length; ++i) {
    if (selector[i] === "&")
      ++cnt;
  }
  return cnt;
}
const separatorRegex = /\s*,(?![^(]*\))\s*/g;
const extraSpaceRegex = /\s+/g;
function resolveSelectorWithAmp(amp, selector) {
  const nextAmp = [];
  selector.split(separatorRegex).forEach((partialSelector) => {
    let round = ampCount(partialSelector);
    if (!round) {
      amp.forEach((partialAmp) => {
        nextAmp.push(
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          (partialAmp && partialAmp + " ") + partialSelector
        );
      });
      return;
    } else if (round === 1) {
      amp.forEach((partialAmp) => {
        nextAmp.push(partialSelector.replace("&", partialAmp));
      });
      return;
    }
    let partialNextAmp = [
      partialSelector
    ];
    while (round--) {
      const nextPartialNextAmp = [];
      partialNextAmp.forEach((selectorItr) => {
        amp.forEach((partialAmp) => {
          nextPartialNextAmp.push(selectorItr.replace("&", partialAmp));
        });
      });
      partialNextAmp = nextPartialNextAmp;
    }
    partialNextAmp.forEach((part) => nextAmp.push(part));
  });
  return nextAmp;
}
function resolveSelector(amp, selector) {
  const nextAmp = [];
  selector.split(separatorRegex).forEach((partialSelector) => {
    amp.forEach((partialAmp) => {
      nextAmp.push((partialAmp && partialAmp + " ") + partialSelector);
    });
  });
  return nextAmp;
}
function parseSelectorPath(selectorPaths) {
  let amp = [""];
  selectorPaths.forEach((selector) => {
    selector = selector && selector.trim();
    if (
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      !selector
    ) {
      return;
    }
    if (selector.includes("&")) {
      amp = resolveSelectorWithAmp(amp, selector);
    } else {
      amp = resolveSelector(amp, selector);
    }
  });
  return amp.join(", ").replace(extraSpaceRegex, " ");
}
function removeElement(el) {
  if (!el)
    return;
  const parentElement = el.parentElement;
  if (parentElement)
    parentElement.removeChild(el);
}
function queryElement(id, parent) {
  return (parent !== null && parent !== void 0 ? parent : document.head).querySelector(`style[cssr-id="${id}"]`);
}
function createElement(id) {
  const el = document.createElement("style");
  el.setAttribute("cssr-id", id);
  return el;
}
function isMediaOrSupports(selector) {
  if (!selector)
    return false;
  return /^\s*@(s|m)/.test(selector);
}
const kebabRegex = /[A-Z]/g;
function kebabCase(pattern) {
  return pattern.replace(kebabRegex, (match) => "-" + match.toLowerCase());
}
function unwrapProperty(prop, indent = "  ") {
  if (typeof prop === "object" && prop !== null) {
    return " {\n" + Object.entries(prop).map((v) => {
      return indent + `  ${kebabCase(v[0])}: ${v[1]};`;
    }).join("\n") + "\n" + indent + "}";
  }
  return `: ${prop};`;
}
function unwrapProperties(props, instance, params) {
  if (typeof props === "function") {
    return props({
      context: instance.context,
      props: params
    });
  }
  return props;
}
function createStyle(selector, props, instance, params) {
  if (!props)
    return "";
  const unwrappedProps = unwrapProperties(props, instance, params);
  if (!unwrappedProps)
    return "";
  if (typeof unwrappedProps === "string") {
    return `${selector} {
${unwrappedProps}
}`;
  }
  const propertyNames = Object.keys(unwrappedProps);
  if (propertyNames.length === 0) {
    if (instance.config.keepEmptyBlock)
      return selector + " {\n}";
    return "";
  }
  const statements = selector ? [
    selector + " {"
  ] : [];
  propertyNames.forEach((propertyName) => {
    const property2 = unwrappedProps[propertyName];
    if (propertyName === "raw") {
      statements.push("\n" + property2 + "\n");
      return;
    }
    propertyName = kebabCase(propertyName);
    if (property2 !== null && property2 !== void 0) {
      statements.push(`  ${propertyName}${unwrapProperty(property2)}`);
    }
  });
  if (selector) {
    statements.push("}");
  }
  return statements.join("\n");
}
function loopCNodeListWithCallback(children, options, callback) {
  if (!children)
    return;
  children.forEach((child) => {
    if (Array.isArray(child)) {
      loopCNodeListWithCallback(child, options, callback);
    } else if (typeof child === "function") {
      const grandChildren = child(options);
      if (Array.isArray(grandChildren)) {
        loopCNodeListWithCallback(grandChildren, options, callback);
      } else if (grandChildren) {
        callback(grandChildren);
      }
    } else if (child) {
      callback(child);
    }
  });
}
function traverseCNode(node, selectorPaths, styles, instance, params) {
  const $ = node.$;
  let blockSelector = "";
  if (!$ || typeof $ === "string") {
    if (isMediaOrSupports($)) {
      blockSelector = $;
    } else {
      selectorPaths.push($);
    }
  } else if (typeof $ === "function") {
    const selector2 = $({
      context: instance.context,
      props: params
    });
    if (isMediaOrSupports(selector2)) {
      blockSelector = selector2;
    } else {
      selectorPaths.push(selector2);
    }
  } else {
    if ($.before)
      $.before(instance.context);
    if (!$.$ || typeof $.$ === "string") {
      if (isMediaOrSupports($.$)) {
        blockSelector = $.$;
      } else {
        selectorPaths.push($.$);
      }
    } else if ($.$) {
      const selector2 = $.$({
        context: instance.context,
        props: params
      });
      if (isMediaOrSupports(selector2)) {
        blockSelector = selector2;
      } else {
        selectorPaths.push(selector2);
      }
    }
  }
  const selector = parseSelectorPath(selectorPaths);
  const style2 = createStyle(selector, node.props, instance, params);
  if (blockSelector) {
    styles.push(`${blockSelector} {`);
  } else if (style2.length) {
    styles.push(style2);
  }
  if (node.children) {
    loopCNodeListWithCallback(node.children, {
      context: instance.context,
      props: params
    }, (childNode) => {
      if (typeof childNode === "string") {
        const style3 = createStyle(selector, { raw: childNode }, instance, params);
        styles.push(style3);
      } else {
        traverseCNode(childNode, selectorPaths, styles, instance, params);
      }
    });
  }
  selectorPaths.pop();
  if (blockSelector) {
    styles.push("}");
  }
  if ($ && $.after)
    $.after(instance.context);
}
function render$1(node, instance, props) {
  const styles = [];
  traverseCNode(node, [], styles, instance, props);
  return styles.join("\n\n");
}
function murmur2(str) {
  var h2 = 0;
  var k, i = 0, len = str.length;
  for (; len >= 4; ++i, len -= 4) {
    k = str.charCodeAt(i) & 255 | (str.charCodeAt(++i) & 255) << 8 | (str.charCodeAt(++i) & 255) << 16 | (str.charCodeAt(++i) & 255) << 24;
    k = /* Math.imul(k, m): */
    (k & 65535) * 1540483477 + ((k >>> 16) * 59797 << 16);
    k ^= /* k >>> r: */
    k >>> 24;
    h2 = /* Math.imul(k, m): */
    (k & 65535) * 1540483477 + ((k >>> 16) * 59797 << 16) ^ /* Math.imul(h, m): */
    (h2 & 65535) * 1540483477 + ((h2 >>> 16) * 59797 << 16);
  }
  switch (len) {
    case 3:
      h2 ^= (str.charCodeAt(i + 2) & 255) << 16;
    case 2:
      h2 ^= (str.charCodeAt(i + 1) & 255) << 8;
    case 1:
      h2 ^= str.charCodeAt(i) & 255;
      h2 = /* Math.imul(h, m): */
      (h2 & 65535) * 1540483477 + ((h2 >>> 16) * 59797 << 16);
  }
  h2 ^= h2 >>> 13;
  h2 = /* Math.imul(h, m): */
  (h2 & 65535) * 1540483477 + ((h2 >>> 16) * 59797 << 16);
  return ((h2 ^ h2 >>> 15) >>> 0).toString(36);
}
if (typeof window !== "undefined") {
  window.__cssrContext = {};
}
function unmount(instance, node, id, parent) {
  const { els } = node;
  if (id === void 0) {
    els.forEach(removeElement);
    node.els = [];
  } else {
    const target = queryElement(id, parent);
    if (target && els.includes(target)) {
      removeElement(target);
      node.els = els.filter((el) => el !== target);
    }
  }
}
function addElementToList(els, target) {
  els.push(target);
}
function mount(instance, node, id, props, head, force, anchorMetaName, parent, ssrAdapter2) {
  let style2;
  if (id === void 0) {
    style2 = node.render(props);
    id = murmur2(style2);
  }
  if (ssrAdapter2) {
    ssrAdapter2.adapter(id, style2 !== null && style2 !== void 0 ? style2 : node.render(props));
    return;
  }
  if (parent === void 0) {
    parent = document.head;
  }
  const queriedTarget = queryElement(id, parent);
  if (queriedTarget !== null && !force) {
    return queriedTarget;
  }
  const target = queriedTarget !== null && queriedTarget !== void 0 ? queriedTarget : createElement(id);
  if (style2 === void 0)
    style2 = node.render(props);
  target.textContent = style2;
  if (queriedTarget !== null)
    return queriedTarget;
  if (anchorMetaName) {
    const anchorMetaEl = parent.querySelector(`meta[name="${anchorMetaName}"]`);
    if (anchorMetaEl) {
      parent.insertBefore(target, anchorMetaEl);
      addElementToList(node.els, target);
      return target;
    }
  }
  if (head) {
    parent.insertBefore(target, parent.querySelector("style, link"));
  } else {
    parent.appendChild(target);
  }
  addElementToList(node.els, target);
  return target;
}
function wrappedRender(props) {
  return render$1(this, this.instance, props);
}
function wrappedMount(options = {}) {
  const { id, ssr, props, head = false, force = false, anchorMetaName, parent } = options;
  const targetElement = mount(this.instance, this, id, props, head, force, anchorMetaName, parent, ssr);
  return targetElement;
}
function wrappedUnmount(options = {}) {
  const { id, parent } = options;
  unmount(this.instance, this, id, parent);
}
const createCNode = function(instance, $, props, children) {
  return {
    instance,
    $,
    props,
    children,
    els: [],
    render: wrappedRender,
    mount: wrappedMount,
    unmount: wrappedUnmount
  };
};
const c$2 = function(instance, $, props, children) {
  if (Array.isArray($)) {
    return createCNode(instance, { $: null }, null, $);
  } else if (Array.isArray(props)) {
    return createCNode(instance, $, null, props);
  } else if (Array.isArray(children)) {
    return createCNode(instance, $, props, children);
  } else {
    return createCNode(instance, $, props, null);
  }
};
function CssRender(config = {}) {
  const cssr2 = {
    c: ((...args) => c$2(cssr2, ...args)),
    use: (plugin2, ...args) => plugin2.install(cssr2, ...args),
    find: queryElement,
    context: {},
    config
  };
  return cssr2;
}
function exists(id, ssr) {
  if (id === void 0)
    return false;
  if (ssr) {
    const { context: { ids } } = ssr;
    return ids.has(id);
  }
  return queryElement(id) !== null;
}
const namespace = "n";
const prefix$1 = `.${namespace}-`;
const elementPrefix = "__";
const modifierPrefix = "--";
const cssr = CssRender();
const plugin = plugin$1({
  blockPrefix: prefix$1,
  elementPrefix,
  modifierPrefix
});
cssr.use(plugin);
const {
  c: c$1,
  find
} = cssr;
const {
  cB,
  cE,
  cM,
  cNotM
} = plugin;
const cCB = (...args) => {
  return c$1(">", [cB(...args)]);
};
function createKey(prefix2, suffix2) {
  return prefix2 + (suffix2 === "default" ? "" : suffix2.replace(/^[a-z]/, (startChar) => startChar.toUpperCase()));
}
let onceCbs = [];
const paramsMap = /* @__PURE__ */ new WeakMap();
function flushOnceCallbacks() {
  onceCbs.forEach((cb) => cb(...paramsMap.get(cb)));
  onceCbs = [];
}
function beforeNextFrameOnce(cb, ...params) {
  paramsMap.set(cb, params);
  if (onceCbs.includes(cb))
    return;
  onceCbs.push(cb) === 1 && requestAnimationFrame(flushOnceCallbacks);
}
function happensIn(e, dataSetPropName) {
  let { target } = e;
  while (target) {
    if (target.dataset) {
      if (target.dataset[dataSetPropName] !== void 0)
        return true;
    }
    target = target.parentElement;
  }
  return false;
}
function getPreciseEventTarget(event) {
  return event.composedPath()[0] || null;
}
function depx(value) {
  if (typeof value === "string") {
    if (value.endsWith("px")) {
      return Number(value.slice(0, value.length - 2));
    }
    return Number(value);
  }
  return value;
}
function pxfy(value) {
  if (value === void 0 || value === null)
    return void 0;
  if (typeof value === "number")
    return `${value}px`;
  if (value.endsWith("px"))
    return value;
  return `${value}px`;
}
function getMargin(value, position) {
  const parts = value.trim().split(/\s+/g);
  const margin = {
    top: parts[0]
  };
  switch (parts.length) {
    case 1:
      margin.right = parts[0];
      margin.bottom = parts[0];
      margin.left = parts[0];
      break;
    case 2:
      margin.right = parts[1];
      margin.left = parts[1];
      margin.bottom = parts[0];
      break;
    case 3:
      margin.right = parts[1];
      margin.bottom = parts[2];
      margin.left = parts[1];
      break;
    case 4:
      margin.right = parts[1];
      margin.bottom = parts[2];
      margin.left = parts[3];
      break;
    default:
      throw new Error("[seemly/getMargin]:" + value + " is not a valid value.");
  }
  return margin;
}
const colors = {
  aliceblue: "#F0F8FF",
  antiquewhite: "#FAEBD7",
  aqua: "#0FF",
  aquamarine: "#7FFFD4",
  azure: "#F0FFFF",
  beige: "#F5F5DC",
  bisque: "#FFE4C4",
  black: "#000",
  blanchedalmond: "#FFEBCD",
  blue: "#00F",
  blueviolet: "#8A2BE2",
  brown: "#A52A2A",
  burlywood: "#DEB887",
  cadetblue: "#5F9EA0",
  chartreuse: "#7FFF00",
  chocolate: "#D2691E",
  coral: "#FF7F50",
  cornflowerblue: "#6495ED",
  cornsilk: "#FFF8DC",
  crimson: "#DC143C",
  cyan: "#0FF",
  darkblue: "#00008B",
  darkcyan: "#008B8B",
  darkgoldenrod: "#B8860B",
  darkgray: "#A9A9A9",
  darkgrey: "#A9A9A9",
  darkgreen: "#006400",
  darkkhaki: "#BDB76B",
  darkmagenta: "#8B008B",
  darkolivegreen: "#556B2F",
  darkorange: "#FF8C00",
  darkorchid: "#9932CC",
  darkred: "#8B0000",
  darksalmon: "#E9967A",
  darkseagreen: "#8FBC8F",
  darkslateblue: "#483D8B",
  darkslategray: "#2F4F4F",
  darkslategrey: "#2F4F4F",
  darkturquoise: "#00CED1",
  darkviolet: "#9400D3",
  deeppink: "#FF1493",
  deepskyblue: "#00BFFF",
  dimgray: "#696969",
  dimgrey: "#696969",
  dodgerblue: "#1E90FF",
  firebrick: "#B22222",
  floralwhite: "#FFFAF0",
  forestgreen: "#228B22",
  fuchsia: "#F0F",
  gainsboro: "#DCDCDC",
  ghostwhite: "#F8F8FF",
  gold: "#FFD700",
  goldenrod: "#DAA520",
  gray: "#808080",
  grey: "#808080",
  green: "#008000",
  greenyellow: "#ADFF2F",
  honeydew: "#F0FFF0",
  hotpink: "#FF69B4",
  indianred: "#CD5C5C",
  indigo: "#4B0082",
  ivory: "#FFFFF0",
  khaki: "#F0E68C",
  lavender: "#E6E6FA",
  lavenderblush: "#FFF0F5",
  lawngreen: "#7CFC00",
  lemonchiffon: "#FFFACD",
  lightblue: "#ADD8E6",
  lightcoral: "#F08080",
  lightcyan: "#E0FFFF",
  lightgoldenrodyellow: "#FAFAD2",
  lightgray: "#D3D3D3",
  lightgrey: "#D3D3D3",
  lightgreen: "#90EE90",
  lightpink: "#FFB6C1",
  lightsalmon: "#FFA07A",
  lightseagreen: "#20B2AA",
  lightskyblue: "#87CEFA",
  lightslategray: "#778899",
  lightslategrey: "#778899",
  lightsteelblue: "#B0C4DE",
  lightyellow: "#FFFFE0",
  lime: "#0F0",
  limegreen: "#32CD32",
  linen: "#FAF0E6",
  magenta: "#F0F",
  maroon: "#800000",
  mediumaquamarine: "#66CDAA",
  mediumblue: "#0000CD",
  mediumorchid: "#BA55D3",
  mediumpurple: "#9370DB",
  mediumseagreen: "#3CB371",
  mediumslateblue: "#7B68EE",
  mediumspringgreen: "#00FA9A",
  mediumturquoise: "#48D1CC",
  mediumvioletred: "#C71585",
  midnightblue: "#191970",
  mintcream: "#F5FFFA",
  mistyrose: "#FFE4E1",
  moccasin: "#FFE4B5",
  navajowhite: "#FFDEAD",
  navy: "#000080",
  oldlace: "#FDF5E6",
  olive: "#808000",
  olivedrab: "#6B8E23",
  orange: "#FFA500",
  orangered: "#FF4500",
  orchid: "#DA70D6",
  palegoldenrod: "#EEE8AA",
  palegreen: "#98FB98",
  paleturquoise: "#AFEEEE",
  palevioletred: "#DB7093",
  papayawhip: "#FFEFD5",
  peachpuff: "#FFDAB9",
  peru: "#CD853F",
  pink: "#FFC0CB",
  plum: "#DDA0DD",
  powderblue: "#B0E0E6",
  purple: "#800080",
  rebeccapurple: "#663399",
  red: "#F00",
  rosybrown: "#BC8F8F",
  royalblue: "#4169E1",
  saddlebrown: "#8B4513",
  salmon: "#FA8072",
  sandybrown: "#F4A460",
  seagreen: "#2E8B57",
  seashell: "#FFF5EE",
  sienna: "#A0522D",
  silver: "#C0C0C0",
  skyblue: "#87CEEB",
  slateblue: "#6A5ACD",
  slategray: "#708090",
  slategrey: "#708090",
  snow: "#FFFAFA",
  springgreen: "#00FF7F",
  steelblue: "#4682B4",
  tan: "#D2B48C",
  teal: "#008080",
  thistle: "#D8BFD8",
  tomato: "#FF6347",
  turquoise: "#40E0D0",
  violet: "#EE82EE",
  wheat: "#F5DEB3",
  white: "#FFF",
  whitesmoke: "#F5F5F5",
  yellow: "#FF0",
  yellowgreen: "#9ACD32",
  transparent: "#0000"
};
function hsv2rgb(h2, s, v) {
  s /= 100;
  v /= 100;
  let f = (n, k = (n + h2 / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  return [f(5) * 255, f(3) * 255, f(1) * 255];
}
function hsl2rgb(h2, s, l) {
  s /= 100;
  l /= 100;
  let a = s * Math.min(l, 1 - l);
  let f = (n, k = (n + h2 / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}
const prefix = "^\\s*";
const suffix = "\\s*$";
const percent = "\\s*((\\.\\d+)|(\\d+(\\.\\d*)?))%\\s*";
const float = "\\s*((\\.\\d+)|(\\d+(\\.\\d*)?))\\s*";
const hex = "([0-9A-Fa-f])";
const dhex = "([0-9A-Fa-f]{2})";
const hslRegex = new RegExp(`${prefix}hsl\\s*\\(${float},${percent},${percent}\\)${suffix}`);
const hsvRegex = new RegExp(`${prefix}hsv\\s*\\(${float},${percent},${percent}\\)${suffix}`);
const hslaRegex = new RegExp(`${prefix}hsla\\s*\\(${float},${percent},${percent},${float}\\)${suffix}`);
const hsvaRegex = new RegExp(`${prefix}hsva\\s*\\(${float},${percent},${percent},${float}\\)${suffix}`);
const rgbRegex = new RegExp(`${prefix}rgb\\s*\\(${float},${float},${float}\\)${suffix}`);
const rgbaRegex = new RegExp(`${prefix}rgba\\s*\\(${float},${float},${float},${float}\\)${suffix}`);
const sHexRegex = new RegExp(`${prefix}#${hex}${hex}${hex}${suffix}`);
const hexRegex = new RegExp(`${prefix}#${dhex}${dhex}${dhex}${suffix}`);
const sHexaRegex = new RegExp(`${prefix}#${hex}${hex}${hex}${hex}${suffix}`);
const hexaRegex = new RegExp(`${prefix}#${dhex}${dhex}${dhex}${dhex}${suffix}`);
function parseHex(value) {
  return parseInt(value, 16);
}
function hsla(color) {
  try {
    let i;
    if (i = hslaRegex.exec(color)) {
      return [
        roundDeg(i[1]),
        roundPercent(i[5]),
        roundPercent(i[9]),
        roundAlpha(i[13])
      ];
    } else if (i = hslRegex.exec(color)) {
      return [roundDeg(i[1]), roundPercent(i[5]), roundPercent(i[9]), 1];
    }
    throw new Error(`[seemly/hsla]: Invalid color value ${color}.`);
  } catch (e) {
    throw e;
  }
}
function hsva(color) {
  try {
    let i;
    if (i = hsvaRegex.exec(color)) {
      return [
        roundDeg(i[1]),
        roundPercent(i[5]),
        roundPercent(i[9]),
        roundAlpha(i[13])
      ];
    } else if (i = hsvRegex.exec(color)) {
      return [roundDeg(i[1]), roundPercent(i[5]), roundPercent(i[9]), 1];
    }
    throw new Error(`[seemly/hsva]: Invalid color value ${color}.`);
  } catch (e) {
    throw e;
  }
}
function rgba(color) {
  try {
    let i;
    if (i = hexRegex.exec(color)) {
      return [parseHex(i[1]), parseHex(i[2]), parseHex(i[3]), 1];
    } else if (i = rgbRegex.exec(color)) {
      return [roundChannel(i[1]), roundChannel(i[5]), roundChannel(i[9]), 1];
    } else if (i = rgbaRegex.exec(color)) {
      return [
        roundChannel(i[1]),
        roundChannel(i[5]),
        roundChannel(i[9]),
        roundAlpha(i[13])
      ];
    } else if (i = sHexRegex.exec(color)) {
      return [
        parseHex(i[1] + i[1]),
        parseHex(i[2] + i[2]),
        parseHex(i[3] + i[3]),
        1
      ];
    } else if (i = hexaRegex.exec(color)) {
      return [
        parseHex(i[1]),
        parseHex(i[2]),
        parseHex(i[3]),
        roundAlpha(parseHex(i[4]) / 255)
      ];
    } else if (i = sHexaRegex.exec(color)) {
      return [
        parseHex(i[1] + i[1]),
        parseHex(i[2] + i[2]),
        parseHex(i[3] + i[3]),
        roundAlpha(parseHex(i[4] + i[4]) / 255)
      ];
    } else if (color in colors) {
      return rgba(colors[color]);
    } else if (hslRegex.test(color) || hslaRegex.test(color)) {
      const [h2, s, l, a] = hsla(color);
      return [...hsl2rgb(h2, s, l), a];
    } else if (hsvRegex.test(color) || hsvaRegex.test(color)) {
      const [h2, s, v, a] = hsva(color);
      return [...hsv2rgb(h2, s, v), a];
    }
    throw new Error(`[seemly/rgba]: Invalid color value ${color}.`);
  } catch (e) {
    throw e;
  }
}
function normalizeAlpha(alphaValue) {
  return alphaValue > 1 ? 1 : alphaValue < 0 ? 0 : alphaValue;
}
function stringifyRgba(r, g, b, a) {
  return `rgba(${roundChannel(r)}, ${roundChannel(g)}, ${roundChannel(b)}, ${normalizeAlpha(a)})`;
}
function compositeChannel(v1, a1, v2, a2, a) {
  return roundChannel((v1 * a1 * (1 - a2) + v2 * a2) / a);
}
function composite(background, overlay2) {
  if (!Array.isArray(background))
    background = rgba(background);
  if (!Array.isArray(overlay2))
    overlay2 = rgba(overlay2);
  const a1 = background[3];
  const a2 = overlay2[3];
  const alpha = roundAlpha(a1 + a2 - a1 * a2);
  return stringifyRgba(compositeChannel(background[0], a1, overlay2[0], a2, alpha), compositeChannel(background[1], a1, overlay2[1], a2, alpha), compositeChannel(background[2], a1, overlay2[2], a2, alpha), alpha);
}
function changeColor(base2, options) {
  const [r, g, b, a = 1] = Array.isArray(base2) ? base2 : rgba(base2);
  if (typeof options.alpha === "number") {
    return stringifyRgba(r, g, b, options.alpha);
  }
  return stringifyRgba(r, g, b, a);
}
function scaleColor(base2, options) {
  const [r, g, b, a = 1] = Array.isArray(base2) ? base2 : rgba(base2);
  const { lightness = 1, alpha = 1 } = options;
  return toRgbaString([r * lightness, g * lightness, b * lightness, a * alpha]);
}
function roundAlpha(value) {
  const v = Math.round(Number(value) * 100) / 100;
  if (v > 1)
    return 1;
  if (v < 0)
    return 0;
  return v;
}
function roundDeg(value) {
  const v = Math.round(Number(value));
  if (v >= 360)
    return 0;
  if (v < 0)
    return 0;
  return v;
}
function roundChannel(value) {
  const v = Math.round(Number(value));
  if (v > 255)
    return 255;
  if (v < 0)
    return 0;
  return v;
}
function roundPercent(value) {
  const v = Math.round(Number(value));
  if (v > 100)
    return 100;
  if (v < 0)
    return 0;
  return v;
}
function toRgbaString(base2) {
  const [r, g, b] = base2;
  if (3 in base2) {
    return `rgba(${roundChannel(r)}, ${roundChannel(g)}, ${roundChannel(b)}, ${roundAlpha(base2[3])})`;
  }
  return `rgba(${roundChannel(r)}, ${roundChannel(g)}, ${roundChannel(b)}, 1)`;
}
function createId(length = 8) {
  return Math.random().toString(16).slice(2, 2 + length);
}
function repeat(count, v) {
  const ret = [];
  for (let i = 0; i < count; ++i) {
    ret.push(v);
  }
  return ret;
}
function getEventTarget(e) {
  const path = e.composedPath();
  return path[0];
}
const traps = {
  mousemoveoutside: /* @__PURE__ */ new WeakMap(),
  clickoutside: /* @__PURE__ */ new WeakMap()
};
function createTrapHandler(name, el, originalHandler) {
  if (name === "mousemoveoutside") {
    const moveHandler = (e) => {
      if (el.contains(getEventTarget(e)))
        return;
      originalHandler(e);
    };
    return {
      mousemove: moveHandler,
      touchstart: moveHandler
    };
  } else if (name === "clickoutside") {
    let mouseDownOutside = false;
    const downHandler = (e) => {
      mouseDownOutside = !el.contains(getEventTarget(e));
    };
    const upHanlder = (e) => {
      if (!mouseDownOutside)
        return;
      if (el.contains(getEventTarget(e)))
        return;
      originalHandler(e);
    };
    return {
      mousedown: downHandler,
      mouseup: upHanlder,
      touchstart: downHandler,
      touchend: upHanlder
    };
  }
  console.error(
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    `[evtd/create-trap-handler]: name \`${name}\` is invalid. This could be a bug of evtd.`
  );
  return {};
}
function ensureTrapHandlers(name, el, handler) {
  const handlers = traps[name];
  let elHandlers = handlers.get(el);
  if (elHandlers === void 0) {
    handlers.set(el, elHandlers = /* @__PURE__ */ new WeakMap());
  }
  let trapHandler = elHandlers.get(handler);
  if (trapHandler === void 0) {
    elHandlers.set(handler, trapHandler = createTrapHandler(name, el, handler));
  }
  return trapHandler;
}
function trapOn(name, el, handler, options) {
  if (name === "mousemoveoutside" || name === "clickoutside") {
    const trapHandlers = ensureTrapHandlers(name, el, handler);
    Object.keys(trapHandlers).forEach((key) => {
      on(key, document, trapHandlers[key], options);
    });
    return true;
  }
  return false;
}
function trapOff(name, el, handler, options) {
  if (name === "mousemoveoutside" || name === "clickoutside") {
    const trapHandlers = ensureTrapHandlers(name, el, handler);
    Object.keys(trapHandlers).forEach((key) => {
      off(key, document, trapHandlers[key], options);
    });
    return true;
  }
  return false;
}
function createDelegate() {
  if (typeof window === "undefined") {
    return {
      on: () => {
      },
      off: () => {
      }
    };
  }
  const propagationStopped = /* @__PURE__ */ new WeakMap();
  const immediatePropagationStopped = /* @__PURE__ */ new WeakMap();
  function trackPropagation() {
    propagationStopped.set(this, true);
  }
  function trackImmediate() {
    propagationStopped.set(this, true);
    immediatePropagationStopped.set(this, true);
  }
  function spy(event, propName, fn) {
    const source = event[propName];
    event[propName] = function() {
      fn.apply(event, arguments);
      return source.apply(event, arguments);
    };
    return event;
  }
  function unspy(event, propName) {
    event[propName] = Event.prototype[propName];
  }
  const currentTargets = /* @__PURE__ */ new WeakMap();
  const currentTargetDescriptor = Object.getOwnPropertyDescriptor(Event.prototype, "currentTarget");
  function getCurrentTarget() {
    var _a;
    return (_a = currentTargets.get(this)) !== null && _a !== void 0 ? _a : null;
  }
  function defineCurrentTarget(event, getter) {
    if (currentTargetDescriptor === void 0)
      return;
    Object.defineProperty(event, "currentTarget", {
      configurable: true,
      enumerable: true,
      get: getter !== null && getter !== void 0 ? getter : currentTargetDescriptor.get
    });
  }
  const phaseToTypeToElToHandlers = {
    bubble: {},
    capture: {}
  };
  const typeToWindowEventHandlers = {};
  function createUnifiedHandler() {
    const delegeteHandler = function(e) {
      const { type, eventPhase, bubbles } = e;
      const target = getEventTarget(e);
      if (eventPhase === 2)
        return;
      const phase = eventPhase === 1 ? "capture" : "bubble";
      let cursor = target;
      const path = [];
      while (true) {
        if (cursor === null)
          cursor = window;
        path.push(cursor);
        if (cursor === window) {
          break;
        }
        cursor = cursor.parentNode || null;
      }
      const captureElToHandlers = phaseToTypeToElToHandlers.capture[type];
      const bubbleElToHandlers = phaseToTypeToElToHandlers.bubble[type];
      spy(e, "stopPropagation", trackPropagation);
      spy(e, "stopImmediatePropagation", trackImmediate);
      defineCurrentTarget(e, getCurrentTarget);
      if (phase === "capture") {
        if (captureElToHandlers === void 0)
          return;
        for (let i = path.length - 1; i >= 0; --i) {
          if (propagationStopped.has(e))
            break;
          const target2 = path[i];
          const handlers = captureElToHandlers.get(target2);
          if (handlers !== void 0) {
            currentTargets.set(e, target2);
            for (const handler of handlers) {
              if (immediatePropagationStopped.has(e))
                break;
              handler(e);
            }
          }
          if (i === 0 && !bubbles && bubbleElToHandlers !== void 0) {
            const bubbleHandlers = bubbleElToHandlers.get(target2);
            if (bubbleHandlers !== void 0) {
              for (const handler of bubbleHandlers) {
                if (immediatePropagationStopped.has(e))
                  break;
                handler(e);
              }
            }
          }
        }
      } else if (phase === "bubble") {
        if (bubbleElToHandlers === void 0)
          return;
        for (let i = 0; i < path.length; ++i) {
          if (propagationStopped.has(e))
            break;
          const target2 = path[i];
          const handlers = bubbleElToHandlers.get(target2);
          if (handlers !== void 0) {
            currentTargets.set(e, target2);
            for (const handler of handlers) {
              if (immediatePropagationStopped.has(e))
                break;
              handler(e);
            }
          }
        }
      }
      unspy(e, "stopPropagation");
      unspy(e, "stopImmediatePropagation");
      defineCurrentTarget(e);
    };
    delegeteHandler.displayName = "evtdUnifiedHandler";
    return delegeteHandler;
  }
  function createUnifiedWindowEventHandler() {
    const delegateHandler = function(e) {
      const { type, eventPhase } = e;
      if (eventPhase !== 2)
        return;
      const handlers = typeToWindowEventHandlers[type];
      if (handlers === void 0)
        return;
      handlers.forEach((handler) => handler(e));
    };
    delegateHandler.displayName = "evtdUnifiedWindowEventHandler";
    return delegateHandler;
  }
  const unifiedHandler = createUnifiedHandler();
  const unfiendWindowEventHandler = createUnifiedWindowEventHandler();
  function ensureElToHandlers(phase, type) {
    const phaseHandlers = phaseToTypeToElToHandlers[phase];
    if (phaseHandlers[type] === void 0) {
      phaseHandlers[type] = /* @__PURE__ */ new Map();
      window.addEventListener(type, unifiedHandler, phase === "capture");
    }
    return phaseHandlers[type];
  }
  function ensureWindowEventHandlers(type) {
    const windowEventHandlers = typeToWindowEventHandlers[type];
    if (windowEventHandlers === void 0) {
      typeToWindowEventHandlers[type] = /* @__PURE__ */ new Set();
      window.addEventListener(type, unfiendWindowEventHandler);
    }
    return typeToWindowEventHandlers[type];
  }
  function ensureHandlers(elToHandlers, el) {
    let elHandlers = elToHandlers.get(el);
    if (elHandlers === void 0) {
      elToHandlers.set(el, elHandlers = /* @__PURE__ */ new Set());
    }
    return elHandlers;
  }
  function handlerExist(el, phase, type, handler) {
    const elToHandlers = phaseToTypeToElToHandlers[phase][type];
    if (elToHandlers !== void 0) {
      const handlers = elToHandlers.get(el);
      if (handlers !== void 0) {
        if (handlers.has(handler))
          return true;
      }
    }
    return false;
  }
  function windowEventHandlerExist(type, handler) {
    const handlers = typeToWindowEventHandlers[type];
    if (handlers !== void 0) {
      if (handlers.has(handler)) {
        return true;
      }
    }
    return false;
  }
  function on2(type, el, handler, options) {
    let mergedHandler;
    if (typeof options === "object" && options.once === true) {
      mergedHandler = (e) => {
        off2(type, el, mergedHandler, options);
        handler(e);
      };
    } else {
      mergedHandler = handler;
    }
    const trapped = trapOn(type, el, mergedHandler, options);
    if (trapped)
      return;
    const phase = options === true || typeof options === "object" && options.capture === true ? "capture" : "bubble";
    const elToHandlers = ensureElToHandlers(phase, type);
    const handlers = ensureHandlers(elToHandlers, el);
    if (!handlers.has(mergedHandler))
      handlers.add(mergedHandler);
    if (el === window) {
      const windowEventHandlers = ensureWindowEventHandlers(type);
      if (!windowEventHandlers.has(mergedHandler)) {
        windowEventHandlers.add(mergedHandler);
      }
    }
  }
  function off2(type, el, handler, options) {
    const trapped = trapOff(type, el, handler, options);
    if (trapped)
      return;
    const capture = options === true || typeof options === "object" && options.capture === true;
    const phase = capture ? "capture" : "bubble";
    const elToHandlers = ensureElToHandlers(phase, type);
    const handlers = ensureHandlers(elToHandlers, el);
    if (el === window) {
      const mirrorPhase = capture ? "bubble" : "capture";
      if (!handlerExist(el, mirrorPhase, type, handler) && windowEventHandlerExist(type, handler)) {
        const windowEventHandlers = typeToWindowEventHandlers[type];
        windowEventHandlers.delete(handler);
        if (windowEventHandlers.size === 0) {
          window.removeEventListener(type, unfiendWindowEventHandler);
          typeToWindowEventHandlers[type] = void 0;
        }
      }
    }
    if (handlers.has(handler))
      handlers.delete(handler);
    if (handlers.size === 0) {
      elToHandlers.delete(el);
    }
    if (elToHandlers.size === 0) {
      window.removeEventListener(type, unifiedHandler, phase === "capture");
      phaseToTypeToElToHandlers[phase][type] = void 0;
    }
  }
  return {
    on: on2,
    off: off2
  };
}
const { on, off } = createDelegate();
function useFalseUntilTruthy(originalRef) {
  const currentRef = ref(!!originalRef.value);
  if (currentRef.value)
    return readonly(currentRef);
  const stop = watch(originalRef, (value) => {
    if (value) {
      currentRef.value = true;
      stop();
    }
  });
  return readonly(currentRef);
}
function useMemo(getterOrOptions) {
  const computedValueRef = computed(getterOrOptions);
  const valueRef = ref(computedValueRef.value);
  watch(computedValueRef, (value) => {
    valueRef.value = value;
  });
  if (typeof getterOrOptions === "function") {
    return valueRef;
  } else {
    return {
      __v_isRef: true,
      get value() {
        return valueRef.value;
      },
      set value(v) {
        getterOrOptions.set(v);
      }
    };
  }
}
function hasInstance() {
  return getCurrentInstance() !== null;
}
const isBrowser$2 = typeof window !== "undefined";
let fontsReady;
let isFontReady;
const init = () => {
  var _a, _b;
  fontsReady = isBrowser$2 ? (_b = (_a = document) === null || _a === void 0 ? void 0 : _a.fonts) === null || _b === void 0 ? void 0 : _b.ready : void 0;
  isFontReady = false;
  if (fontsReady !== void 0) {
    void fontsReady.then(() => {
      isFontReady = true;
    });
  } else {
    isFontReady = true;
  }
};
init();
function onFontsReady(cb) {
  if (isFontReady)
    return;
  let deactivated = false;
  onMounted(() => {
    if (!isFontReady) {
      fontsReady === null || fontsReady === void 0 ? void 0 : fontsReady.then(() => {
        if (deactivated)
          return;
        cb();
      });
    }
  });
  onBeforeUnmount(() => {
    deactivated = true;
  });
}
function useMergedState(controlledStateRef, uncontrolledStateRef) {
  watch(controlledStateRef, (value) => {
    if (value !== void 0) {
      uncontrolledStateRef.value = value;
    }
  });
  return computed(() => {
    if (controlledStateRef.value === void 0) {
      return uncontrolledStateRef.value;
    }
    return controlledStateRef.value;
  });
}
function isMounted() {
  const isMounted2 = ref(false);
  onMounted(() => {
    isMounted2.value = true;
  });
  return readonly(isMounted2);
}
function useCompitable(reactive2, keys2) {
  return computed(() => {
    for (const key of keys2) {
      if (reactive2[key] !== void 0)
        return reactive2[key];
    }
    return reactive2[keys2[keys2.length - 1]];
  });
}
const isIos = (typeof window === "undefined" ? false : /iPad|iPhone|iPod/.test(navigator.platform) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) && // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
!window.MSStream;
function useIsIos() {
  return isIos;
}
function useKeyboard(options = {}, enabledRef) {
  const state = reactive({
    ctrl: false,
    command: false,
    win: false,
    shift: false,
    tab: false
  });
  const { keydown, keyup } = options;
  const keydownHandler = (e) => {
    switch (e.key) {
      case "Control":
        state.ctrl = true;
        break;
      case "Meta":
        state.command = true;
        state.win = true;
        break;
      case "Shift":
        state.shift = true;
        break;
      case "Tab":
        state.tab = true;
        break;
    }
    if (keydown !== void 0) {
      Object.keys(keydown).forEach((key) => {
        if (key !== e.key)
          return;
        const handler = keydown[key];
        if (typeof handler === "function") {
          handler(e);
        } else {
          const { stop = false, prevent = false } = handler;
          if (stop)
            e.stopPropagation();
          if (prevent)
            e.preventDefault();
          handler.handler(e);
        }
      });
    }
  };
  const keyupHandler = (e) => {
    switch (e.key) {
      case "Control":
        state.ctrl = false;
        break;
      case "Meta":
        state.command = false;
        state.win = false;
        break;
      case "Shift":
        state.shift = false;
        break;
      case "Tab":
        state.tab = false;
        break;
    }
    if (keyup !== void 0) {
      Object.keys(keyup).forEach((key) => {
        if (key !== e.key)
          return;
        const handler = keyup[key];
        if (typeof handler === "function") {
          handler(e);
        } else {
          const { stop = false, prevent = false } = handler;
          if (stop)
            e.stopPropagation();
          if (prevent)
            e.preventDefault();
          handler.handler(e);
        }
      });
    }
  };
  const setup = () => {
    if (enabledRef === void 0 || enabledRef.value) {
      on("keydown", document, keydownHandler);
      on("keyup", document, keyupHandler);
    }
    if (enabledRef !== void 0) {
      watch(enabledRef, (value) => {
        if (value) {
          on("keydown", document, keydownHandler);
          on("keyup", document, keyupHandler);
        } else {
          off("keydown", document, keydownHandler);
          off("keyup", document, keyupHandler);
        }
      });
    }
  };
  if (hasInstance()) {
    onBeforeMount(setup);
    onBeforeUnmount(() => {
      if (enabledRef === void 0 || enabledRef.value) {
        off("keydown", document, keydownHandler);
        off("keyup", document, keyupHandler);
      }
    });
  } else {
    setup();
  }
  return readonly(state);
}
function createInjectionKey(key) {
  return key;
}
const internalSelectionMenuBodyInjectionKey = createInjectionKey("n-internal-select-menu-body");
const drawerBodyInjectionKey = createInjectionKey("n-drawer-body");
const modalBodyInjectionKey = createInjectionKey("n-modal-body");
const popoverBodyInjectionKey = createInjectionKey("n-popover-body");
const teleportDisabled = "__disabled__";
function useAdjustedTo(props) {
  const modal = inject(modalBodyInjectionKey, null);
  const drawer = inject(drawerBodyInjectionKey, null);
  const popover = inject(popoverBodyInjectionKey, null);
  const selectMenu = inject(internalSelectionMenuBodyInjectionKey, null);
  const fullscreenElementRef = ref();
  if (typeof document !== "undefined") {
    fullscreenElementRef.value = document.fullscreenElement;
    const handleFullscreenChange = () => {
      fullscreenElementRef.value = document.fullscreenElement;
    };
    onMounted(() => {
      on("fullscreenchange", document, handleFullscreenChange);
    });
    onBeforeUnmount(() => {
      off("fullscreenchange", document, handleFullscreenChange);
    });
  }
  return useMemo(() => {
    var _a;
    const {
      to
    } = props;
    if (to !== void 0) {
      if (to === false) return teleportDisabled;
      if (to === true) return fullscreenElementRef.value || "body";
      return to;
    }
    if (modal === null || modal === void 0 ? void 0 : modal.value) {
      return (_a = modal.value.$el) !== null && _a !== void 0 ? _a : modal.value;
    }
    if (drawer === null || drawer === void 0 ? void 0 : drawer.value) return drawer.value;
    if (popover === null || popover === void 0 ? void 0 : popover.value) return popover.value;
    if (selectMenu === null || selectMenu === void 0 ? void 0 : selectMenu.value) return selectMenu.value;
    return to !== null && to !== void 0 ? to : fullscreenElementRef.value || "body";
  });
}
useAdjustedTo.tdkey = teleportDisabled;
useAdjustedTo.propTo = {
  type: [String, Object, Boolean],
  default: void 0
};
function useDeferredTrue(valueRef, delay, shouldDelayRef) {
  const delayedRef = ref(valueRef.value);
  let timerId = null;
  watch(valueRef, (value) => {
    if (timerId !== null) window.clearTimeout(timerId);
    if (value === true) {
      if (shouldDelayRef && !shouldDelayRef.value) {
        delayedRef.value = true;
      } else {
        timerId = window.setTimeout(() => {
          delayedRef.value = true;
        }, delay);
      }
    } else {
      delayedRef.value = false;
    }
  });
  return delayedRef;
}
const isBrowser$1 = typeof document !== "undefined" && typeof window !== "undefined";
let houdiniRegistered = false;
function useHoudini() {
  if (!isBrowser$1) return;
  if (!window.CSS) return;
  if (!houdiniRegistered) {
    houdiniRegistered = true;
    if ("registerProperty" in (window === null || window === void 0 ? void 0 : window.CSS)) {
      try {
        ;
        CSS.registerProperty({
          name: "--n-color-start",
          syntax: "<color>",
          inherits: false,
          initialValue: "#0000"
        });
        CSS.registerProperty({
          name: "--n-color-end",
          syntax: "<color>",
          inherits: false,
          initialValue: "#0000"
        });
      } catch (_a) {
      }
    }
  }
}
function useReactivated(callback) {
  const isDeactivatedRef = {
    isDeactivated: false
  };
  let activateStateInitialized = false;
  onActivated(() => {
    isDeactivatedRef.isDeactivated = false;
    if (!activateStateInitialized) {
      activateStateInitialized = true;
      return;
    }
    callback();
  });
  onDeactivated(() => {
    isDeactivatedRef.isDeactivated = true;
    if (!activateStateInitialized) {
      activateStateInitialized = true;
    }
  });
  return isDeactivatedRef;
}
function getSlot(scope, slots, slotName = "default") {
  const slot = slots[slotName];
  if (slot === void 0) {
    throw new Error(`[vueuc/${scope}]: slot[${slotName}] is empty.`);
  }
  return slot();
}
function flatten$2(vNodes, filterCommentNode = true, result = []) {
  vNodes.forEach((vNode) => {
    if (vNode === null)
      return;
    if (typeof vNode !== "object") {
      if (typeof vNode === "string" || typeof vNode === "number") {
        result.push(createTextVNode(String(vNode)));
      }
      return;
    }
    if (Array.isArray(vNode)) {
      flatten$2(vNode, filterCommentNode, result);
      return;
    }
    if (vNode.type === Fragment) {
      if (vNode.children === null)
        return;
      if (Array.isArray(vNode.children)) {
        flatten$2(vNode.children, filterCommentNode, result);
      }
    } else if (vNode.type !== Comment) {
      result.push(vNode);
    }
  });
  return result;
}
function getFirstVNode(scope, slots, slotName = "default") {
  const slot = slots[slotName];
  if (slot === void 0) {
    throw new Error(`[vueuc/${scope}]: slot[${slotName}] is empty.`);
  }
  const content = flatten$2(slot());
  if (content.length === 1) {
    return content[0];
  } else {
    throw new Error(`[vueuc/${scope}]: slot[${slotName}] should have exactly one child.`);
  }
}
let viewMeasurer = null;
function ensureViewBoundingRect() {
  if (viewMeasurer === null) {
    viewMeasurer = document.getElementById("v-binder-view-measurer");
    if (viewMeasurer === null) {
      viewMeasurer = document.createElement("div");
      viewMeasurer.id = "v-binder-view-measurer";
      const { style: style2 } = viewMeasurer;
      style2.position = "fixed";
      style2.left = "0";
      style2.right = "0";
      style2.top = "0";
      style2.bottom = "0";
      style2.pointerEvents = "none";
      style2.visibility = "hidden";
      document.body.appendChild(viewMeasurer);
    }
  }
  return viewMeasurer.getBoundingClientRect();
}
function getPointRect(x, y) {
  const viewRect = ensureViewBoundingRect();
  return {
    top: y,
    left: x,
    height: 0,
    width: 0,
    right: viewRect.width - x,
    bottom: viewRect.height - y
  };
}
function getRect(el) {
  const elRect = el.getBoundingClientRect();
  const viewRect = ensureViewBoundingRect();
  return {
    left: elRect.left - viewRect.left,
    top: elRect.top - viewRect.top,
    bottom: viewRect.height + viewRect.top - elRect.bottom,
    right: viewRect.width + viewRect.left - elRect.right,
    width: elRect.width,
    height: elRect.height
  };
}
function getParentNode(node) {
  if (node.nodeType === 9) {
    return null;
  }
  return node.parentNode;
}
function getScrollParent(node) {
  if (node === null)
    return null;
  const parentNode = getParentNode(node);
  if (parentNode === null) {
    return null;
  }
  if (parentNode.nodeType === 9) {
    return document;
  }
  if (parentNode.nodeType === 1) {
    const { overflow, overflowX, overflowY } = getComputedStyle(parentNode);
    if (/(auto|scroll|overlay)/.test(overflow + overflowY + overflowX)) {
      return parentNode;
    }
  }
  return getScrollParent(parentNode);
}
const Binder = defineComponent({
  name: "Binder",
  props: {
    syncTargetWithParent: Boolean,
    syncTarget: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    var _a;
    provide("VBinder", (_a = getCurrentInstance()) === null || _a === void 0 ? void 0 : _a.proxy);
    const VBinder = inject("VBinder", null);
    const targetRef = ref(null);
    const setTargetRef = (el) => {
      targetRef.value = el;
      if (VBinder && props.syncTargetWithParent) {
        VBinder.setTargetRef(el);
      }
    };
    let scrollableNodes = [];
    const ensureScrollListener = () => {
      let cursor = targetRef.value;
      while (true) {
        cursor = getScrollParent(cursor);
        if (cursor === null)
          break;
        scrollableNodes.push(cursor);
      }
      for (const el of scrollableNodes) {
        on("scroll", el, onScroll, true);
      }
    };
    const removeScrollListeners = () => {
      for (const el of scrollableNodes) {
        off("scroll", el, onScroll, true);
      }
      scrollableNodes = [];
    };
    const followerScrollListeners = /* @__PURE__ */ new Set();
    const addScrollListener = (listener) => {
      if (followerScrollListeners.size === 0) {
        ensureScrollListener();
      }
      if (!followerScrollListeners.has(listener)) {
        followerScrollListeners.add(listener);
      }
    };
    const removeScrollListener = (listener) => {
      if (followerScrollListeners.has(listener)) {
        followerScrollListeners.delete(listener);
      }
      if (followerScrollListeners.size === 0) {
        removeScrollListeners();
      }
    };
    const onScroll = () => {
      beforeNextFrameOnce(onScrollRaf);
    };
    const onScrollRaf = () => {
      followerScrollListeners.forEach((listener) => listener());
    };
    const followerResizeListeners = /* @__PURE__ */ new Set();
    const addResizeListener = (listener) => {
      if (followerResizeListeners.size === 0) {
        on("resize", window, onResize);
      }
      if (!followerResizeListeners.has(listener)) {
        followerResizeListeners.add(listener);
      }
    };
    const removeResizeListener = (listener) => {
      if (followerResizeListeners.has(listener)) {
        followerResizeListeners.delete(listener);
      }
      if (followerResizeListeners.size === 0) {
        off("resize", window, onResize);
      }
    };
    const onResize = () => {
      followerResizeListeners.forEach((listener) => listener());
    };
    onBeforeUnmount(() => {
      off("resize", window, onResize);
      removeScrollListeners();
    });
    return {
      targetRef,
      setTargetRef,
      addScrollListener,
      removeScrollListener,
      addResizeListener,
      removeResizeListener
    };
  },
  render() {
    return getSlot("binder", this.$slots);
  }
});
const VTarget = defineComponent({
  name: "Target",
  setup() {
    const { setTargetRef, syncTarget } = inject("VBinder");
    const setTargetDirective = {
      mounted: setTargetRef,
      updated: setTargetRef
    };
    return {
      syncTarget,
      setTargetDirective
    };
  },
  render() {
    const { syncTarget, setTargetDirective } = this;
    if (syncTarget) {
      return withDirectives(getFirstVNode("follower", this.$slots), [
        [setTargetDirective]
      ]);
    }
    return getFirstVNode("follower", this.$slots);
  }
});
const ctxKey$1 = "@@mmoContext";
const mousemoveoutside = {
  mounted(el, { value }) {
    el[ctxKey$1] = {
      handler: void 0
    };
    if (typeof value === "function") {
      el[ctxKey$1].handler = value;
      on("mousemoveoutside", el, value);
    }
  },
  updated(el, { value }) {
    const ctx2 = el[ctxKey$1];
    if (typeof value === "function") {
      if (ctx2.handler) {
        if (ctx2.handler !== value) {
          off("mousemoveoutside", el, ctx2.handler);
          ctx2.handler = value;
          on("mousemoveoutside", el, value);
        }
      } else {
        el[ctxKey$1].handler = value;
        on("mousemoveoutside", el, value);
      }
    } else {
      if (ctx2.handler) {
        off("mousemoveoutside", el, ctx2.handler);
        ctx2.handler = void 0;
      }
    }
  },
  unmounted(el) {
    const { handler } = el[ctxKey$1];
    if (handler) {
      off("mousemoveoutside", el, handler);
    }
    el[ctxKey$1].handler = void 0;
  }
};
const ctxKey = "@@coContext";
const clickoutside = {
  mounted(el, { value, modifiers }) {
    el[ctxKey] = {
      handler: void 0
    };
    if (typeof value === "function") {
      el[ctxKey].handler = value;
      on("clickoutside", el, value, {
        capture: modifiers.capture
      });
    }
  },
  updated(el, { value, modifiers }) {
    const ctx2 = el[ctxKey];
    if (typeof value === "function") {
      if (ctx2.handler) {
        if (ctx2.handler !== value) {
          off("clickoutside", el, ctx2.handler, {
            capture: modifiers.capture
          });
          ctx2.handler = value;
          on("clickoutside", el, value, {
            capture: modifiers.capture
          });
        }
      } else {
        el[ctxKey].handler = value;
        on("clickoutside", el, value, {
          capture: modifiers.capture
        });
      }
    } else {
      if (ctx2.handler) {
        off("clickoutside", el, ctx2.handler, {
          capture: modifiers.capture
        });
        ctx2.handler = void 0;
      }
    }
  },
  unmounted(el, { modifiers }) {
    const { handler } = el[ctxKey];
    if (handler) {
      off("clickoutside", el, handler, {
        capture: modifiers.capture
      });
    }
    el[ctxKey].handler = void 0;
  }
};
function warn$2(location, message) {
  console.error(`[vdirs/${location}]: ${message}`);
}
class ZIndexManager {
  constructor() {
    this.elementZIndex = /* @__PURE__ */ new Map();
    this.nextZIndex = 2e3;
  }
  get elementCount() {
    return this.elementZIndex.size;
  }
  ensureZIndex(el, zIndex) {
    const { elementZIndex } = this;
    if (zIndex !== void 0) {
      el.style.zIndex = `${zIndex}`;
      elementZIndex.delete(el);
      return;
    }
    const { nextZIndex } = this;
    if (elementZIndex.has(el)) {
      const currentZIndex = elementZIndex.get(el);
      if (currentZIndex + 1 === this.nextZIndex)
        return;
    }
    el.style.zIndex = `${nextZIndex}`;
    elementZIndex.set(el, nextZIndex);
    this.nextZIndex = nextZIndex + 1;
    this.squashState();
  }
  unregister(el, zIndex) {
    const { elementZIndex } = this;
    if (elementZIndex.has(el)) {
      elementZIndex.delete(el);
    } else if (zIndex === void 0) {
      warn$2("z-index-manager/unregister-element", "Element not found when unregistering.");
    }
    this.squashState();
  }
  squashState() {
    const { elementCount } = this;
    if (!elementCount) {
      this.nextZIndex = 2e3;
    }
    if (this.nextZIndex - elementCount > 2500)
      this.rearrange();
  }
  rearrange() {
    const elementZIndexPair = Array.from(this.elementZIndex.entries());
    elementZIndexPair.sort((pair1, pair2) => {
      return pair1[1] - pair2[1];
    });
    this.nextZIndex = 2e3;
    elementZIndexPair.forEach((pair) => {
      const el = pair[0];
      const zIndex = this.nextZIndex++;
      if (`${zIndex}` !== el.style.zIndex)
        el.style.zIndex = `${zIndex}`;
    });
  }
}
const zIndexManager = new ZIndexManager();
const ctx = "@@ziContext";
const zindexable = {
  mounted(el, bindings) {
    const { value = {} } = bindings;
    const { zIndex, enabled } = value;
    el[ctx] = {
      enabled: !!enabled,
      initialized: false
    };
    if (enabled) {
      zIndexManager.ensureZIndex(el, zIndex);
      el[ctx].initialized = true;
    }
  },
  updated(el, bindings) {
    const { value = {} } = bindings;
    const { zIndex, enabled } = value;
    const cachedEnabled = el[ctx].enabled;
    if (enabled && !cachedEnabled) {
      zIndexManager.ensureZIndex(el, zIndex);
      el[ctx].initialized = true;
    }
    el[ctx].enabled = !!enabled;
  },
  unmounted(el, bindings) {
    if (!el[ctx].initialized)
      return;
    const { value = {} } = bindings;
    const { zIndex } = value;
    zIndexManager.unregister(el, zIndex);
  }
};
const ssrContextKey = "@css-render/vue3-ssr";
function createStyleString(id, style2) {
  return `<style cssr-id="${id}">
${style2}
</style>`;
}
function ssrAdapter(id, style2, ssrContext) {
  const { styles, ids } = ssrContext;
  if (ids.has(id))
    return;
  if (styles !== null) {
    ids.add(id);
    styles.push(createStyleString(id, style2));
  }
}
const isBrowser = typeof document !== "undefined";
function useSsrAdapter() {
  if (isBrowser)
    return void 0;
  const context = inject(ssrContextKey, null);
  if (context === null)
    return void 0;
  return {
    adapter: (id, style2) => ssrAdapter(id, style2, context),
    context
  };
}
function warn$1(location, message) {
  console.error(`[vueuc/${location}]: ${message}`);
}
const { c } = CssRender();
const cssrAnchorMetaName$1 = "vueuc-style";
function resolveTo(selector) {
  if (typeof selector === "string") {
    return document.querySelector(selector);
  }
  return selector();
}
const LazyTeleport = defineComponent({
  name: "LazyTeleport",
  props: {
    to: {
      type: [String, Object],
      default: void 0
    },
    disabled: Boolean,
    show: {
      type: Boolean,
      required: true
    }
  },
  setup(props) {
    return {
      showTeleport: useFalseUntilTruthy(toRef(props, "show")),
      mergedTo: computed(() => {
        const { to } = props;
        return to !== null && to !== void 0 ? to : "body";
      })
    };
  },
  render() {
    return this.showTeleport ? this.disabled ? getSlot("lazy-teleport", this.$slots) : h(Teleport, {
      disabled: this.disabled,
      to: this.mergedTo
    }, getSlot("lazy-teleport", this.$slots)) : null;
  }
});
const oppositionPositions = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left"
};
const oppositeAligns = {
  start: "end",
  center: "center",
  end: "start"
};
const propToCompare = {
  top: "height",
  bottom: "height",
  left: "width",
  right: "width"
};
const transformOrigins = {
  "bottom-start": "top left",
  bottom: "top center",
  "bottom-end": "top right",
  "top-start": "bottom left",
  top: "bottom center",
  "top-end": "bottom right",
  "right-start": "top left",
  right: "center left",
  "right-end": "bottom left",
  "left-start": "top right",
  left: "center right",
  "left-end": "bottom right"
};
const overlapTransformOrigin = {
  "bottom-start": "bottom left",
  bottom: "bottom center",
  "bottom-end": "bottom right",
  "top-start": "top left",
  top: "top center",
  "top-end": "top right",
  "right-start": "top right",
  right: "center right",
  "right-end": "bottom right",
  "left-start": "top left",
  left: "center left",
  "left-end": "bottom left"
};
const oppositeAlignCssPositionProps = {
  "bottom-start": "right",
  "bottom-end": "left",
  "top-start": "right",
  "top-end": "left",
  "right-start": "bottom",
  "right-end": "top",
  "left-start": "bottom",
  "left-end": "top"
};
const keepOffsetDirection = {
  top: true,
  bottom: false,
  left: true,
  right: false
  // left--
};
const cssPositionToOppositeAlign = {
  top: "end",
  bottom: "start",
  left: "end",
  right: "start"
};
function getPlacementAndOffsetOfFollower(placement, targetRect, followerRect, shift, flip, overlap) {
  if (!flip || overlap) {
    return { placement, top: 0, left: 0 };
  }
  const [position, align] = placement.split("-");
  let properAlign = align !== null && align !== void 0 ? align : "center";
  let properOffset = {
    top: 0,
    left: 0
  };
  const deriveOffset = (oppositeAlignCssSizeProp, alignCssPositionProp, offsetVertically2) => {
    let left = 0;
    let top = 0;
    const diff = followerRect[oppositeAlignCssSizeProp] - targetRect[alignCssPositionProp] - targetRect[oppositeAlignCssSizeProp];
    if (diff > 0 && shift) {
      if (offsetVertically2) {
        top = keepOffsetDirection[alignCssPositionProp] ? diff : -diff;
      } else {
        left = keepOffsetDirection[alignCssPositionProp] ? diff : -diff;
      }
    }
    return {
      left,
      top
    };
  };
  const offsetVertically = position === "left" || position === "right";
  if (properAlign !== "center") {
    const oppositeAlignCssPositionProp = oppositeAlignCssPositionProps[placement];
    const currentAlignCssPositionProp = oppositionPositions[oppositeAlignCssPositionProp];
    const oppositeAlignCssSizeProp = propToCompare[oppositeAlignCssPositionProp];
    if (followerRect[oppositeAlignCssSizeProp] > targetRect[oppositeAlignCssSizeProp]) {
      if (
        // current space is not enough
        // ----------[ target ]---------|
        // -------[     follower        ]
        targetRect[oppositeAlignCssPositionProp] + targetRect[oppositeAlignCssSizeProp] < followerRect[oppositeAlignCssSizeProp]
      ) {
        const followerOverTargetSize = (followerRect[oppositeAlignCssSizeProp] - targetRect[oppositeAlignCssSizeProp]) / 2;
        if (targetRect[oppositeAlignCssPositionProp] < followerOverTargetSize || targetRect[currentAlignCssPositionProp] < followerOverTargetSize) {
          if (targetRect[oppositeAlignCssPositionProp] < targetRect[currentAlignCssPositionProp]) {
            properAlign = oppositeAligns[align];
            properOffset = deriveOffset(oppositeAlignCssSizeProp, currentAlignCssPositionProp, offsetVertically);
          } else {
            properOffset = deriveOffset(oppositeAlignCssSizeProp, oppositeAlignCssPositionProp, offsetVertically);
          }
        } else {
          properAlign = "center";
        }
      }
    } else if (followerRect[oppositeAlignCssSizeProp] < targetRect[oppositeAlignCssSizeProp]) {
      if (targetRect[currentAlignCssPositionProp] < 0 && // opposite align has larger space
      // ------------[   target   ]
      // ----------------[follower]
      targetRect[oppositeAlignCssPositionProp] > targetRect[currentAlignCssPositionProp]) {
        properAlign = oppositeAligns[align];
      }
    }
  } else {
    const possibleAlternativeAlignCssPositionProp1 = position === "bottom" || position === "top" ? "left" : "top";
    const possibleAlternativeAlignCssPositionProp2 = oppositionPositions[possibleAlternativeAlignCssPositionProp1];
    const alternativeAlignCssSizeProp = propToCompare[possibleAlternativeAlignCssPositionProp1];
    const followerOverTargetSize = (followerRect[alternativeAlignCssSizeProp] - targetRect[alternativeAlignCssSizeProp]) / 2;
    if (
      // center is not enough
      // ----------- [ target ]--|
      // -------[     follower     ]
      targetRect[possibleAlternativeAlignCssPositionProp1] < followerOverTargetSize || targetRect[possibleAlternativeAlignCssPositionProp2] < followerOverTargetSize
    ) {
      if (targetRect[possibleAlternativeAlignCssPositionProp1] > targetRect[possibleAlternativeAlignCssPositionProp2]) {
        properAlign = cssPositionToOppositeAlign[possibleAlternativeAlignCssPositionProp1];
        properOffset = deriveOffset(alternativeAlignCssSizeProp, possibleAlternativeAlignCssPositionProp1, offsetVertically);
      } else {
        properAlign = cssPositionToOppositeAlign[possibleAlternativeAlignCssPositionProp2];
        properOffset = deriveOffset(alternativeAlignCssSizeProp, possibleAlternativeAlignCssPositionProp2, offsetVertically);
      }
    }
  }
  let properPosition = position;
  if (
    // space is not enough
    targetRect[position] < followerRect[propToCompare[position]] && // opposite position's space is larger
    targetRect[position] < targetRect[oppositionPositions[position]]
  ) {
    properPosition = oppositionPositions[position];
  }
  return {
    placement: properAlign !== "center" ? `${properPosition}-${properAlign}` : properPosition,
    left: properOffset.left,
    top: properOffset.top
  };
}
function getProperTransformOrigin(placement, overlap) {
  if (overlap)
    return overlapTransformOrigin[placement];
  return transformOrigins[placement];
}
function getOffset(placement, offsetRect, targetRect, offsetTopToStandardPlacement, offsetLeftToStandardPlacement, overlap) {
  if (overlap) {
    switch (placement) {
      case "bottom-start":
        return {
          top: `${Math.round(targetRect.top - offsetRect.top + targetRect.height)}px`,
          left: `${Math.round(targetRect.left - offsetRect.left)}px`,
          transform: "translateY(-100%)"
        };
      case "bottom-end":
        return {
          top: `${Math.round(targetRect.top - offsetRect.top + targetRect.height)}px`,
          left: `${Math.round(targetRect.left - offsetRect.left + targetRect.width)}px`,
          transform: "translateX(-100%) translateY(-100%)"
        };
      case "top-start":
        return {
          top: `${Math.round(targetRect.top - offsetRect.top)}px`,
          left: `${Math.round(targetRect.left - offsetRect.left)}px`,
          transform: ""
        };
      case "top-end":
        return {
          top: `${Math.round(targetRect.top - offsetRect.top)}px`,
          left: `${Math.round(targetRect.left - offsetRect.left + targetRect.width)}px`,
          transform: "translateX(-100%)"
        };
      case "right-start":
        return {
          top: `${Math.round(targetRect.top - offsetRect.top)}px`,
          left: `${Math.round(targetRect.left - offsetRect.left + targetRect.width)}px`,
          transform: "translateX(-100%)"
        };
      case "right-end":
        return {
          top: `${Math.round(targetRect.top - offsetRect.top + targetRect.height)}px`,
          left: `${Math.round(targetRect.left - offsetRect.left + targetRect.width)}px`,
          transform: "translateX(-100%) translateY(-100%)"
        };
      case "left-start":
        return {
          top: `${Math.round(targetRect.top - offsetRect.top)}px`,
          left: `${Math.round(targetRect.left - offsetRect.left)}px`,
          transform: ""
        };
      case "left-end":
        return {
          top: `${Math.round(targetRect.top - offsetRect.top + targetRect.height)}px`,
          left: `${Math.round(targetRect.left - offsetRect.left)}px`,
          transform: "translateY(-100%)"
        };
      case "top":
        return {
          top: `${Math.round(targetRect.top - offsetRect.top)}px`,
          left: `${Math.round(targetRect.left - offsetRect.left + targetRect.width / 2)}px`,
          transform: "translateX(-50%)"
        };
      case "right":
        return {
          top: `${Math.round(targetRect.top - offsetRect.top + targetRect.height / 2)}px`,
          left: `${Math.round(targetRect.left - offsetRect.left + targetRect.width)}px`,
          transform: "translateX(-100%) translateY(-50%)"
        };
      case "left":
        return {
          top: `${Math.round(targetRect.top - offsetRect.top + targetRect.height / 2)}px`,
          left: `${Math.round(targetRect.left - offsetRect.left)}px`,
          transform: "translateY(-50%)"
        };
      case "bottom":
      default:
        return {
          top: `${Math.round(targetRect.top - offsetRect.top + targetRect.height)}px`,
          left: `${Math.round(targetRect.left - offsetRect.left + targetRect.width / 2)}px`,
          transform: "translateX(-50%) translateY(-100%)"
        };
    }
  }
  switch (placement) {
    case "bottom-start":
      return {
        top: `${Math.round(targetRect.top - offsetRect.top + targetRect.height + offsetTopToStandardPlacement)}px`,
        left: `${Math.round(targetRect.left - offsetRect.left + offsetLeftToStandardPlacement)}px`,
        transform: ""
      };
    case "bottom-end":
      return {
        top: `${Math.round(targetRect.top - offsetRect.top + targetRect.height + offsetTopToStandardPlacement)}px`,
        left: `${Math.round(targetRect.left - offsetRect.left + targetRect.width + offsetLeftToStandardPlacement)}px`,
        transform: "translateX(-100%)"
      };
    case "top-start":
      return {
        top: `${Math.round(targetRect.top - offsetRect.top + offsetTopToStandardPlacement)}px`,
        left: `${Math.round(targetRect.left - offsetRect.left + offsetLeftToStandardPlacement)}px`,
        transform: "translateY(-100%)"
      };
    case "top-end":
      return {
        top: `${Math.round(targetRect.top - offsetRect.top + offsetTopToStandardPlacement)}px`,
        left: `${Math.round(targetRect.left - offsetRect.left + targetRect.width + offsetLeftToStandardPlacement)}px`,
        transform: "translateX(-100%) translateY(-100%)"
      };
    case "right-start":
      return {
        top: `${Math.round(targetRect.top - offsetRect.top + offsetTopToStandardPlacement)}px`,
        left: `${Math.round(targetRect.left - offsetRect.left + targetRect.width + offsetLeftToStandardPlacement)}px`,
        transform: ""
      };
    case "right-end":
      return {
        top: `${Math.round(targetRect.top - offsetRect.top + targetRect.height + offsetTopToStandardPlacement)}px`,
        left: `${Math.round(targetRect.left - offsetRect.left + targetRect.width + offsetLeftToStandardPlacement)}px`,
        transform: "translateY(-100%)"
      };
    case "left-start":
      return {
        top: `${Math.round(targetRect.top - offsetRect.top + offsetTopToStandardPlacement)}px`,
        left: `${Math.round(targetRect.left - offsetRect.left + offsetLeftToStandardPlacement)}px`,
        transform: "translateX(-100%)"
      };
    case "left-end":
      return {
        top: `${Math.round(targetRect.top - offsetRect.top + targetRect.height + offsetTopToStandardPlacement)}px`,
        left: `${Math.round(targetRect.left - offsetRect.left + offsetLeftToStandardPlacement)}px`,
        transform: "translateX(-100%) translateY(-100%)"
      };
    case "top":
      return {
        top: `${Math.round(targetRect.top - offsetRect.top + offsetTopToStandardPlacement)}px`,
        left: `${Math.round(targetRect.left - offsetRect.left + targetRect.width / 2 + offsetLeftToStandardPlacement)}px`,
        transform: "translateY(-100%) translateX(-50%)"
      };
    case "right":
      return {
        top: `${Math.round(targetRect.top - offsetRect.top + targetRect.height / 2 + offsetTopToStandardPlacement)}px`,
        left: `${Math.round(targetRect.left - offsetRect.left + targetRect.width + offsetLeftToStandardPlacement)}px`,
        transform: "translateY(-50%)"
      };
    case "left":
      return {
        top: `${Math.round(targetRect.top - offsetRect.top + targetRect.height / 2 + offsetTopToStandardPlacement)}px`,
        left: `${Math.round(targetRect.left - offsetRect.left + offsetLeftToStandardPlacement)}px`,
        transform: "translateY(-50%) translateX(-100%)"
      };
    case "bottom":
    default:
      return {
        top: `${Math.round(targetRect.top - offsetRect.top + targetRect.height + offsetTopToStandardPlacement)}px`,
        left: `${Math.round(targetRect.left - offsetRect.left + targetRect.width / 2 + offsetLeftToStandardPlacement)}px`,
        transform: "translateX(-50%)"
      };
  }
}
const style$5 = c([
  c(".v-binder-follower-container", {
    position: "absolute",
    left: "0",
    right: "0",
    top: "0",
    height: "0",
    pointerEvents: "none",
    zIndex: "auto"
  }),
  c(".v-binder-follower-content", {
    position: "absolute",
    zIndex: "auto"
  }, [
    c("> *", {
      pointerEvents: "all"
    })
  ])
]);
const VFollower = defineComponent({
  name: "Follower",
  inheritAttrs: false,
  props: {
    show: Boolean,
    enabled: {
      type: Boolean,
      default: void 0
    },
    placement: {
      type: String,
      default: "bottom"
    },
    syncTrigger: {
      type: Array,
      default: ["resize", "scroll"]
    },
    to: [String, Object],
    flip: {
      type: Boolean,
      default: true
    },
    internalShift: Boolean,
    x: Number,
    y: Number,
    width: String,
    minWidth: String,
    containerClass: String,
    teleportDisabled: Boolean,
    zindexable: {
      type: Boolean,
      default: true
    },
    zIndex: Number,
    overlap: Boolean
  },
  setup(props) {
    const VBinder = inject("VBinder");
    const mergedEnabledRef = useMemo(() => {
      return props.enabled !== void 0 ? props.enabled : props.show;
    });
    const followerRef = ref(null);
    const offsetContainerRef = ref(null);
    const ensureListeners = () => {
      const { syncTrigger } = props;
      if (syncTrigger.includes("scroll")) {
        VBinder.addScrollListener(syncPosition);
      }
      if (syncTrigger.includes("resize")) {
        VBinder.addResizeListener(syncPosition);
      }
    };
    const removeListeners = () => {
      VBinder.removeScrollListener(syncPosition);
      VBinder.removeResizeListener(syncPosition);
    };
    onMounted(() => {
      if (mergedEnabledRef.value) {
        syncPosition();
        ensureListeners();
      }
    });
    const ssrAdapter2 = useSsrAdapter();
    style$5.mount({
      id: "vueuc/binder",
      head: true,
      anchorMetaName: cssrAnchorMetaName$1,
      ssr: ssrAdapter2
    });
    onBeforeUnmount(() => {
      removeListeners();
    });
    onFontsReady(() => {
      if (mergedEnabledRef.value) {
        syncPosition();
      }
    });
    const syncPosition = () => {
      if (!mergedEnabledRef.value) {
        return;
      }
      const follower = followerRef.value;
      if (follower === null)
        return;
      const target = VBinder.targetRef;
      const { x, y, overlap } = props;
      const targetRect = x !== void 0 && y !== void 0 ? getPointRect(x, y) : getRect(target);
      follower.style.setProperty("--v-target-width", `${Math.round(targetRect.width)}px`);
      follower.style.setProperty("--v-target-height", `${Math.round(targetRect.height)}px`);
      const { width, minWidth, placement, internalShift, flip } = props;
      follower.setAttribute("v-placement", placement);
      if (overlap) {
        follower.setAttribute("v-overlap", "");
      } else {
        follower.removeAttribute("v-overlap");
      }
      const { style: style2 } = follower;
      if (width === "target") {
        style2.width = `${targetRect.width}px`;
      } else if (width !== void 0) {
        style2.width = width;
      } else {
        style2.width = "";
      }
      if (minWidth === "target") {
        style2.minWidth = `${targetRect.width}px`;
      } else if (minWidth !== void 0) {
        style2.minWidth = minWidth;
      } else {
        style2.minWidth = "";
      }
      const followerRect = getRect(follower);
      const offsetContainerRect = getRect(offsetContainerRef.value);
      const { left: offsetLeftToStandardPlacement, top: offsetTopToStandardPlacement, placement: properPlacement } = getPlacementAndOffsetOfFollower(placement, targetRect, followerRect, internalShift, flip, overlap);
      const properTransformOrigin = getProperTransformOrigin(properPlacement, overlap);
      const { left, top, transform } = getOffset(properPlacement, offsetContainerRect, targetRect, offsetTopToStandardPlacement, offsetLeftToStandardPlacement, overlap);
      follower.setAttribute("v-placement", properPlacement);
      follower.style.setProperty("--v-offset-left", `${Math.round(offsetLeftToStandardPlacement)}px`);
      follower.style.setProperty("--v-offset-top", `${Math.round(offsetTopToStandardPlacement)}px`);
      follower.style.transform = `translateX(${left}) translateY(${top}) ${transform}`;
      follower.style.setProperty("--v-transform-origin", properTransformOrigin);
      follower.style.transformOrigin = properTransformOrigin;
    };
    watch(mergedEnabledRef, (value) => {
      if (value) {
        ensureListeners();
        syncOnNextTick();
      } else {
        removeListeners();
      }
    });
    const syncOnNextTick = () => {
      nextTick().then(syncPosition).catch((e) => console.error(e));
    };
    [
      "placement",
      "x",
      "y",
      "internalShift",
      "flip",
      "width",
      "overlap",
      "minWidth"
    ].forEach((prop) => {
      watch(toRef(props, prop), syncPosition);
    });
    ["teleportDisabled"].forEach((prop) => {
      watch(toRef(props, prop), syncOnNextTick);
    });
    watch(toRef(props, "syncTrigger"), (value) => {
      if (!value.includes("resize")) {
        VBinder.removeResizeListener(syncPosition);
      } else {
        VBinder.addResizeListener(syncPosition);
      }
      if (!value.includes("scroll")) {
        VBinder.removeScrollListener(syncPosition);
      } else {
        VBinder.addScrollListener(syncPosition);
      }
    });
    const isMountedRef = isMounted();
    const mergedToRef = useMemo(() => {
      const { to } = props;
      if (to !== void 0)
        return to;
      if (isMountedRef.value) {
        return void 0;
      }
      return void 0;
    });
    return {
      VBinder,
      mergedEnabled: mergedEnabledRef,
      offsetContainerRef,
      followerRef,
      mergedTo: mergedToRef,
      syncPosition
    };
  },
  render() {
    return h(LazyTeleport, {
      show: this.show,
      to: this.mergedTo,
      disabled: this.teleportDisabled
    }, {
      default: () => {
        var _a, _b;
        const vNode = h("div", {
          class: ["v-binder-follower-container", this.containerClass],
          ref: "offsetContainerRef"
        }, [
          h("div", {
            class: "v-binder-follower-content",
            ref: "followerRef"
          }, (_b = (_a = this.$slots).default) === null || _b === void 0 ? void 0 : _b.call(_a))
        ]);
        if (this.zindexable) {
          return withDirectives(vNode, [
            [
              zindexable,
              {
                enabled: this.mergedEnabled,
                zIndex: this.zIndex
              }
            ]
          ]);
        }
        return vNode;
      }
    });
  }
});
var resizeObservers = [];
var hasActiveObservations = function() {
  return resizeObservers.some(function(ro) {
    return ro.activeTargets.length > 0;
  });
};
var hasSkippedObservations = function() {
  return resizeObservers.some(function(ro) {
    return ro.skippedTargets.length > 0;
  });
};
var msg = "ResizeObserver loop completed with undelivered notifications.";
var deliverResizeLoopError = function() {
  var event;
  if (typeof ErrorEvent === "function") {
    event = new ErrorEvent("error", {
      message: msg
    });
  } else {
    event = document.createEvent("Event");
    event.initEvent("error", false, false);
    event.message = msg;
  }
  window.dispatchEvent(event);
};
var ResizeObserverBoxOptions;
(function(ResizeObserverBoxOptions2) {
  ResizeObserverBoxOptions2["BORDER_BOX"] = "border-box";
  ResizeObserverBoxOptions2["CONTENT_BOX"] = "content-box";
  ResizeObserverBoxOptions2["DEVICE_PIXEL_CONTENT_BOX"] = "device-pixel-content-box";
})(ResizeObserverBoxOptions || (ResizeObserverBoxOptions = {}));
var freeze = function(obj) {
  return Object.freeze(obj);
};
var ResizeObserverSize = /* @__PURE__ */ (function() {
  function ResizeObserverSize2(inlineSize, blockSize) {
    this.inlineSize = inlineSize;
    this.blockSize = blockSize;
    freeze(this);
  }
  return ResizeObserverSize2;
})();
var DOMRectReadOnly = (function() {
  function DOMRectReadOnly2(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.top = this.y;
    this.left = this.x;
    this.bottom = this.top + this.height;
    this.right = this.left + this.width;
    return freeze(this);
  }
  DOMRectReadOnly2.prototype.toJSON = function() {
    var _a = this, x = _a.x, y = _a.y, top = _a.top, right = _a.right, bottom = _a.bottom, left = _a.left, width = _a.width, height = _a.height;
    return { x, y, top, right, bottom, left, width, height };
  };
  DOMRectReadOnly2.fromRect = function(rectangle) {
    return new DOMRectReadOnly2(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
  };
  return DOMRectReadOnly2;
})();
var isSVG = function(target) {
  return target instanceof SVGElement && "getBBox" in target;
};
var isHidden = function(target) {
  if (isSVG(target)) {
    var _a = target.getBBox(), width = _a.width, height = _a.height;
    return !width && !height;
  }
  var _b = target, offsetWidth = _b.offsetWidth, offsetHeight = _b.offsetHeight;
  return !(offsetWidth || offsetHeight || target.getClientRects().length);
};
var isElement = function(obj) {
  var _a;
  if (obj instanceof Element) {
    return true;
  }
  var scope = (_a = obj === null || obj === void 0 ? void 0 : obj.ownerDocument) === null || _a === void 0 ? void 0 : _a.defaultView;
  return !!(scope && obj instanceof scope.Element);
};
var isReplacedElement = function(target) {
  switch (target.tagName) {
    case "INPUT":
      if (target.type !== "image") {
        break;
      }
    case "VIDEO":
    case "AUDIO":
    case "EMBED":
    case "OBJECT":
    case "CANVAS":
    case "IFRAME":
    case "IMG":
      return true;
  }
  return false;
};
var global = typeof window !== "undefined" ? window : {};
var cache = /* @__PURE__ */ new WeakMap();
var scrollRegexp = /auto|scroll/;
var verticalRegexp = /^tb|vertical/;
var IE = /msie|trident/i.test(global.navigator && global.navigator.userAgent);
var parseDimension = function(pixel) {
  return parseFloat(pixel || "0");
};
var size = function(inlineSize, blockSize, switchSizes) {
  if (inlineSize === void 0) {
    inlineSize = 0;
  }
  if (blockSize === void 0) {
    blockSize = 0;
  }
  if (switchSizes === void 0) {
    switchSizes = false;
  }
  return new ResizeObserverSize((switchSizes ? blockSize : inlineSize) || 0, (switchSizes ? inlineSize : blockSize) || 0);
};
var zeroBoxes = freeze({
  devicePixelContentBoxSize: size(),
  borderBoxSize: size(),
  contentBoxSize: size(),
  contentRect: new DOMRectReadOnly(0, 0, 0, 0)
});
var calculateBoxSizes = function(target, forceRecalculation) {
  if (forceRecalculation === void 0) {
    forceRecalculation = false;
  }
  if (cache.has(target) && !forceRecalculation) {
    return cache.get(target);
  }
  if (isHidden(target)) {
    cache.set(target, zeroBoxes);
    return zeroBoxes;
  }
  var cs = getComputedStyle(target);
  var svg = isSVG(target) && target.ownerSVGElement && target.getBBox();
  var removePadding = !IE && cs.boxSizing === "border-box";
  var switchSizes = verticalRegexp.test(cs.writingMode || "");
  var canScrollVertically = !svg && scrollRegexp.test(cs.overflowY || "");
  var canScrollHorizontally = !svg && scrollRegexp.test(cs.overflowX || "");
  var paddingTop = svg ? 0 : parseDimension(cs.paddingTop);
  var paddingRight = svg ? 0 : parseDimension(cs.paddingRight);
  var paddingBottom = svg ? 0 : parseDimension(cs.paddingBottom);
  var paddingLeft = svg ? 0 : parseDimension(cs.paddingLeft);
  var borderTop = svg ? 0 : parseDimension(cs.borderTopWidth);
  var borderRight = svg ? 0 : parseDimension(cs.borderRightWidth);
  var borderBottom = svg ? 0 : parseDimension(cs.borderBottomWidth);
  var borderLeft = svg ? 0 : parseDimension(cs.borderLeftWidth);
  var horizontalPadding = paddingLeft + paddingRight;
  var verticalPadding = paddingTop + paddingBottom;
  var horizontalBorderArea = borderLeft + borderRight;
  var verticalBorderArea = borderTop + borderBottom;
  var horizontalScrollbarThickness = !canScrollHorizontally ? 0 : target.offsetHeight - verticalBorderArea - target.clientHeight;
  var verticalScrollbarThickness = !canScrollVertically ? 0 : target.offsetWidth - horizontalBorderArea - target.clientWidth;
  var widthReduction = removePadding ? horizontalPadding + horizontalBorderArea : 0;
  var heightReduction = removePadding ? verticalPadding + verticalBorderArea : 0;
  var contentWidth = svg ? svg.width : parseDimension(cs.width) - widthReduction - verticalScrollbarThickness;
  var contentHeight = svg ? svg.height : parseDimension(cs.height) - heightReduction - horizontalScrollbarThickness;
  var borderBoxWidth = contentWidth + horizontalPadding + verticalScrollbarThickness + horizontalBorderArea;
  var borderBoxHeight = contentHeight + verticalPadding + horizontalScrollbarThickness + verticalBorderArea;
  var boxes = freeze({
    devicePixelContentBoxSize: size(Math.round(contentWidth * devicePixelRatio), Math.round(contentHeight * devicePixelRatio), switchSizes),
    borderBoxSize: size(borderBoxWidth, borderBoxHeight, switchSizes),
    contentBoxSize: size(contentWidth, contentHeight, switchSizes),
    contentRect: new DOMRectReadOnly(paddingLeft, paddingTop, contentWidth, contentHeight)
  });
  cache.set(target, boxes);
  return boxes;
};
var calculateBoxSize = function(target, observedBox, forceRecalculation) {
  var _a = calculateBoxSizes(target, forceRecalculation), borderBoxSize = _a.borderBoxSize, contentBoxSize = _a.contentBoxSize, devicePixelContentBoxSize = _a.devicePixelContentBoxSize;
  switch (observedBox) {
    case ResizeObserverBoxOptions.DEVICE_PIXEL_CONTENT_BOX:
      return devicePixelContentBoxSize;
    case ResizeObserverBoxOptions.BORDER_BOX:
      return borderBoxSize;
    default:
      return contentBoxSize;
  }
};
var ResizeObserverEntry = /* @__PURE__ */ (function() {
  function ResizeObserverEntry2(target) {
    var boxes = calculateBoxSizes(target);
    this.target = target;
    this.contentRect = boxes.contentRect;
    this.borderBoxSize = freeze([boxes.borderBoxSize]);
    this.contentBoxSize = freeze([boxes.contentBoxSize]);
    this.devicePixelContentBoxSize = freeze([boxes.devicePixelContentBoxSize]);
  }
  return ResizeObserverEntry2;
})();
var calculateDepthForNode = function(node) {
  if (isHidden(node)) {
    return Infinity;
  }
  var depth = 0;
  var parent = node.parentNode;
  while (parent) {
    depth += 1;
    parent = parent.parentNode;
  }
  return depth;
};
var broadcastActiveObservations = function() {
  var shallowestDepth = Infinity;
  var callbacks2 = [];
  resizeObservers.forEach(function processObserver(ro) {
    if (ro.activeTargets.length === 0) {
      return;
    }
    var entries = [];
    ro.activeTargets.forEach(function processTarget(ot) {
      var entry = new ResizeObserverEntry(ot.target);
      var targetDepth = calculateDepthForNode(ot.target);
      entries.push(entry);
      ot.lastReportedSize = calculateBoxSize(ot.target, ot.observedBox);
      if (targetDepth < shallowestDepth) {
        shallowestDepth = targetDepth;
      }
    });
    callbacks2.push(function resizeObserverCallback() {
      ro.callback.call(ro.observer, entries, ro.observer);
    });
    ro.activeTargets.splice(0, ro.activeTargets.length);
  });
  for (var _i = 0, callbacks_1 = callbacks2; _i < callbacks_1.length; _i++) {
    var callback = callbacks_1[_i];
    callback();
  }
  return shallowestDepth;
};
var gatherActiveObservationsAtDepth = function(depth) {
  resizeObservers.forEach(function processObserver(ro) {
    ro.activeTargets.splice(0, ro.activeTargets.length);
    ro.skippedTargets.splice(0, ro.skippedTargets.length);
    ro.observationTargets.forEach(function processTarget(ot) {
      if (ot.isActive()) {
        if (calculateDepthForNode(ot.target) > depth) {
          ro.activeTargets.push(ot);
        } else {
          ro.skippedTargets.push(ot);
        }
      }
    });
  });
};
var process = function() {
  var depth = 0;
  gatherActiveObservationsAtDepth(depth);
  while (hasActiveObservations()) {
    depth = broadcastActiveObservations();
    gatherActiveObservationsAtDepth(depth);
  }
  if (hasSkippedObservations()) {
    deliverResizeLoopError();
  }
  return depth > 0;
};
var trigger;
var callbacks = [];
var notify = function() {
  return callbacks.splice(0).forEach(function(cb) {
    return cb();
  });
};
var queueMicroTask = function(callback) {
  if (!trigger) {
    var toggle_1 = 0;
    var el_1 = document.createTextNode("");
    var config = { characterData: true };
    new MutationObserver(function() {
      return notify();
    }).observe(el_1, config);
    trigger = function() {
      el_1.textContent = "".concat(toggle_1 ? toggle_1-- : toggle_1++);
    };
  }
  callbacks.push(callback);
  trigger();
};
var queueResizeObserver = function(cb) {
  queueMicroTask(function ResizeObserver2() {
    requestAnimationFrame(cb);
  });
};
var watching = 0;
var isWatching = function() {
  return !!watching;
};
var CATCH_PERIOD = 250;
var observerConfig = { attributes: true, characterData: true, childList: true, subtree: true };
var events = [
  "resize",
  "load",
  "transitionend",
  "animationend",
  "animationstart",
  "animationiteration",
  "keyup",
  "keydown",
  "mouseup",
  "mousedown",
  "mouseover",
  "mouseout",
  "blur",
  "focus"
];
var time = function(timeout) {
  if (timeout === void 0) {
    timeout = 0;
  }
  return Date.now() + timeout;
};
var scheduled = false;
var Scheduler = (function() {
  function Scheduler2() {
    var _this = this;
    this.stopped = true;
    this.listener = function() {
      return _this.schedule();
    };
  }
  Scheduler2.prototype.run = function(timeout) {
    var _this = this;
    if (timeout === void 0) {
      timeout = CATCH_PERIOD;
    }
    if (scheduled) {
      return;
    }
    scheduled = true;
    var until = time(timeout);
    queueResizeObserver(function() {
      var elementsHaveResized = false;
      try {
        elementsHaveResized = process();
      } finally {
        scheduled = false;
        timeout = until - time();
        if (!isWatching()) {
          return;
        }
        if (elementsHaveResized) {
          _this.run(1e3);
        } else if (timeout > 0) {
          _this.run(timeout);
        } else {
          _this.start();
        }
      }
    });
  };
  Scheduler2.prototype.schedule = function() {
    this.stop();
    this.run();
  };
  Scheduler2.prototype.observe = function() {
    var _this = this;
    var cb = function() {
      return _this.observer && _this.observer.observe(document.body, observerConfig);
    };
    document.body ? cb() : global.addEventListener("DOMContentLoaded", cb);
  };
  Scheduler2.prototype.start = function() {
    var _this = this;
    if (this.stopped) {
      this.stopped = false;
      this.observer = new MutationObserver(this.listener);
      this.observe();
      events.forEach(function(name) {
        return global.addEventListener(name, _this.listener, true);
      });
    }
  };
  Scheduler2.prototype.stop = function() {
    var _this = this;
    if (!this.stopped) {
      this.observer && this.observer.disconnect();
      events.forEach(function(name) {
        return global.removeEventListener(name, _this.listener, true);
      });
      this.stopped = true;
    }
  };
  return Scheduler2;
})();
var scheduler = new Scheduler();
var updateCount = function(n) {
  !watching && n > 0 && scheduler.start();
  watching += n;
  !watching && scheduler.stop();
};
var skipNotifyOnElement = function(target) {
  return !isSVG(target) && !isReplacedElement(target) && getComputedStyle(target).display === "inline";
};
var ResizeObservation = (function() {
  function ResizeObservation2(target, observedBox) {
    this.target = target;
    this.observedBox = observedBox || ResizeObserverBoxOptions.CONTENT_BOX;
    this.lastReportedSize = {
      inlineSize: 0,
      blockSize: 0
    };
  }
  ResizeObservation2.prototype.isActive = function() {
    var size2 = calculateBoxSize(this.target, this.observedBox, true);
    if (skipNotifyOnElement(this.target)) {
      this.lastReportedSize = size2;
    }
    if (this.lastReportedSize.inlineSize !== size2.inlineSize || this.lastReportedSize.blockSize !== size2.blockSize) {
      return true;
    }
    return false;
  };
  return ResizeObservation2;
})();
var ResizeObserverDetail = /* @__PURE__ */ (function() {
  function ResizeObserverDetail2(resizeObserver, callback) {
    this.activeTargets = [];
    this.skippedTargets = [];
    this.observationTargets = [];
    this.observer = resizeObserver;
    this.callback = callback;
  }
  return ResizeObserverDetail2;
})();
var observerMap = /* @__PURE__ */ new WeakMap();
var getObservationIndex = function(observationTargets, target) {
  for (var i = 0; i < observationTargets.length; i += 1) {
    if (observationTargets[i].target === target) {
      return i;
    }
  }
  return -1;
};
var ResizeObserverController = (function() {
  function ResizeObserverController2() {
  }
  ResizeObserverController2.connect = function(resizeObserver, callback) {
    var detail = new ResizeObserverDetail(resizeObserver, callback);
    observerMap.set(resizeObserver, detail);
  };
  ResizeObserverController2.observe = function(resizeObserver, target, options) {
    var detail = observerMap.get(resizeObserver);
    var firstObservation = detail.observationTargets.length === 0;
    if (getObservationIndex(detail.observationTargets, target) < 0) {
      firstObservation && resizeObservers.push(detail);
      detail.observationTargets.push(new ResizeObservation(target, options && options.box));
      updateCount(1);
      scheduler.schedule();
    }
  };
  ResizeObserverController2.unobserve = function(resizeObserver, target) {
    var detail = observerMap.get(resizeObserver);
    var index = getObservationIndex(detail.observationTargets, target);
    var lastObservation = detail.observationTargets.length === 1;
    if (index >= 0) {
      lastObservation && resizeObservers.splice(resizeObservers.indexOf(detail), 1);
      detail.observationTargets.splice(index, 1);
      updateCount(-1);
    }
  };
  ResizeObserverController2.disconnect = function(resizeObserver) {
    var _this = this;
    var detail = observerMap.get(resizeObserver);
    detail.observationTargets.slice().forEach(function(ot) {
      return _this.unobserve(resizeObserver, ot.target);
    });
    detail.activeTargets.splice(0, detail.activeTargets.length);
  };
  return ResizeObserverController2;
})();
var ResizeObserver = (function() {
  function ResizeObserver2(callback) {
    if (arguments.length === 0) {
      throw new TypeError("Failed to construct 'ResizeObserver': 1 argument required, but only 0 present.");
    }
    if (typeof callback !== "function") {
      throw new TypeError("Failed to construct 'ResizeObserver': The callback provided as parameter 1 is not a function.");
    }
    ResizeObserverController.connect(this, callback);
  }
  ResizeObserver2.prototype.observe = function(target, options) {
    if (arguments.length === 0) {
      throw new TypeError("Failed to execute 'observe' on 'ResizeObserver': 1 argument required, but only 0 present.");
    }
    if (!isElement(target)) {
      throw new TypeError("Failed to execute 'observe' on 'ResizeObserver': parameter 1 is not of type 'Element");
    }
    ResizeObserverController.observe(this, target, options);
  };
  ResizeObserver2.prototype.unobserve = function(target) {
    if (arguments.length === 0) {
      throw new TypeError("Failed to execute 'unobserve' on 'ResizeObserver': 1 argument required, but only 0 present.");
    }
    if (!isElement(target)) {
      throw new TypeError("Failed to execute 'unobserve' on 'ResizeObserver': parameter 1 is not of type 'Element");
    }
    ResizeObserverController.unobserve(this, target);
  };
  ResizeObserver2.prototype.disconnect = function() {
    ResizeObserverController.disconnect(this);
  };
  ResizeObserver2.toString = function() {
    return "function ResizeObserver () { [polyfill code] }";
  };
  return ResizeObserver2;
})();
class ResizeObserverDelegate {
  constructor() {
    this.handleResize = this.handleResize.bind(this);
    this.observer = new (typeof window !== "undefined" && window.ResizeObserver || ResizeObserver)(this.handleResize);
    this.elHandlersMap = /* @__PURE__ */ new Map();
  }
  handleResize(entries) {
    for (const entry of entries) {
      const handler = this.elHandlersMap.get(entry.target);
      if (handler !== void 0) {
        handler(entry);
      }
    }
  }
  registerHandler(el, handler) {
    this.elHandlersMap.set(el, handler);
    this.observer.observe(el);
  }
  unregisterHandler(el) {
    if (!this.elHandlersMap.has(el)) {
      return;
    }
    this.elHandlersMap.delete(el);
    this.observer.unobserve(el);
  }
}
const resizeObserverManager = new ResizeObserverDelegate();
const VResizeObserver = defineComponent({
  name: "ResizeObserver",
  props: {
    onResize: Function
  },
  setup(props) {
    let registered = false;
    const proxy = getCurrentInstance().proxy;
    function handleResize(entry) {
      const { onResize } = props;
      if (onResize !== void 0)
        onResize(entry);
    }
    onMounted(() => {
      const el = proxy.$el;
      if (el === void 0) {
        warn$1("resize-observer", "$el does not exist.");
        return;
      }
      if (el.nextElementSibling !== el.nextSibling) {
        if (el.nodeType === 3 && el.nodeValue !== "") {
          warn$1("resize-observer", "$el can not be observed (it may be a text node).");
          return;
        }
      }
      if (el.nextElementSibling !== null) {
        resizeObserverManager.registerHandler(el.nextElementSibling, handleResize);
        registered = true;
      }
    });
    onBeforeUnmount(() => {
      if (registered) {
        resizeObserverManager.unregisterHandler(proxy.$el.nextElementSibling);
      }
    });
  },
  render() {
    return renderSlot(this.$slots, "default");
  }
});
function isHTMLElement(node) {
  return node instanceof HTMLElement;
}
function focusFirstDescendant(node) {
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    if (isHTMLElement(child)) {
      if (attemptFocus(child) || focusFirstDescendant(child)) {
        return true;
      }
    }
  }
  return false;
}
function focusLastDescendant(element) {
  for (let i = element.childNodes.length - 1; i >= 0; i--) {
    const child = element.childNodes[i];
    if (isHTMLElement(child)) {
      if (attemptFocus(child) || focusLastDescendant(child)) {
        return true;
      }
    }
  }
  return false;
}
function attemptFocus(element) {
  if (!isFocusable(element)) {
    return false;
  }
  try {
    element.focus({ preventScroll: true });
  } catch (e) {
  }
  return document.activeElement === element;
}
function isFocusable(element) {
  if (element.tabIndex > 0 || element.tabIndex === 0 && element.getAttribute("tabIndex") !== null) {
    return true;
  }
  if (element.getAttribute("disabled")) {
    return false;
  }
  switch (element.nodeName) {
    case "A":
      return !!element.href && element.rel !== "ignore";
    case "INPUT":
      return element.type !== "hidden" && element.type !== "file";
    case "BUTTON":
    case "SELECT":
    case "TEXTAREA":
      return true;
    default:
      return false;
  }
}
let stack = [];
const FocusTrap = defineComponent({
  name: "FocusTrap",
  props: {
    disabled: Boolean,
    active: Boolean,
    autoFocus: {
      type: Boolean,
      default: true
    },
    onEsc: Function,
    initialFocusTo: String,
    finalFocusTo: String,
    returnFocusOnDeactivated: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    const id = createId();
    const focusableStartRef = ref(null);
    const focusableEndRef = ref(null);
    let activated = false;
    let ignoreInternalFocusChange = false;
    const lastFocusedElement = typeof document === "undefined" ? null : document.activeElement;
    function isCurrentActive() {
      const currentActiveId = stack[stack.length - 1];
      return currentActiveId === id;
    }
    function handleDocumentKeydown(e) {
      var _a;
      if (e.code === "Escape") {
        if (isCurrentActive()) {
          (_a = props.onEsc) === null || _a === void 0 ? void 0 : _a.call(props, e);
        }
      }
    }
    onMounted(() => {
      watch(() => props.active, (value) => {
        if (value) {
          activate();
          on("keydown", document, handleDocumentKeydown);
        } else {
          off("keydown", document, handleDocumentKeydown);
          if (activated) {
            deactivate();
          }
        }
      }, {
        immediate: true
      });
    });
    onBeforeUnmount(() => {
      off("keydown", document, handleDocumentKeydown);
      if (activated)
        deactivate();
    });
    function handleDocumentFocus(e) {
      if (ignoreInternalFocusChange)
        return;
      if (isCurrentActive()) {
        const mainEl = getMainEl();
        if (mainEl === null)
          return;
        if (mainEl.contains(getPreciseEventTarget(e)))
          return;
        resetFocusTo("first");
      }
    }
    function getMainEl() {
      const focusableStartEl = focusableStartRef.value;
      if (focusableStartEl === null)
        return null;
      let mainEl = focusableStartEl;
      while (true) {
        mainEl = mainEl.nextSibling;
        if (mainEl === null)
          break;
        if (mainEl instanceof Element && mainEl.tagName === "DIV") {
          break;
        }
      }
      return mainEl;
    }
    function activate() {
      var _a;
      if (props.disabled)
        return;
      stack.push(id);
      if (props.autoFocus) {
        const { initialFocusTo } = props;
        if (initialFocusTo === void 0) {
          resetFocusTo("first");
        } else {
          (_a = resolveTo(initialFocusTo)) === null || _a === void 0 ? void 0 : _a.focus({ preventScroll: true });
        }
      }
      activated = true;
      document.addEventListener("focus", handleDocumentFocus, true);
    }
    function deactivate() {
      var _a;
      if (props.disabled)
        return;
      document.removeEventListener("focus", handleDocumentFocus, true);
      stack = stack.filter((idInStack) => idInStack !== id);
      if (isCurrentActive())
        return;
      const { finalFocusTo } = props;
      if (finalFocusTo !== void 0) {
        (_a = resolveTo(finalFocusTo)) === null || _a === void 0 ? void 0 : _a.focus({ preventScroll: true });
      } else if (props.returnFocusOnDeactivated) {
        if (lastFocusedElement instanceof HTMLElement) {
          ignoreInternalFocusChange = true;
          lastFocusedElement.focus({ preventScroll: true });
          ignoreInternalFocusChange = false;
        }
      }
    }
    function resetFocusTo(target) {
      if (!isCurrentActive())
        return;
      if (props.active) {
        const focusableStartEl = focusableStartRef.value;
        const focusableEndEl = focusableEndRef.value;
        if (focusableStartEl !== null && focusableEndEl !== null) {
          const mainEl = getMainEl();
          if (mainEl == null || mainEl === focusableEndEl) {
            ignoreInternalFocusChange = true;
            focusableStartEl.focus({ preventScroll: true });
            ignoreInternalFocusChange = false;
            return;
          }
          ignoreInternalFocusChange = true;
          const focused = target === "first" ? focusFirstDescendant(mainEl) : focusLastDescendant(mainEl);
          ignoreInternalFocusChange = false;
          if (!focused) {
            ignoreInternalFocusChange = true;
            focusableStartEl.focus({ preventScroll: true });
            ignoreInternalFocusChange = false;
          }
        }
      }
    }
    function handleStartFocus(e) {
      if (ignoreInternalFocusChange)
        return;
      const mainEl = getMainEl();
      if (mainEl === null)
        return;
      if (e.relatedTarget !== null && mainEl.contains(e.relatedTarget)) {
        resetFocusTo("last");
      } else {
        resetFocusTo("first");
      }
    }
    function handleEndFocus(e) {
      if (ignoreInternalFocusChange)
        return;
      if (e.relatedTarget !== null && e.relatedTarget === focusableStartRef.value) {
        resetFocusTo("last");
      } else {
        resetFocusTo("first");
      }
    }
    return {
      focusableStartRef,
      focusableEndRef,
      focusableStyle: "position: absolute; height: 0; width: 0;",
      handleStartFocus,
      handleEndFocus
    };
  },
  render() {
    const { default: defaultSlot } = this.$slots;
    if (defaultSlot === void 0)
      return null;
    if (this.disabled)
      return defaultSlot();
    const { active, focusableStyle } = this;
    return h(Fragment, null, [
      h("div", {
        "aria-hidden": "true",
        tabindex: active ? "0" : "-1",
        ref: "focusableStartRef",
        style: focusableStyle,
        onFocus: this.handleStartFocus
      }),
      defaultSlot(),
      h("div", {
        "aria-hidden": "true",
        style: focusableStyle,
        ref: "focusableEndRef",
        tabindex: active ? "0" : "-1",
        onFocus: this.handleEndFocus
      })
    ]);
  }
});
const pureNumberRegex = /^(\d|\.)+$/;
const numberRegex = /(\d|\.)+/;
function formatLength(length, {
  c: c2 = 1,
  offset = 0,
  attachPx = true
} = {}) {
  if (typeof length === "number") {
    const result = (length + offset) * c2;
    if (result === 0) return "0";
    return `${result}px`;
  } else if (typeof length === "string") {
    if (pureNumberRegex.test(length)) {
      const result = (Number(length) + offset) * c2;
      if (attachPx) {
        if (result === 0) return "0";
        return `${result}px`;
      } else {
        return `${result}`;
      }
    } else {
      const result = numberRegex.exec(length);
      if (!result) return length;
      return length.replace(numberRegex, String((Number(result[0]) + offset) * c2));
    }
  }
  return length;
}
function rtlInset(inset) {
  const {
    left,
    right,
    top,
    bottom
  } = getMargin(inset);
  return `${top} ${left} ${bottom} ${right}`;
}
let _isJsdom;
function isJsdom() {
  if (_isJsdom === void 0) {
    _isJsdom = navigator.userAgent.includes("Node.js") || navigator.userAgent.includes("jsdom");
  }
  return _isJsdom;
}
const warnedMessages = /* @__PURE__ */ new Set();
function warnOnce(location, message) {
  const mergedMessage = `[naive/${location}]: ${message}`;
  if (warnedMessages.has(mergedMessage)) return;
  warnedMessages.add(mergedMessage);
  console.error(mergedMessage);
}
function warn(location, message) {
  console.error(`[naive/${location}]: ${message}`);
}
function throwError(location, message) {
  throw new Error(`[naive/${location}]: ${message}`);
}
function call(funcs, ...args) {
  if (Array.isArray(funcs)) {
    funcs.forEach((func) => call(func, ...args));
  } else {
    return funcs(...args);
  }
}
function createRefSetter(ref2) {
  return (inst) => {
    if (inst) {
      ref2.value = inst.$el;
    } else {
      ref2.value = null;
    }
  };
}
function flatten$1(vNodes, filterCommentNode = true, result = []) {
  vNodes.forEach((vNode) => {
    if (vNode === null) return;
    if (typeof vNode !== "object") {
      if (typeof vNode === "string" || typeof vNode === "number") {
        result.push(createTextVNode(String(vNode)));
      }
      return;
    }
    if (Array.isArray(vNode)) {
      flatten$1(vNode, filterCommentNode, result);
      return;
    }
    if (vNode.type === Fragment) {
      if (vNode.children === null) return;
      if (Array.isArray(vNode.children)) {
        flatten$1(vNode.children, filterCommentNode, result);
      }
    } else {
      if (vNode.type === Comment && filterCommentNode) return;
      result.push(vNode);
    }
  });
  return result;
}
function getFirstSlotVNode(slots, slotName = "default", props = void 0) {
  const slot = slots[slotName];
  if (!slot) {
    warn("getFirstSlotVNode", `slot[${slotName}] is empty`);
    return null;
  }
  const slotContent = flatten$1(slot(props));
  if (slotContent.length === 1) {
    return slotContent[0];
  } else {
    warn("getFirstSlotVNode", `slot[${slotName}] should have exactly one child`);
    return null;
  }
}
function keep(object, keys2 = [], rest) {
  const keepedObject = {};
  keys2.forEach((key) => {
    keepedObject[key] = object[key];
  });
  return Object.assign(keepedObject, rest);
}
function render(r, ...args) {
  if (typeof r === "function") {
    return r(...args);
  } else if (typeof r === "string") {
    return createTextVNode(r);
  } else if (typeof r === "number") {
    return createTextVNode(String(r));
  } else {
    return null;
  }
}
function ensureValidVNode(vnodes) {
  return vnodes.some((child) => {
    if (!isVNode(child)) {
      return true;
    }
    if (child.type === Comment) {
      return false;
    }
    if (child.type === Fragment && !ensureValidVNode(child.children)) {
      return false;
    }
    return true;
  }) ? vnodes : null;
}
function resolveWrappedSlot(slot, wrapper) {
  const children = slot && ensureValidVNode(slot());
  return wrapper(children || null);
}
function isSlotEmpty(slot) {
  return !(slot && ensureValidVNode(slot()));
}
const Wrapper = defineComponent({
  render() {
    var _a, _b;
    return (_b = (_a = this.$slots).default) === null || _b === void 0 ? void 0 : _b.call(_a);
  }
});
const configProviderInjectionKey = createInjectionKey("n-config-provider");
const defaultClsPrefix = "n";
function useConfig(props = {}, options = {
  defaultBordered: true
}) {
  const NConfigProvider = inject(configProviderInjectionKey, null);
  return {
    // NConfigProvider,
    inlineThemeDisabled: NConfigProvider === null || NConfigProvider === void 0 ? void 0 : NConfigProvider.inlineThemeDisabled,
    mergedRtlRef: NConfigProvider === null || NConfigProvider === void 0 ? void 0 : NConfigProvider.mergedRtlRef,
    mergedComponentPropsRef: NConfigProvider === null || NConfigProvider === void 0 ? void 0 : NConfigProvider.mergedComponentPropsRef,
    mergedBreakpointsRef: NConfigProvider === null || NConfigProvider === void 0 ? void 0 : NConfigProvider.mergedBreakpointsRef,
    mergedBorderedRef: computed(() => {
      var _a, _b;
      const {
        bordered
      } = props;
      if (bordered !== void 0) return bordered;
      return (_b = (_a = NConfigProvider === null || NConfigProvider === void 0 ? void 0 : NConfigProvider.mergedBorderedRef.value) !== null && _a !== void 0 ? _a : options.defaultBordered) !== null && _b !== void 0 ? _b : true;
    }),
    mergedClsPrefixRef: NConfigProvider ? NConfigProvider.mergedClsPrefixRef : shallowRef(defaultClsPrefix),
    namespaceRef: computed(() => NConfigProvider === null || NConfigProvider === void 0 ? void 0 : NConfigProvider.mergedNamespaceRef.value)
  };
}
function useThemeClass(componentName, hashRef, cssVarsRef, props) {
  if (!cssVarsRef) throwError("useThemeClass", "cssVarsRef is not passed");
  const NConfigProvider = inject(configProviderInjectionKey, null);
  const mergedThemeHashRef = NConfigProvider === null || NConfigProvider === void 0 ? void 0 : NConfigProvider.mergedThemeHashRef;
  const styleMountTarget = NConfigProvider === null || NConfigProvider === void 0 ? void 0 : NConfigProvider.styleMountTarget;
  const themeClassRef = ref("");
  const ssrAdapter2 = useSsrAdapter();
  let renderCallback;
  const hashClassPrefix = `__${componentName}`;
  const mountStyle = () => {
    let finalThemeHash = hashClassPrefix;
    const hashValue = hashRef ? hashRef.value : void 0;
    const themeHash = mergedThemeHashRef === null || mergedThemeHashRef === void 0 ? void 0 : mergedThemeHashRef.value;
    if (themeHash) finalThemeHash += `-${themeHash}`;
    if (hashValue) finalThemeHash += `-${hashValue}`;
    const {
      themeOverrides,
      builtinThemeOverrides
    } = props;
    if (themeOverrides) {
      finalThemeHash += `-${murmur2(JSON.stringify(themeOverrides))}`;
    }
    if (builtinThemeOverrides) {
      finalThemeHash += `-${murmur2(JSON.stringify(builtinThemeOverrides))}`;
    }
    themeClassRef.value = finalThemeHash;
    renderCallback = () => {
      const cssVars = cssVarsRef.value;
      let style2 = "";
      for (const key in cssVars) {
        style2 += `${key}: ${cssVars[key]};`;
      }
      c$1(`.${finalThemeHash}`, style2).mount({
        id: finalThemeHash,
        ssr: ssrAdapter2,
        parent: styleMountTarget
      });
      renderCallback = void 0;
    };
  };
  watchEffect(() => {
    mountStyle();
  });
  return {
    themeClass: themeClassRef,
    onRender: () => {
      renderCallback === null || renderCallback === void 0 ? void 0 : renderCallback();
    }
  };
}
var freeGlobal = typeof global$1 == "object" && global$1 && global$1.Object === Object && global$1;
var freeSelf = typeof self == "object" && self && self.Object === Object && self;
var root = freeGlobal || freeSelf || Function("return this")();
var Symbol$1 = root.Symbol;
var objectProto$e = Object.prototype;
var hasOwnProperty$b = objectProto$e.hasOwnProperty;
var nativeObjectToString$1 = objectProto$e.toString;
var symToStringTag$1 = Symbol$1 ? Symbol$1.toStringTag : void 0;
function getRawTag(value) {
  var isOwn = hasOwnProperty$b.call(value, symToStringTag$1), tag = value[symToStringTag$1];
  try {
    value[symToStringTag$1] = void 0;
    var unmasked = true;
  } catch (e) {
  }
  var result = nativeObjectToString$1.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag$1] = tag;
    } else {
      delete value[symToStringTag$1];
    }
  }
  return result;
}
var objectProto$d = Object.prototype;
var nativeObjectToString = objectProto$d.toString;
function objectToString(value) {
  return nativeObjectToString.call(value);
}
var nullTag = "[object Null]", undefinedTag = "[object Undefined]";
var symToStringTag = Symbol$1 ? Symbol$1.toStringTag : void 0;
function baseGetTag(value) {
  if (value == null) {
    return value === void 0 ? undefinedTag : nullTag;
  }
  return symToStringTag && symToStringTag in Object(value) ? getRawTag(value) : objectToString(value);
}
function isObjectLike(value) {
  return value != null && typeof value == "object";
}
var symbolTag$1 = "[object Symbol]";
function isSymbol(value) {
  return typeof value == "symbol" || isObjectLike(value) && baseGetTag(value) == symbolTag$1;
}
function arrayMap(array, iteratee) {
  var index = -1, length = array == null ? 0 : array.length, result = Array(length);
  while (++index < length) {
    result[index] = iteratee(array[index], index, array);
  }
  return result;
}
var isArray = Array.isArray;
var symbolProto$1 = Symbol$1 ? Symbol$1.prototype : void 0, symbolToString = symbolProto$1 ? symbolProto$1.toString : void 0;
function baseToString(value) {
  if (typeof value == "string") {
    return value;
  }
  if (isArray(value)) {
    return arrayMap(value, baseToString) + "";
  }
  if (isSymbol(value)) {
    return symbolToString ? symbolToString.call(value) : "";
  }
  var result = value + "";
  return result == "0" && 1 / value == -Infinity ? "-0" : result;
}
function isObject(value) {
  var type = typeof value;
  return value != null && (type == "object" || type == "function");
}
function identity(value) {
  return value;
}
var asyncTag = "[object AsyncFunction]", funcTag$1 = "[object Function]", genTag = "[object GeneratorFunction]", proxyTag = "[object Proxy]";
function isFunction(value) {
  if (!isObject(value)) {
    return false;
  }
  var tag = baseGetTag(value);
  return tag == funcTag$1 || tag == genTag || tag == asyncTag || tag == proxyTag;
}
var coreJsData = root["__core-js_shared__"];
var maskSrcKey = (function() {
  var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || "");
  return uid ? "Symbol(src)_1." + uid : "";
})();
function isMasked(func) {
  return !!maskSrcKey && maskSrcKey in func;
}
var funcProto$2 = Function.prototype;
var funcToString$2 = funcProto$2.toString;
function toSource(func) {
  if (func != null) {
    try {
      return funcToString$2.call(func);
    } catch (e) {
    }
    try {
      return func + "";
    } catch (e) {
    }
  }
  return "";
}
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
var reIsHostCtor = /^\[object .+?Constructor\]$/;
var funcProto$1 = Function.prototype, objectProto$c = Object.prototype;
var funcToString$1 = funcProto$1.toString;
var hasOwnProperty$a = objectProto$c.hasOwnProperty;
var reIsNative = RegExp(
  "^" + funcToString$1.call(hasOwnProperty$a).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
);
function baseIsNative(value) {
  if (!isObject(value) || isMasked(value)) {
    return false;
  }
  var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource(value));
}
function getValue(object, key) {
  return object == null ? void 0 : object[key];
}
function getNative(object, key) {
  var value = getValue(object, key);
  return baseIsNative(value) ? value : void 0;
}
var WeakMap$1 = getNative(root, "WeakMap");
var objectCreate = Object.create;
var baseCreate = /* @__PURE__ */ (function() {
  function object() {
  }
  return function(proto) {
    if (!isObject(proto)) {
      return {};
    }
    if (objectCreate) {
      return objectCreate(proto);
    }
    object.prototype = proto;
    var result = new object();
    object.prototype = void 0;
    return result;
  };
})();
function apply(func, thisArg, args) {
  switch (args.length) {
    case 0:
      return func.call(thisArg);
    case 1:
      return func.call(thisArg, args[0]);
    case 2:
      return func.call(thisArg, args[0], args[1]);
    case 3:
      return func.call(thisArg, args[0], args[1], args[2]);
  }
  return func.apply(thisArg, args);
}
function copyArray(source, array) {
  var index = -1, length = source.length;
  array || (array = Array(length));
  while (++index < length) {
    array[index] = source[index];
  }
  return array;
}
var HOT_COUNT = 800, HOT_SPAN = 16;
var nativeNow = Date.now;
function shortOut(func) {
  var count = 0, lastCalled = 0;
  return function() {
    var stamp = nativeNow(), remaining = HOT_SPAN - (stamp - lastCalled);
    lastCalled = stamp;
    if (remaining > 0) {
      if (++count >= HOT_COUNT) {
        return arguments[0];
      }
    } else {
      count = 0;
    }
    return func.apply(void 0, arguments);
  };
}
function constant(value) {
  return function() {
    return value;
  };
}
var defineProperty = (function() {
  try {
    var func = getNative(Object, "defineProperty");
    func({}, "", {});
    return func;
  } catch (e) {
  }
})();
var baseSetToString = !defineProperty ? identity : function(func, string) {
  return defineProperty(func, "toString", {
    "configurable": true,
    "enumerable": false,
    "value": constant(string),
    "writable": true
  });
};
var setToString = shortOut(baseSetToString);
var MAX_SAFE_INTEGER$1 = 9007199254740991;
var reIsUint = /^(?:0|[1-9]\d*)$/;
function isIndex(value, length) {
  var type = typeof value;
  length = length == null ? MAX_SAFE_INTEGER$1 : length;
  return !!length && (type == "number" || type != "symbol" && reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
}
function baseAssignValue(object, key, value) {
  if (key == "__proto__" && defineProperty) {
    defineProperty(object, key, {
      "configurable": true,
      "enumerable": true,
      "value": value,
      "writable": true
    });
  } else {
    object[key] = value;
  }
}
function eq(value, other) {
  return value === other || value !== value && other !== other;
}
var objectProto$b = Object.prototype;
var hasOwnProperty$9 = objectProto$b.hasOwnProperty;
function assignValue(object, key, value) {
  var objValue = object[key];
  if (!(hasOwnProperty$9.call(object, key) && eq(objValue, value)) || value === void 0 && !(key in object)) {
    baseAssignValue(object, key, value);
  }
}
function copyObject(source, props, object, customizer) {
  var isNew = !object;
  object || (object = {});
  var index = -1, length = props.length;
  while (++index < length) {
    var key = props[index];
    var newValue = void 0;
    if (newValue === void 0) {
      newValue = source[key];
    }
    if (isNew) {
      baseAssignValue(object, key, newValue);
    } else {
      assignValue(object, key, newValue);
    }
  }
  return object;
}
var nativeMax = Math.max;
function overRest(func, start, transform) {
  start = nativeMax(start === void 0 ? func.length - 1 : start, 0);
  return function() {
    var args = arguments, index = -1, length = nativeMax(args.length - start, 0), array = Array(length);
    while (++index < length) {
      array[index] = args[start + index];
    }
    index = -1;
    var otherArgs = Array(start + 1);
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = transform(array);
    return apply(func, this, otherArgs);
  };
}
function baseRest(func, start) {
  return setToString(overRest(func, start, identity), func + "");
}
var MAX_SAFE_INTEGER = 9007199254740991;
function isLength(value) {
  return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}
function isArrayLike(value) {
  return value != null && isLength(value.length) && !isFunction(value);
}
function isIterateeCall(value, index, object) {
  if (!isObject(object)) {
    return false;
  }
  var type = typeof index;
  if (type == "number" ? isArrayLike(object) && isIndex(index, object.length) : type == "string" && index in object) {
    return eq(object[index], value);
  }
  return false;
}
function createAssigner(assigner) {
  return baseRest(function(object, sources) {
    var index = -1, length = sources.length, customizer = length > 1 ? sources[length - 1] : void 0, guard = length > 2 ? sources[2] : void 0;
    customizer = assigner.length > 3 && typeof customizer == "function" ? (length--, customizer) : void 0;
    if (guard && isIterateeCall(sources[0], sources[1], guard)) {
      customizer = length < 3 ? void 0 : customizer;
      length = 1;
    }
    object = Object(object);
    while (++index < length) {
      var source = sources[index];
      if (source) {
        assigner(object, source, index, customizer);
      }
    }
    return object;
  });
}
var objectProto$a = Object.prototype;
function isPrototype(value) {
  var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto$a;
  return value === proto;
}
function baseTimes(n, iteratee) {
  var index = -1, result = Array(n);
  while (++index < n) {
    result[index] = iteratee(index);
  }
  return result;
}
var argsTag$2 = "[object Arguments]";
function baseIsArguments(value) {
  return isObjectLike(value) && baseGetTag(value) == argsTag$2;
}
var objectProto$9 = Object.prototype;
var hasOwnProperty$8 = objectProto$9.hasOwnProperty;
var propertyIsEnumerable$1 = objectProto$9.propertyIsEnumerable;
var isArguments = baseIsArguments(/* @__PURE__ */ (function() {
  return arguments;
})()) ? baseIsArguments : function(value) {
  return isObjectLike(value) && hasOwnProperty$8.call(value, "callee") && !propertyIsEnumerable$1.call(value, "callee");
};
function stubFalse() {
  return false;
}
var freeExports$2 = typeof exports == "object" && exports && !exports.nodeType && exports;
var freeModule$2 = freeExports$2 && typeof module == "object" && module && !module.nodeType && module;
var moduleExports$2 = freeModule$2 && freeModule$2.exports === freeExports$2;
var Buffer$1 = moduleExports$2 ? root.Buffer : void 0;
var nativeIsBuffer = Buffer$1 ? Buffer$1.isBuffer : void 0;
var isBuffer = nativeIsBuffer || stubFalse;
var argsTag$1 = "[object Arguments]", arrayTag$1 = "[object Array]", boolTag$1 = "[object Boolean]", dateTag$1 = "[object Date]", errorTag$1 = "[object Error]", funcTag = "[object Function]", mapTag$2 = "[object Map]", numberTag$1 = "[object Number]", objectTag$3 = "[object Object]", regexpTag$1 = "[object RegExp]", setTag$2 = "[object Set]", stringTag$1 = "[object String]", weakMapTag$1 = "[object WeakMap]";
var arrayBufferTag$1 = "[object ArrayBuffer]", dataViewTag$2 = "[object DataView]", float32Tag = "[object Float32Array]", float64Tag = "[object Float64Array]", int8Tag = "[object Int8Array]", int16Tag = "[object Int16Array]", int32Tag = "[object Int32Array]", uint8Tag = "[object Uint8Array]", uint8ClampedTag = "[object Uint8ClampedArray]", uint16Tag = "[object Uint16Array]", uint32Tag = "[object Uint32Array]";
var typedArrayTags = {};
typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
typedArrayTags[argsTag$1] = typedArrayTags[arrayTag$1] = typedArrayTags[arrayBufferTag$1] = typedArrayTags[boolTag$1] = typedArrayTags[dataViewTag$2] = typedArrayTags[dateTag$1] = typedArrayTags[errorTag$1] = typedArrayTags[funcTag] = typedArrayTags[mapTag$2] = typedArrayTags[numberTag$1] = typedArrayTags[objectTag$3] = typedArrayTags[regexpTag$1] = typedArrayTags[setTag$2] = typedArrayTags[stringTag$1] = typedArrayTags[weakMapTag$1] = false;
function baseIsTypedArray(value) {
  return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
}
function baseUnary(func) {
  return function(value) {
    return func(value);
  };
}
var freeExports$1 = typeof exports == "object" && exports && !exports.nodeType && exports;
var freeModule$1 = freeExports$1 && typeof module == "object" && module && !module.nodeType && module;
var moduleExports$1 = freeModule$1 && freeModule$1.exports === freeExports$1;
var freeProcess = moduleExports$1 && freeGlobal.process;
var nodeUtil = (function() {
  try {
    var types = freeModule$1 && freeModule$1.require && freeModule$1.require("util").types;
    if (types) {
      return types;
    }
    return freeProcess && freeProcess.binding && freeProcess.binding("util");
  } catch (e) {
  }
})();
var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;
var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;
var objectProto$8 = Object.prototype;
var hasOwnProperty$7 = objectProto$8.hasOwnProperty;
function arrayLikeKeys(value, inherited) {
  var isArr = isArray(value), isArg = !isArr && isArguments(value), isBuff = !isArr && !isArg && isBuffer(value), isType = !isArr && !isArg && !isBuff && isTypedArray(value), skipIndexes = isArr || isArg || isBuff || isType, result = skipIndexes ? baseTimes(value.length, String) : [], length = result.length;
  for (var key in value) {
    if ((inherited || hasOwnProperty$7.call(value, key)) && !(skipIndexes && // Safari 9 has enumerable `arguments.length` in strict mode.
    (key == "length" || // Node.js 0.10 has enumerable non-index properties on buffers.
    isBuff && (key == "offset" || key == "parent") || // PhantomJS 2 has enumerable non-index properties on typed arrays.
    isType && (key == "buffer" || key == "byteLength" || key == "byteOffset") || // Skip index properties.
    isIndex(key, length)))) {
      result.push(key);
    }
  }
  return result;
}
function overArg(func, transform) {
  return function(arg) {
    return func(transform(arg));
  };
}
var nativeKeys = overArg(Object.keys, Object);
var objectProto$7 = Object.prototype;
var hasOwnProperty$6 = objectProto$7.hasOwnProperty;
function baseKeys(object) {
  if (!isPrototype(object)) {
    return nativeKeys(object);
  }
  var result = [];
  for (var key in Object(object)) {
    if (hasOwnProperty$6.call(object, key) && key != "constructor") {
      result.push(key);
    }
  }
  return result;
}
function keys(object) {
  return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
}
function nativeKeysIn(object) {
  var result = [];
  if (object != null) {
    for (var key in Object(object)) {
      result.push(key);
    }
  }
  return result;
}
var objectProto$6 = Object.prototype;
var hasOwnProperty$5 = objectProto$6.hasOwnProperty;
function baseKeysIn(object) {
  if (!isObject(object)) {
    return nativeKeysIn(object);
  }
  var isProto = isPrototype(object), result = [];
  for (var key in object) {
    if (!(key == "constructor" && (isProto || !hasOwnProperty$5.call(object, key)))) {
      result.push(key);
    }
  }
  return result;
}
function keysIn(object) {
  return isArrayLike(object) ? arrayLikeKeys(object, true) : baseKeysIn(object);
}
var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, reIsPlainProp = /^\w*$/;
function isKey(value, object) {
  if (isArray(value)) {
    return false;
  }
  var type = typeof value;
  if (type == "number" || type == "symbol" || type == "boolean" || value == null || isSymbol(value)) {
    return true;
  }
  return reIsPlainProp.test(value) || !reIsDeepProp.test(value) || object != null && value in Object(object);
}
var nativeCreate = getNative(Object, "create");
function hashClear() {
  this.__data__ = nativeCreate ? nativeCreate(null) : {};
  this.size = 0;
}
function hashDelete(key) {
  var result = this.has(key) && delete this.__data__[key];
  this.size -= result ? 1 : 0;
  return result;
}
var HASH_UNDEFINED$2 = "__lodash_hash_undefined__";
var objectProto$5 = Object.prototype;
var hasOwnProperty$4 = objectProto$5.hasOwnProperty;
function hashGet(key) {
  var data = this.__data__;
  if (nativeCreate) {
    var result = data[key];
    return result === HASH_UNDEFINED$2 ? void 0 : result;
  }
  return hasOwnProperty$4.call(data, key) ? data[key] : void 0;
}
var objectProto$4 = Object.prototype;
var hasOwnProperty$3 = objectProto$4.hasOwnProperty;
function hashHas(key) {
  var data = this.__data__;
  return nativeCreate ? data[key] !== void 0 : hasOwnProperty$3.call(data, key);
}
var HASH_UNDEFINED$1 = "__lodash_hash_undefined__";
function hashSet(key, value) {
  var data = this.__data__;
  this.size += this.has(key) ? 0 : 1;
  data[key] = nativeCreate && value === void 0 ? HASH_UNDEFINED$1 : value;
  return this;
}
function Hash(entries) {
  var index = -1, length = entries == null ? 0 : entries.length;
  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}
Hash.prototype.clear = hashClear;
Hash.prototype["delete"] = hashDelete;
Hash.prototype.get = hashGet;
Hash.prototype.has = hashHas;
Hash.prototype.set = hashSet;
function listCacheClear() {
  this.__data__ = [];
  this.size = 0;
}
function assocIndexOf(array, key) {
  var length = array.length;
  while (length--) {
    if (eq(array[length][0], key)) {
      return length;
    }
  }
  return -1;
}
var arrayProto = Array.prototype;
var splice = arrayProto.splice;
function listCacheDelete(key) {
  var data = this.__data__, index = assocIndexOf(data, key);
  if (index < 0) {
    return false;
  }
  var lastIndex = data.length - 1;
  if (index == lastIndex) {
    data.pop();
  } else {
    splice.call(data, index, 1);
  }
  --this.size;
  return true;
}
function listCacheGet(key) {
  var data = this.__data__, index = assocIndexOf(data, key);
  return index < 0 ? void 0 : data[index][1];
}
function listCacheHas(key) {
  return assocIndexOf(this.__data__, key) > -1;
}
function listCacheSet(key, value) {
  var data = this.__data__, index = assocIndexOf(data, key);
  if (index < 0) {
    ++this.size;
    data.push([key, value]);
  } else {
    data[index][1] = value;
  }
  return this;
}
function ListCache(entries) {
  var index = -1, length = entries == null ? 0 : entries.length;
  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}
ListCache.prototype.clear = listCacheClear;
ListCache.prototype["delete"] = listCacheDelete;
ListCache.prototype.get = listCacheGet;
ListCache.prototype.has = listCacheHas;
ListCache.prototype.set = listCacheSet;
var Map$1 = getNative(root, "Map");
function mapCacheClear() {
  this.size = 0;
  this.__data__ = {
    "hash": new Hash(),
    "map": new (Map$1 || ListCache)(),
    "string": new Hash()
  };
}
function isKeyable(value) {
  var type = typeof value;
  return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
}
function getMapData(map2, key) {
  var data = map2.__data__;
  return isKeyable(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
}
function mapCacheDelete(key) {
  var result = getMapData(this, key)["delete"](key);
  this.size -= result ? 1 : 0;
  return result;
}
function mapCacheGet(key) {
  return getMapData(this, key).get(key);
}
function mapCacheHas(key) {
  return getMapData(this, key).has(key);
}
function mapCacheSet(key, value) {
  var data = getMapData(this, key), size2 = data.size;
  data.set(key, value);
  this.size += data.size == size2 ? 0 : 1;
  return this;
}
function MapCache(entries) {
  var index = -1, length = entries == null ? 0 : entries.length;
  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}
MapCache.prototype.clear = mapCacheClear;
MapCache.prototype["delete"] = mapCacheDelete;
MapCache.prototype.get = mapCacheGet;
MapCache.prototype.has = mapCacheHas;
MapCache.prototype.set = mapCacheSet;
var FUNC_ERROR_TEXT = "Expected a function";
function memoize(func, resolver) {
  if (typeof func != "function" || resolver != null && typeof resolver != "function") {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  var memoized = function() {
    var args = arguments, key = resolver ? resolver.apply(this, args) : args[0], cache2 = memoized.cache;
    if (cache2.has(key)) {
      return cache2.get(key);
    }
    var result = func.apply(this, args);
    memoized.cache = cache2.set(key, result) || cache2;
    return result;
  };
  memoized.cache = new (memoize.Cache || MapCache)();
  return memoized;
}
memoize.Cache = MapCache;
var MAX_MEMOIZE_SIZE = 500;
function memoizeCapped(func) {
  var result = memoize(func, function(key) {
    if (cache2.size === MAX_MEMOIZE_SIZE) {
      cache2.clear();
    }
    return key;
  });
  var cache2 = result.cache;
  return result;
}
var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;
var reEscapeChar = /\\(\\)?/g;
var stringToPath = memoizeCapped(function(string) {
  var result = [];
  if (string.charCodeAt(0) === 46) {
    result.push("");
  }
  string.replace(rePropName, function(match, number, quote, subString) {
    result.push(quote ? subString.replace(reEscapeChar, "$1") : number || match);
  });
  return result;
});
function toString(value) {
  return value == null ? "" : baseToString(value);
}
function castPath(value, object) {
  if (isArray(value)) {
    return value;
  }
  return isKey(value, object) ? [value] : stringToPath(toString(value));
}
function toKey(value) {
  if (typeof value == "string" || isSymbol(value)) {
    return value;
  }
  var result = value + "";
  return result == "0" && 1 / value == -Infinity ? "-0" : result;
}
function baseGet(object, path) {
  path = castPath(path, object);
  var index = 0, length = path.length;
  while (object != null && index < length) {
    object = object[toKey(path[index++])];
  }
  return index && index == length ? object : void 0;
}
function get(object, path, defaultValue) {
  var result = object == null ? void 0 : baseGet(object, path);
  return result === void 0 ? defaultValue : result;
}
function arrayPush(array, values) {
  var index = -1, length = values.length, offset = array.length;
  while (++index < length) {
    array[offset + index] = values[index];
  }
  return array;
}
var getPrototype = overArg(Object.getPrototypeOf, Object);
var objectTag$2 = "[object Object]";
var funcProto = Function.prototype, objectProto$3 = Object.prototype;
var funcToString = funcProto.toString;
var hasOwnProperty$2 = objectProto$3.hasOwnProperty;
var objectCtorString = funcToString.call(Object);
function isPlainObject(value) {
  if (!isObjectLike(value) || baseGetTag(value) != objectTag$2) {
    return false;
  }
  var proto = getPrototype(value);
  if (proto === null) {
    return true;
  }
  var Ctor = hasOwnProperty$2.call(proto, "constructor") && proto.constructor;
  return typeof Ctor == "function" && Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString;
}
function stackClear() {
  this.__data__ = new ListCache();
  this.size = 0;
}
function stackDelete(key) {
  var data = this.__data__, result = data["delete"](key);
  this.size = data.size;
  return result;
}
function stackGet(key) {
  return this.__data__.get(key);
}
function stackHas(key) {
  return this.__data__.has(key);
}
var LARGE_ARRAY_SIZE = 200;
function stackSet(key, value) {
  var data = this.__data__;
  if (data instanceof ListCache) {
    var pairs = data.__data__;
    if (!Map$1 || pairs.length < LARGE_ARRAY_SIZE - 1) {
      pairs.push([key, value]);
      this.size = ++data.size;
      return this;
    }
    data = this.__data__ = new MapCache(pairs);
  }
  data.set(key, value);
  this.size = data.size;
  return this;
}
function Stack(entries) {
  var data = this.__data__ = new ListCache(entries);
  this.size = data.size;
}
Stack.prototype.clear = stackClear;
Stack.prototype["delete"] = stackDelete;
Stack.prototype.get = stackGet;
Stack.prototype.has = stackHas;
Stack.prototype.set = stackSet;
var freeExports = typeof exports == "object" && exports && !exports.nodeType && exports;
var freeModule = freeExports && typeof module == "object" && module && !module.nodeType && module;
var moduleExports = freeModule && freeModule.exports === freeExports;
var Buffer = moduleExports ? root.Buffer : void 0;
Buffer ? Buffer.allocUnsafe : void 0;
function cloneBuffer(buffer, isDeep) {
  {
    return buffer.slice();
  }
}
function arrayFilter(array, predicate) {
  var index = -1, length = array == null ? 0 : array.length, resIndex = 0, result = [];
  while (++index < length) {
    var value = array[index];
    if (predicate(value, index, array)) {
      result[resIndex++] = value;
    }
  }
  return result;
}
function stubArray() {
  return [];
}
var objectProto$2 = Object.prototype;
var propertyIsEnumerable = objectProto$2.propertyIsEnumerable;
var nativeGetSymbols = Object.getOwnPropertySymbols;
var getSymbols = !nativeGetSymbols ? stubArray : function(object) {
  if (object == null) {
    return [];
  }
  object = Object(object);
  return arrayFilter(nativeGetSymbols(object), function(symbol) {
    return propertyIsEnumerable.call(object, symbol);
  });
};
function baseGetAllKeys(object, keysFunc, symbolsFunc) {
  var result = keysFunc(object);
  return isArray(object) ? result : arrayPush(result, symbolsFunc(object));
}
function getAllKeys(object) {
  return baseGetAllKeys(object, keys, getSymbols);
}
var DataView = getNative(root, "DataView");
var Promise$1 = getNative(root, "Promise");
var Set$1 = getNative(root, "Set");
var mapTag$1 = "[object Map]", objectTag$1 = "[object Object]", promiseTag = "[object Promise]", setTag$1 = "[object Set]", weakMapTag = "[object WeakMap]";
var dataViewTag$1 = "[object DataView]";
var dataViewCtorString = toSource(DataView), mapCtorString = toSource(Map$1), promiseCtorString = toSource(Promise$1), setCtorString = toSource(Set$1), weakMapCtorString = toSource(WeakMap$1);
var getTag = baseGetTag;
if (DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag$1 || Map$1 && getTag(new Map$1()) != mapTag$1 || Promise$1 && getTag(Promise$1.resolve()) != promiseTag || Set$1 && getTag(new Set$1()) != setTag$1 || WeakMap$1 && getTag(new WeakMap$1()) != weakMapTag) {
  getTag = function(value) {
    var result = baseGetTag(value), Ctor = result == objectTag$1 ? value.constructor : void 0, ctorString = Ctor ? toSource(Ctor) : "";
    if (ctorString) {
      switch (ctorString) {
        case dataViewCtorString:
          return dataViewTag$1;
        case mapCtorString:
          return mapTag$1;
        case promiseCtorString:
          return promiseTag;
        case setCtorString:
          return setTag$1;
        case weakMapCtorString:
          return weakMapTag;
      }
    }
    return result;
  };
}
var Uint8Array = root.Uint8Array;
function cloneArrayBuffer(arrayBuffer) {
  var result = new arrayBuffer.constructor(arrayBuffer.byteLength);
  new Uint8Array(result).set(new Uint8Array(arrayBuffer));
  return result;
}
function cloneTypedArray(typedArray, isDeep) {
  var buffer = cloneArrayBuffer(typedArray.buffer);
  return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
}
function initCloneObject(object) {
  return typeof object.constructor == "function" && !isPrototype(object) ? baseCreate(getPrototype(object)) : {};
}
var HASH_UNDEFINED = "__lodash_hash_undefined__";
function setCacheAdd(value) {
  this.__data__.set(value, HASH_UNDEFINED);
  return this;
}
function setCacheHas(value) {
  return this.__data__.has(value);
}
function SetCache(values) {
  var index = -1, length = values == null ? 0 : values.length;
  this.__data__ = new MapCache();
  while (++index < length) {
    this.add(values[index]);
  }
}
SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
SetCache.prototype.has = setCacheHas;
function arraySome(array, predicate) {
  var index = -1, length = array == null ? 0 : array.length;
  while (++index < length) {
    if (predicate(array[index], index, array)) {
      return true;
    }
  }
  return false;
}
function cacheHas(cache2, key) {
  return cache2.has(key);
}
var COMPARE_PARTIAL_FLAG$5 = 1, COMPARE_UNORDERED_FLAG$3 = 2;
function equalArrays(array, other, bitmask, customizer, equalFunc, stack2) {
  var isPartial = bitmask & COMPARE_PARTIAL_FLAG$5, arrLength = array.length, othLength = other.length;
  if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
    return false;
  }
  var arrStacked = stack2.get(array);
  var othStacked = stack2.get(other);
  if (arrStacked && othStacked) {
    return arrStacked == other && othStacked == array;
  }
  var index = -1, result = true, seen = bitmask & COMPARE_UNORDERED_FLAG$3 ? new SetCache() : void 0;
  stack2.set(array, other);
  stack2.set(other, array);
  while (++index < arrLength) {
    var arrValue = array[index], othValue = other[index];
    if (customizer) {
      var compared = isPartial ? customizer(othValue, arrValue, index, other, array, stack2) : customizer(arrValue, othValue, index, array, other, stack2);
    }
    if (compared !== void 0) {
      if (compared) {
        continue;
      }
      result = false;
      break;
    }
    if (seen) {
      if (!arraySome(other, function(othValue2, othIndex) {
        if (!cacheHas(seen, othIndex) && (arrValue === othValue2 || equalFunc(arrValue, othValue2, bitmask, customizer, stack2))) {
          return seen.push(othIndex);
        }
      })) {
        result = false;
        break;
      }
    } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack2))) {
      result = false;
      break;
    }
  }
  stack2["delete"](array);
  stack2["delete"](other);
  return result;
}
function mapToArray(map2) {
  var index = -1, result = Array(map2.size);
  map2.forEach(function(value, key) {
    result[++index] = [key, value];
  });
  return result;
}
function setToArray(set) {
  var index = -1, result = Array(set.size);
  set.forEach(function(value) {
    result[++index] = value;
  });
  return result;
}
var COMPARE_PARTIAL_FLAG$4 = 1, COMPARE_UNORDERED_FLAG$2 = 2;
var boolTag = "[object Boolean]", dateTag = "[object Date]", errorTag = "[object Error]", mapTag = "[object Map]", numberTag = "[object Number]", regexpTag = "[object RegExp]", setTag = "[object Set]", stringTag = "[object String]", symbolTag = "[object Symbol]";
var arrayBufferTag = "[object ArrayBuffer]", dataViewTag = "[object DataView]";
var symbolProto = Symbol$1 ? Symbol$1.prototype : void 0, symbolValueOf = symbolProto ? symbolProto.valueOf : void 0;
function equalByTag(object, other, tag, bitmask, customizer, equalFunc, stack2) {
  switch (tag) {
    case dataViewTag:
      if (object.byteLength != other.byteLength || object.byteOffset != other.byteOffset) {
        return false;
      }
      object = object.buffer;
      other = other.buffer;
    case arrayBufferTag:
      if (object.byteLength != other.byteLength || !equalFunc(new Uint8Array(object), new Uint8Array(other))) {
        return false;
      }
      return true;
    case boolTag:
    case dateTag:
    case numberTag:
      return eq(+object, +other);
    case errorTag:
      return object.name == other.name && object.message == other.message;
    case regexpTag:
    case stringTag:
      return object == other + "";
    case mapTag:
      var convert = mapToArray;
    case setTag:
      var isPartial = bitmask & COMPARE_PARTIAL_FLAG$4;
      convert || (convert = setToArray);
      if (object.size != other.size && !isPartial) {
        return false;
      }
      var stacked = stack2.get(object);
      if (stacked) {
        return stacked == other;
      }
      bitmask |= COMPARE_UNORDERED_FLAG$2;
      stack2.set(object, other);
      var result = equalArrays(convert(object), convert(other), bitmask, customizer, equalFunc, stack2);
      stack2["delete"](object);
      return result;
    case symbolTag:
      if (symbolValueOf) {
        return symbolValueOf.call(object) == symbolValueOf.call(other);
      }
  }
  return false;
}
var COMPARE_PARTIAL_FLAG$3 = 1;
var objectProto$1 = Object.prototype;
var hasOwnProperty$1 = objectProto$1.hasOwnProperty;
function equalObjects(object, other, bitmask, customizer, equalFunc, stack2) {
  var isPartial = bitmask & COMPARE_PARTIAL_FLAG$3, objProps = getAllKeys(object), objLength = objProps.length, othProps = getAllKeys(other), othLength = othProps.length;
  if (objLength != othLength && !isPartial) {
    return false;
  }
  var index = objLength;
  while (index--) {
    var key = objProps[index];
    if (!(isPartial ? key in other : hasOwnProperty$1.call(other, key))) {
      return false;
    }
  }
  var objStacked = stack2.get(object);
  var othStacked = stack2.get(other);
  if (objStacked && othStacked) {
    return objStacked == other && othStacked == object;
  }
  var result = true;
  stack2.set(object, other);
  stack2.set(other, object);
  var skipCtor = isPartial;
  while (++index < objLength) {
    key = objProps[index];
    var objValue = object[key], othValue = other[key];
    if (customizer) {
      var compared = isPartial ? customizer(othValue, objValue, key, other, object, stack2) : customizer(objValue, othValue, key, object, other, stack2);
    }
    if (!(compared === void 0 ? objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack2) : compared)) {
      result = false;
      break;
    }
    skipCtor || (skipCtor = key == "constructor");
  }
  if (result && !skipCtor) {
    var objCtor = object.constructor, othCtor = other.constructor;
    if (objCtor != othCtor && ("constructor" in object && "constructor" in other) && !(typeof objCtor == "function" && objCtor instanceof objCtor && typeof othCtor == "function" && othCtor instanceof othCtor)) {
      result = false;
    }
  }
  stack2["delete"](object);
  stack2["delete"](other);
  return result;
}
var COMPARE_PARTIAL_FLAG$2 = 1;
var argsTag = "[object Arguments]", arrayTag = "[object Array]", objectTag = "[object Object]";
var objectProto = Object.prototype;
var hasOwnProperty = objectProto.hasOwnProperty;
function baseIsEqualDeep(object, other, bitmask, customizer, equalFunc, stack2) {
  var objIsArr = isArray(object), othIsArr = isArray(other), objTag = objIsArr ? arrayTag : getTag(object), othTag = othIsArr ? arrayTag : getTag(other);
  objTag = objTag == argsTag ? objectTag : objTag;
  othTag = othTag == argsTag ? objectTag : othTag;
  var objIsObj = objTag == objectTag, othIsObj = othTag == objectTag, isSameTag = objTag == othTag;
  if (isSameTag && isBuffer(object)) {
    if (!isBuffer(other)) {
      return false;
    }
    objIsArr = true;
    objIsObj = false;
  }
  if (isSameTag && !objIsObj) {
    stack2 || (stack2 = new Stack());
    return objIsArr || isTypedArray(object) ? equalArrays(object, other, bitmask, customizer, equalFunc, stack2) : equalByTag(object, other, objTag, bitmask, customizer, equalFunc, stack2);
  }
  if (!(bitmask & COMPARE_PARTIAL_FLAG$2)) {
    var objIsWrapped = objIsObj && hasOwnProperty.call(object, "__wrapped__"), othIsWrapped = othIsObj && hasOwnProperty.call(other, "__wrapped__");
    if (objIsWrapped || othIsWrapped) {
      var objUnwrapped = objIsWrapped ? object.value() : object, othUnwrapped = othIsWrapped ? other.value() : other;
      stack2 || (stack2 = new Stack());
      return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack2);
    }
  }
  if (!isSameTag) {
    return false;
  }
  stack2 || (stack2 = new Stack());
  return equalObjects(object, other, bitmask, customizer, equalFunc, stack2);
}
function baseIsEqual(value, other, bitmask, customizer, stack2) {
  if (value === other) {
    return true;
  }
  if (value == null || other == null || !isObjectLike(value) && !isObjectLike(other)) {
    return value !== value && other !== other;
  }
  return baseIsEqualDeep(value, other, bitmask, customizer, baseIsEqual, stack2);
}
var COMPARE_PARTIAL_FLAG$1 = 1, COMPARE_UNORDERED_FLAG$1 = 2;
function baseIsMatch(object, source, matchData, customizer) {
  var index = matchData.length, length = index;
  if (object == null) {
    return !length;
  }
  object = Object(object);
  while (index--) {
    var data = matchData[index];
    if (data[2] ? data[1] !== object[data[0]] : !(data[0] in object)) {
      return false;
    }
  }
  while (++index < length) {
    data = matchData[index];
    var key = data[0], objValue = object[key], srcValue = data[1];
    if (data[2]) {
      if (objValue === void 0 && !(key in object)) {
        return false;
      }
    } else {
      var stack2 = new Stack();
      var result;
      if (!(result === void 0 ? baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG$1 | COMPARE_UNORDERED_FLAG$1, customizer, stack2) : result)) {
        return false;
      }
    }
  }
  return true;
}
function isStrictComparable(value) {
  return value === value && !isObject(value);
}
function getMatchData(object) {
  var result = keys(object), length = result.length;
  while (length--) {
    var key = result[length], value = object[key];
    result[length] = [key, value, isStrictComparable(value)];
  }
  return result;
}
function matchesStrictComparable(key, srcValue) {
  return function(object) {
    if (object == null) {
      return false;
    }
    return object[key] === srcValue && (srcValue !== void 0 || key in Object(object));
  };
}
function baseMatches(source) {
  var matchData = getMatchData(source);
  if (matchData.length == 1 && matchData[0][2]) {
    return matchesStrictComparable(matchData[0][0], matchData[0][1]);
  }
  return function(object) {
    return object === source || baseIsMatch(object, source, matchData);
  };
}
function baseHasIn(object, key) {
  return object != null && key in Object(object);
}
function hasPath(object, path, hasFunc) {
  path = castPath(path, object);
  var index = -1, length = path.length, result = false;
  while (++index < length) {
    var key = toKey(path[index]);
    if (!(result = object != null && hasFunc(object, key))) {
      break;
    }
    object = object[key];
  }
  if (result || ++index != length) {
    return result;
  }
  length = object == null ? 0 : object.length;
  return !!length && isLength(length) && isIndex(key, length) && (isArray(object) || isArguments(object));
}
function hasIn(object, path) {
  return object != null && hasPath(object, path, baseHasIn);
}
var COMPARE_PARTIAL_FLAG = 1, COMPARE_UNORDERED_FLAG = 2;
function baseMatchesProperty(path, srcValue) {
  if (isKey(path) && isStrictComparable(srcValue)) {
    return matchesStrictComparable(toKey(path), srcValue);
  }
  return function(object) {
    var objValue = get(object, path);
    return objValue === void 0 && objValue === srcValue ? hasIn(object, path) : baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG);
  };
}
function baseProperty(key) {
  return function(object) {
    return object == null ? void 0 : object[key];
  };
}
function basePropertyDeep(path) {
  return function(object) {
    return baseGet(object, path);
  };
}
function property(path) {
  return isKey(path) ? baseProperty(toKey(path)) : basePropertyDeep(path);
}
function baseIteratee(value) {
  if (typeof value == "function") {
    return value;
  }
  if (value == null) {
    return identity;
  }
  if (typeof value == "object") {
    return isArray(value) ? baseMatchesProperty(value[0], value[1]) : baseMatches(value);
  }
  return property(value);
}
function createBaseFor(fromRight) {
  return function(object, iteratee, keysFunc) {
    var index = -1, iterable = Object(object), props = keysFunc(object), length = props.length;
    while (length--) {
      var key = props[++index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}
var baseFor = createBaseFor();
function baseForOwn(object, iteratee) {
  return object && baseFor(object, iteratee, keys);
}
function createBaseEach(eachFunc, fromRight) {
  return function(collection, iteratee) {
    if (collection == null) {
      return collection;
    }
    if (!isArrayLike(collection)) {
      return eachFunc(collection, iteratee);
    }
    var length = collection.length, index = -1, iterable = Object(collection);
    while (++index < length) {
      if (iteratee(iterable[index], index, iterable) === false) {
        break;
      }
    }
    return collection;
  };
}
var baseEach = createBaseEach(baseForOwn);
function assignMergeValue(object, key, value) {
  if (value !== void 0 && !eq(object[key], value) || value === void 0 && !(key in object)) {
    baseAssignValue(object, key, value);
  }
}
function isArrayLikeObject(value) {
  return isObjectLike(value) && isArrayLike(value);
}
function safeGet(object, key) {
  if (key === "constructor" && typeof object[key] === "function") {
    return;
  }
  if (key == "__proto__") {
    return;
  }
  return object[key];
}
function toPlainObject(value) {
  return copyObject(value, keysIn(value));
}
function baseMergeDeep(object, source, key, srcIndex, mergeFunc, customizer, stack2) {
  var objValue = safeGet(object, key), srcValue = safeGet(source, key), stacked = stack2.get(srcValue);
  if (stacked) {
    assignMergeValue(object, key, stacked);
    return;
  }
  var newValue = customizer ? customizer(objValue, srcValue, key + "", object, source, stack2) : void 0;
  var isCommon = newValue === void 0;
  if (isCommon) {
    var isArr = isArray(srcValue), isBuff = !isArr && isBuffer(srcValue), isTyped = !isArr && !isBuff && isTypedArray(srcValue);
    newValue = srcValue;
    if (isArr || isBuff || isTyped) {
      if (isArray(objValue)) {
        newValue = objValue;
      } else if (isArrayLikeObject(objValue)) {
        newValue = copyArray(objValue);
      } else if (isBuff) {
        isCommon = false;
        newValue = cloneBuffer(srcValue);
      } else if (isTyped) {
        isCommon = false;
        newValue = cloneTypedArray(srcValue);
      } else {
        newValue = [];
      }
    } else if (isPlainObject(srcValue) || isArguments(srcValue)) {
      newValue = objValue;
      if (isArguments(objValue)) {
        newValue = toPlainObject(objValue);
      } else if (!isObject(objValue) || isFunction(objValue)) {
        newValue = initCloneObject(srcValue);
      }
    } else {
      isCommon = false;
    }
  }
  if (isCommon) {
    stack2.set(srcValue, newValue);
    mergeFunc(newValue, srcValue, srcIndex, customizer, stack2);
    stack2["delete"](srcValue);
  }
  assignMergeValue(object, key, newValue);
}
function baseMerge(object, source, srcIndex, customizer, stack2) {
  if (object === source) {
    return;
  }
  baseFor(source, function(srcValue, key) {
    stack2 || (stack2 = new Stack());
    if (isObject(srcValue)) {
      baseMergeDeep(object, source, key, srcIndex, baseMerge, customizer, stack2);
    } else {
      var newValue = customizer ? customizer(safeGet(object, key), srcValue, key + "", object, source, stack2) : void 0;
      if (newValue === void 0) {
        newValue = srcValue;
      }
      assignMergeValue(object, key, newValue);
    }
  }, keysIn);
}
function baseMap(collection, iteratee) {
  var index = -1, result = isArrayLike(collection) ? Array(collection.length) : [];
  baseEach(collection, function(value, key, collection2) {
    result[++index] = iteratee(value, key, collection2);
  });
  return result;
}
function map(collection, iteratee) {
  var func = isArray(collection) ? arrayMap : baseMap;
  return func(collection, baseIteratee(iteratee));
}
var merge$1 = createAssigner(function(object, source, srcIndex) {
  baseMerge(object, source, srcIndex);
});
const cssrAnchorMetaName = "naive-ui-style";
function useRtl(mountId, rtlStateRef, clsPrefixRef) {
  if (!rtlStateRef) return void 0;
  const ssrAdapter2 = useSsrAdapter();
  const componentRtlStateRef = computed(() => {
    const {
      value: rtlState
    } = rtlStateRef;
    if (!rtlState) {
      return void 0;
    }
    const componentRtlState = rtlState[mountId];
    if (!componentRtlState) {
      return void 0;
    }
    return componentRtlState;
  });
  const NConfigProvider = inject(configProviderInjectionKey, null);
  const mountStyle = () => {
    watchEffect(() => {
      const {
        value: clsPrefix
      } = clsPrefixRef;
      const id = `${clsPrefix}${mountId}Rtl`;
      if (exists(id, ssrAdapter2)) return;
      const {
        value: componentRtlState
      } = componentRtlStateRef;
      if (!componentRtlState) return;
      componentRtlState.style.mount({
        id,
        head: true,
        anchorMetaName: cssrAnchorMetaName,
        props: {
          bPrefix: clsPrefix ? `.${clsPrefix}-` : void 0
        },
        ssr: ssrAdapter2,
        parent: NConfigProvider === null || NConfigProvider === void 0 ? void 0 : NConfigProvider.styleMountTarget
      });
    });
  };
  if (ssrAdapter2) {
    mountStyle();
  } else {
    onBeforeMount(mountStyle);
  }
  return componentRtlStateRef;
}
const commonVariables$2 = {
  fontFamily: 'v-sans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
  fontFamilyMono: "v-mono, SFMono-Regular, Menlo, Consolas, Courier, monospace",
  fontWeight: "400",
  fontWeightStrong: "500",
  cubicBezierEaseInOut: "cubic-bezier(.4, 0, .2, 1)",
  cubicBezierEaseOut: "cubic-bezier(0, 0, .2, 1)",
  cubicBezierEaseIn: "cubic-bezier(.4, 0, 1, 1)",
  borderRadius: "3px",
  borderRadiusSmall: "2px",
  fontSize: "14px",
  fontSizeMini: "12px",
  fontSizeTiny: "12px",
  fontSizeSmall: "14px",
  fontSizeMedium: "14px",
  fontSizeLarge: "15px",
  fontSizeHuge: "16px",
  lineHeight: "1.6",
  heightMini: "16px",
  // private now, it's too small
  heightTiny: "22px",
  heightSmall: "28px",
  heightMedium: "34px",
  heightLarge: "40px",
  heightHuge: "46px"
};
const {
  fontSize,
  fontFamily,
  lineHeight
} = commonVariables$2;
const globalStyle = c$1("body", `
 margin: 0;
 font-size: ${fontSize};
 font-family: ${fontFamily};
 line-height: ${lineHeight};
 -webkit-text-size-adjust: 100%;
 -webkit-tap-highlight-color: transparent;
`, [c$1("input", `
 font-family: inherit;
 font-size: inherit;
 `)]);
function createTheme(theme) {
  return theme;
}
function useTheme(resolveId, mountId, style2, defaultTheme, props, clsPrefixRef) {
  const ssrAdapter2 = useSsrAdapter();
  const NConfigProvider = inject(configProviderInjectionKey, null);
  if (style2) {
    const mountStyle = () => {
      const clsPrefix = clsPrefixRef === null || clsPrefixRef === void 0 ? void 0 : clsPrefixRef.value;
      style2.mount({
        id: clsPrefix === void 0 ? mountId : clsPrefix + mountId,
        head: true,
        props: {
          bPrefix: clsPrefix ? `.${clsPrefix}-` : void 0
        },
        anchorMetaName: cssrAnchorMetaName,
        ssr: ssrAdapter2,
        parent: NConfigProvider === null || NConfigProvider === void 0 ? void 0 : NConfigProvider.styleMountTarget
      });
      if (!(NConfigProvider === null || NConfigProvider === void 0 ? void 0 : NConfigProvider.preflightStyleDisabled)) {
        globalStyle.mount({
          id: "n-global",
          head: true,
          anchorMetaName: cssrAnchorMetaName,
          ssr: ssrAdapter2,
          parent: NConfigProvider === null || NConfigProvider === void 0 ? void 0 : NConfigProvider.styleMountTarget
        });
      }
    };
    if (ssrAdapter2) {
      mountStyle();
    } else {
      onBeforeMount(mountStyle);
    }
  }
  const mergedThemeRef = computed(() => {
    var _a;
    const {
      theme: {
        common: selfCommon,
        self: self2,
        peers = {}
      } = {},
      themeOverrides: selfOverrides = {},
      builtinThemeOverrides: builtinOverrides = {}
    } = props;
    const {
      common: selfCommonOverrides,
      peers: peersOverrides
    } = selfOverrides;
    const {
      common: globalCommon = void 0,
      [resolveId]: {
        common: globalSelfCommon = void 0,
        self: globalSelf = void 0,
        peers: globalPeers = {}
      } = {}
    } = (NConfigProvider === null || NConfigProvider === void 0 ? void 0 : NConfigProvider.mergedThemeRef.value) || {};
    const {
      common: globalCommonOverrides = void 0,
      [resolveId]: globalSelfOverrides = {}
    } = (NConfigProvider === null || NConfigProvider === void 0 ? void 0 : NConfigProvider.mergedThemeOverridesRef.value) || {};
    const {
      common: globalSelfCommonOverrides,
      peers: globalPeersOverrides = {}
    } = globalSelfOverrides;
    const mergedCommon = merge$1({}, selfCommon || globalSelfCommon || globalCommon || defaultTheme.common, globalCommonOverrides, globalSelfCommonOverrides, selfCommonOverrides);
    const mergedSelf = merge$1(
      // {}, executed every time, no need for empty obj
      (_a = self2 || globalSelf || defaultTheme.self) === null || _a === void 0 ? void 0 : _a(mergedCommon),
      builtinOverrides,
      globalSelfOverrides,
      selfOverrides
    );
    return {
      common: mergedCommon,
      self: mergedSelf,
      peers: merge$1({}, defaultTheme.peers, globalPeers, peers),
      peerOverrides: merge$1({}, builtinOverrides.peers, globalPeersOverrides, peersOverrides)
    };
  });
  return mergedThemeRef;
}
useTheme.props = {
  theme: Object,
  themeOverrides: Object,
  builtinThemeOverrides: Object
};
const ChevronRightIcon = defineComponent({
  name: "ChevronRight",
  render() {
    return h("svg", {
      viewBox: "0 0 16 16",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg"
    }, h("path", {
      d: "M5.64645 3.14645C5.45118 3.34171 5.45118 3.65829 5.64645 3.85355L9.79289 8L5.64645 12.1464C5.45118 12.3417 5.45118 12.6583 5.64645 12.8536C5.84171 13.0488 6.15829 13.0488 6.35355 12.8536L10.8536 8.35355C11.0488 8.15829 11.0488 7.84171 10.8536 7.64645L6.35355 3.14645C6.15829 2.95118 5.84171 2.95118 5.64645 3.14645Z",
      fill: "currentColor"
    }));
  }
});
const {
  cubicBezierEaseInOut
} = commonVariables$2;
function fadeInTransition({
  name = "fade-in",
  enterDuration = "0.2s",
  leaveDuration = "0.2s",
  enterCubicBezier = cubicBezierEaseInOut,
  leaveCubicBezier = cubicBezierEaseInOut
} = {}) {
  return [c$1(`&.${name}-transition-enter-active`, {
    transition: `all ${enterDuration} ${enterCubicBezier}!important`
  }), c$1(`&.${name}-transition-leave-active`, {
    transition: `all ${leaveDuration} ${leaveCubicBezier}!important`
  }), c$1(`&.${name}-transition-enter-from, &.${name}-transition-leave-to`, {
    opacity: 0
  }), c$1(`&.${name}-transition-leave-from, &.${name}-transition-enter-to`, {
    opacity: 1
  })];
}
const base = {
  neutralBase: "#FFF",
  neutralInvertBase: "#000",
  neutralTextBase: "#000",
  neutralPopover: "#fff",
  neutralCard: "#fff",
  neutralModal: "#fff",
  neutralBody: "#fff",
  alpha1: "0.82",
  alpha2: "0.72",
  alpha3: "0.38",
  alpha4: "0.24",
  // disabled text, placeholder, icon
  alpha5: "0.18",
  // disabled placeholder
  alphaClose: "0.6",
  alphaDisabled: "0.5",
  alphaAvatar: "0.2",
  alphaProgressRail: ".08",
  alphaInput: "0",
  alphaScrollbar: "0.25",
  alphaScrollbarHover: "0.4",
  // primary
  primaryHover: "#36ad6a",
  primaryDefault: "#18a058",
  primaryActive: "#0c7a43",
  primarySuppl: "#36ad6a",
  // info
  infoHover: "#4098fc",
  infoDefault: "#2080f0",
  infoActive: "#1060c9",
  infoSuppl: "#4098fc",
  // error
  errorHover: "#de576d",
  errorDefault: "#d03050",
  errorActive: "#ab1f3f",
  errorSuppl: "#de576d",
  // warning
  warningHover: "#fcb040",
  warningDefault: "#f0a020",
  warningActive: "#c97c10",
  warningSuppl: "#fcb040",
  // success
  successHover: "#36ad6a",
  successDefault: "#18a058",
  successActive: "#0c7a43",
  successSuppl: "#36ad6a"
};
const baseBackgroundRgb = rgba(base.neutralBase);
const baseInvertBackgroundRgb = rgba(base.neutralInvertBase);
const overlayPrefix = `rgba(${baseInvertBackgroundRgb.slice(0, 3).join(", ")}, `;
function overlay(alpha) {
  return `${overlayPrefix + String(alpha)})`;
}
function neutral(alpha) {
  const overlayRgba = Array.from(baseInvertBackgroundRgb);
  overlayRgba[3] = Number(alpha);
  return composite(baseBackgroundRgb, overlayRgba);
}
const derived = Object.assign(Object.assign({
  name: "common"
}, commonVariables$2), {
  baseColor: base.neutralBase,
  // primary color
  primaryColor: base.primaryDefault,
  primaryColorHover: base.primaryHover,
  primaryColorPressed: base.primaryActive,
  primaryColorSuppl: base.primarySuppl,
  // info color
  infoColor: base.infoDefault,
  infoColorHover: base.infoHover,
  infoColorPressed: base.infoActive,
  infoColorSuppl: base.infoSuppl,
  // success color
  successColor: base.successDefault,
  successColorHover: base.successHover,
  successColorPressed: base.successActive,
  successColorSuppl: base.successSuppl,
  // warning color
  warningColor: base.warningDefault,
  warningColorHover: base.warningHover,
  warningColorPressed: base.warningActive,
  warningColorSuppl: base.warningSuppl,
  // error color
  errorColor: base.errorDefault,
  errorColorHover: base.errorHover,
  errorColorPressed: base.errorActive,
  errorColorSuppl: base.errorSuppl,
  // text color
  textColorBase: base.neutralTextBase,
  textColor1: "rgb(31, 34, 37)",
  textColor2: "rgb(51, 54, 57)",
  textColor3: "rgb(118, 124, 130)",
  // textColor4: neutral(base.alpha4), // disabled, placeholder, icon
  // textColor5: neutral(base.alpha5),
  textColorDisabled: neutral(base.alpha4),
  placeholderColor: neutral(base.alpha4),
  placeholderColorDisabled: neutral(base.alpha5),
  iconColor: neutral(base.alpha4),
  iconColorHover: scaleColor(neutral(base.alpha4), {
    lightness: 0.75
  }),
  iconColorPressed: scaleColor(neutral(base.alpha4), {
    lightness: 0.9
  }),
  iconColorDisabled: neutral(base.alpha5),
  opacity1: base.alpha1,
  opacity2: base.alpha2,
  opacity3: base.alpha3,
  opacity4: base.alpha4,
  opacity5: base.alpha5,
  dividerColor: "rgb(239, 239, 245)",
  borderColor: "rgb(224, 224, 230)",
  // close
  closeIconColor: neutral(Number(base.alphaClose)),
  closeIconColorHover: neutral(Number(base.alphaClose)),
  closeIconColorPressed: neutral(Number(base.alphaClose)),
  closeColorHover: "rgba(0, 0, 0, .09)",
  closeColorPressed: "rgba(0, 0, 0, .13)",
  // clear
  clearColor: neutral(base.alpha4),
  clearColorHover: scaleColor(neutral(base.alpha4), {
    lightness: 0.75
  }),
  clearColorPressed: scaleColor(neutral(base.alpha4), {
    lightness: 0.9
  }),
  scrollbarColor: overlay(base.alphaScrollbar),
  scrollbarColorHover: overlay(base.alphaScrollbarHover),
  scrollbarWidth: "5px",
  scrollbarHeight: "5px",
  scrollbarBorderRadius: "5px",
  progressRailColor: neutral(base.alphaProgressRail),
  railColor: "rgb(219, 219, 223)",
  popoverColor: base.neutralPopover,
  tableColor: base.neutralCard,
  cardColor: base.neutralCard,
  modalColor: base.neutralModal,
  bodyColor: base.neutralBody,
  tagColor: "#eee",
  avatarColor: neutral(base.alphaAvatar),
  invertedColor: "rgb(0, 20, 40)",
  inputColor: neutral(base.alphaInput),
  codeColor: "rgb(244, 244, 248)",
  tabColor: "rgb(247, 247, 250)",
  actionColor: "rgb(250, 250, 252)",
  tableHeaderColor: "rgb(250, 250, 252)",
  hoverColor: "rgb(243, 243, 245)",
  // use color with alpha since it can be nested with header filter & sorter effect
  tableColorHover: "rgba(0, 0, 100, 0.03)",
  tableColorStriped: "rgba(0, 0, 100, 0.02)",
  pressedColor: "rgb(237, 237, 239)",
  opacityDisabled: base.alphaDisabled,
  inputColorDisabled: "rgb(250, 250, 252)",
  // secondary button color
  // can also be used in tertiary button & quaternary button
  buttonColor2: "rgba(46, 51, 56, .05)",
  buttonColor2Hover: "rgba(46, 51, 56, .09)",
  buttonColor2Pressed: "rgba(46, 51, 56, .13)",
  boxShadow1: "0 1px 2px -2px rgba(0, 0, 0, .08), 0 3px 6px 0 rgba(0, 0, 0, .06), 0 5px 12px 4px rgba(0, 0, 0, .04)",
  boxShadow2: "0 3px 6px -4px rgba(0, 0, 0, .12), 0 6px 16px 0 rgba(0, 0, 0, .08), 0 9px 28px 8px rgba(0, 0, 0, .05)",
  boxShadow3: "0 6px 16px -9px rgba(0, 0, 0, .08), 0 9px 28px 0 rgba(0, 0, 0, .05), 0 12px 48px 16px rgba(0, 0, 0, .03)"
});
const commonVars$1 = {
  railInsetHorizontalBottom: "auto 2px 4px 2px",
  railInsetHorizontalTop: "4px 2px auto 2px",
  railInsetVerticalRight: "2px 4px 2px auto",
  railInsetVerticalLeft: "2px auto 2px 4px",
  railColor: "transparent"
};
function self$6(vars) {
  const {
    scrollbarColor,
    scrollbarColorHover,
    scrollbarHeight,
    scrollbarWidth,
    scrollbarBorderRadius
  } = vars;
  return Object.assign(Object.assign({}, commonVars$1), {
    height: scrollbarHeight,
    width: scrollbarWidth,
    borderRadius: scrollbarBorderRadius,
    color: scrollbarColor,
    colorHover: scrollbarColorHover
  });
}
const scrollbarLight = {
  common: derived,
  self: self$6
};
const style$4 = cB("scrollbar", `
 overflow: hidden;
 position: relative;
 z-index: auto;
 height: 100%;
 width: 100%;
`, [c$1(">", [cB("scrollbar-container", `
 width: 100%;
 overflow: scroll;
 height: 100%;
 min-height: inherit;
 max-height: inherit;
 scrollbar-width: none;
 `, [c$1("&::-webkit-scrollbar, &::-webkit-scrollbar-track-piece, &::-webkit-scrollbar-thumb", `
 width: 0;
 height: 0;
 display: none;
 `), c$1(">", [
  // We can't set overflow hidden since it affects positioning.
  cB("scrollbar-content", `
 box-sizing: border-box;
 min-width: 100%;
 `)
])])]), c$1(">, +", [cB("scrollbar-rail", `
 position: absolute;
 pointer-events: none;
 user-select: none;
 background: var(--n-scrollbar-rail-color);
 -webkit-user-select: none;
 `, [cM("horizontal", `
 height: var(--n-scrollbar-height);
 `, [c$1(">", [cE("scrollbar", `
 height: var(--n-scrollbar-height);
 border-radius: var(--n-scrollbar-border-radius);
 right: 0;
 `)])]), cM("horizontal--top", `
 top: var(--n-scrollbar-rail-top-horizontal-top); 
 right: var(--n-scrollbar-rail-right-horizontal-top); 
 bottom: var(--n-scrollbar-rail-bottom-horizontal-top); 
 left: var(--n-scrollbar-rail-left-horizontal-top); 
 `), cM("horizontal--bottom", `
 top: var(--n-scrollbar-rail-top-horizontal-bottom); 
 right: var(--n-scrollbar-rail-right-horizontal-bottom); 
 bottom: var(--n-scrollbar-rail-bottom-horizontal-bottom); 
 left: var(--n-scrollbar-rail-left-horizontal-bottom); 
 `), cM("vertical", `
 width: var(--n-scrollbar-width);
 `, [c$1(">", [cE("scrollbar", `
 width: var(--n-scrollbar-width);
 border-radius: var(--n-scrollbar-border-radius);
 bottom: 0;
 `)])]), cM("vertical--left", `
 top: var(--n-scrollbar-rail-top-vertical-left); 
 right: var(--n-scrollbar-rail-right-vertical-left); 
 bottom: var(--n-scrollbar-rail-bottom-vertical-left); 
 left: var(--n-scrollbar-rail-left-vertical-left); 
 `), cM("vertical--right", `
 top: var(--n-scrollbar-rail-top-vertical-right); 
 right: var(--n-scrollbar-rail-right-vertical-right); 
 bottom: var(--n-scrollbar-rail-bottom-vertical-right); 
 left: var(--n-scrollbar-rail-left-vertical-right); 
 `), cM("disabled", [c$1(">", [cE("scrollbar", "pointer-events: none;")])]), c$1(">", [cE("scrollbar", `
 z-index: 1;
 position: absolute;
 cursor: pointer;
 pointer-events: all;
 background-color: var(--n-scrollbar-color);
 transition: background-color .2s var(--n-scrollbar-bezier);
 `, [fadeInTransition(), c$1("&:hover", "background-color: var(--n-scrollbar-color-hover);")])])])])]);
const scrollbarProps = Object.assign(Object.assign({}, useTheme.props), {
  duration: {
    type: Number,
    default: 0
  },
  scrollable: {
    type: Boolean,
    default: true
  },
  xScrollable: Boolean,
  trigger: {
    type: String,
    default: "hover"
  },
  useUnifiedContainer: Boolean,
  triggerDisplayManually: Boolean,
  // If container is set, resize observer won't not attached
  container: Function,
  content: Function,
  containerClass: String,
  containerStyle: [String, Object],
  contentClass: [String, Array],
  contentStyle: [String, Object],
  horizontalRailStyle: [String, Object],
  verticalRailStyle: [String, Object],
  onScroll: Function,
  onWheel: Function,
  onResize: Function,
  internalOnUpdateScrollLeft: Function,
  internalHoistYRail: Boolean,
  yPlacement: {
    type: String,
    default: "right"
  },
  xPlacement: {
    type: String,
    default: "bottom"
  }
});
const Scrollbar = defineComponent({
  name: "Scrollbar",
  props: scrollbarProps,
  inheritAttrs: false,
  setup(props) {
    const {
      mergedClsPrefixRef,
      inlineThemeDisabled,
      mergedRtlRef
    } = useConfig(props);
    const rtlEnabledRef = useRtl("Scrollbar", mergedRtlRef, mergedClsPrefixRef);
    const wrapperRef = ref(null);
    const containerRef = ref(null);
    const contentRef = ref(null);
    const yRailRef = ref(null);
    const xRailRef = ref(null);
    const contentHeightRef = ref(null);
    const contentWidthRef = ref(null);
    const containerHeightRef = ref(null);
    const containerWidthRef = ref(null);
    const yRailSizeRef = ref(null);
    const xRailSizeRef = ref(null);
    const containerScrollTopRef = ref(0);
    const containerScrollLeftRef = ref(0);
    const isShowXBarRef = ref(false);
    const isShowYBarRef = ref(false);
    let yBarPressed = false;
    let xBarPressed = false;
    let xBarVanishTimerId;
    let yBarVanishTimerId;
    let memoYTop = 0;
    let memoXLeft = 0;
    let memoMouseX = 0;
    let memoMouseY = 0;
    const isIos2 = useIsIos();
    const themeRef = useTheme("Scrollbar", "-scrollbar", style$4, scrollbarLight, props, mergedClsPrefixRef);
    const yBarSizeRef = computed(() => {
      const {
        value: containerHeight
      } = containerHeightRef;
      const {
        value: contentHeight
      } = contentHeightRef;
      const {
        value: yRailSize
      } = yRailSizeRef;
      if (containerHeight === null || contentHeight === null || yRailSize === null) {
        return 0;
      } else {
        return Math.min(containerHeight, yRailSize * containerHeight / contentHeight + depx(themeRef.value.self.width) * 1.5);
      }
    });
    const yBarSizePxRef = computed(() => {
      return `${yBarSizeRef.value}px`;
    });
    const xBarSizeRef = computed(() => {
      const {
        value: containerWidth
      } = containerWidthRef;
      const {
        value: contentWidth
      } = contentWidthRef;
      const {
        value: xRailSize
      } = xRailSizeRef;
      if (containerWidth === null || contentWidth === null || xRailSize === null) {
        return 0;
      } else {
        return xRailSize * containerWidth / contentWidth + depx(themeRef.value.self.height) * 1.5;
      }
    });
    const xBarSizePxRef = computed(() => {
      return `${xBarSizeRef.value}px`;
    });
    const yBarTopRef = computed(() => {
      const {
        value: containerHeight
      } = containerHeightRef;
      const {
        value: containerScrollTop
      } = containerScrollTopRef;
      const {
        value: contentHeight
      } = contentHeightRef;
      const {
        value: yRailSize
      } = yRailSizeRef;
      if (containerHeight === null || contentHeight === null || yRailSize === null) {
        return 0;
      } else {
        const heightDiff = contentHeight - containerHeight;
        if (!heightDiff) return 0;
        return containerScrollTop / heightDiff * (yRailSize - yBarSizeRef.value);
      }
    });
    const yBarTopPxRef = computed(() => {
      return `${yBarTopRef.value}px`;
    });
    const xBarLeftRef = computed(() => {
      const {
        value: containerWidth
      } = containerWidthRef;
      const {
        value: containerScrollLeft
      } = containerScrollLeftRef;
      const {
        value: contentWidth
      } = contentWidthRef;
      const {
        value: xRailSize
      } = xRailSizeRef;
      if (containerWidth === null || contentWidth === null || xRailSize === null) {
        return 0;
      } else {
        const widthDiff = contentWidth - containerWidth;
        if (!widthDiff) return 0;
        return containerScrollLeft / widthDiff * (xRailSize - xBarSizeRef.value);
      }
    });
    const xBarLeftPxRef = computed(() => {
      return `${xBarLeftRef.value}px`;
    });
    const needYBarRef = computed(() => {
      const {
        value: containerHeight
      } = containerHeightRef;
      const {
        value: contentHeight
      } = contentHeightRef;
      return containerHeight !== null && contentHeight !== null && contentHeight > containerHeight;
    });
    const needXBarRef = computed(() => {
      const {
        value: containerWidth
      } = containerWidthRef;
      const {
        value: contentWidth
      } = contentWidthRef;
      return containerWidth !== null && contentWidth !== null && contentWidth > containerWidth;
    });
    const mergedShowXBarRef = computed(() => {
      const {
        trigger: trigger2
      } = props;
      return trigger2 === "none" || isShowXBarRef.value;
    });
    const mergedShowYBarRef = computed(() => {
      const {
        trigger: trigger2
      } = props;
      return trigger2 === "none" || isShowYBarRef.value;
    });
    const mergedContainerRef = computed(() => {
      const {
        container
      } = props;
      if (container) return container();
      return containerRef.value;
    });
    const mergedContentRef = computed(() => {
      const {
        content
      } = props;
      if (content) return content();
      return contentRef.value;
    });
    const scrollTo = (options, y) => {
      if (!props.scrollable) return;
      if (typeof options === "number") {
        scrollToPosition(options, y !== null && y !== void 0 ? y : 0, 0, false, "auto");
        return;
      }
      const {
        left,
        top,
        index,
        elSize,
        position,
        behavior,
        el,
        debounce = true
      } = options;
      if (left !== void 0 || top !== void 0) {
        scrollToPosition(left !== null && left !== void 0 ? left : 0, top !== null && top !== void 0 ? top : 0, 0, false, behavior);
      }
      if (el !== void 0) {
        scrollToPosition(0, el.offsetTop, el.offsetHeight, debounce, behavior);
      } else if (index !== void 0 && elSize !== void 0) {
        scrollToPosition(0, index * elSize, elSize, debounce, behavior);
      } else if (position === "bottom") {
        scrollToPosition(0, Number.MAX_SAFE_INTEGER, 0, false, behavior);
      } else if (position === "top") {
        scrollToPosition(0, 0, 0, false, behavior);
      }
    };
    const activateState = useReactivated(() => {
      if (!props.container) {
        scrollTo({
          top: containerScrollTopRef.value,
          left: containerScrollLeftRef.value
        });
      }
    });
    const handleContentResize = () => {
      if (activateState.isDeactivated) return;
      sync();
    };
    const handleContainerResize = (e) => {
      if (activateState.isDeactivated) return;
      const {
        onResize
      } = props;
      if (onResize) onResize(e);
      sync();
    };
    const scrollBy = (options, y) => {
      if (!props.scrollable) return;
      const {
        value: container
      } = mergedContainerRef;
      if (!container) return;
      if (typeof options === "object") {
        container.scrollBy(options);
      } else {
        container.scrollBy(options, y || 0);
      }
    };
    function scrollToPosition(left, top, elSize, debounce, behavior) {
      const {
        value: container
      } = mergedContainerRef;
      if (!container) return;
      if (debounce) {
        const {
          scrollTop,
          offsetHeight
        } = container;
        if (top > scrollTop) {
          if (top + elSize <= scrollTop + offsetHeight) ;
          else {
            container.scrollTo({
              left,
              top: top + elSize - offsetHeight,
              behavior
            });
          }
          return;
        }
      }
      container.scrollTo({
        left,
        top,
        behavior
      });
    }
    function handleMouseEnterWrapper() {
      showXBar();
      showYBar();
      sync();
    }
    function handleMouseLeaveWrapper() {
      hideBar();
    }
    function hideBar() {
      hideYBar();
      hideXBar();
    }
    function hideYBar() {
      if (yBarVanishTimerId !== void 0) {
        window.clearTimeout(yBarVanishTimerId);
      }
      yBarVanishTimerId = window.setTimeout(() => {
        isShowYBarRef.value = false;
      }, props.duration);
    }
    function hideXBar() {
      if (xBarVanishTimerId !== void 0) {
        window.clearTimeout(xBarVanishTimerId);
      }
      xBarVanishTimerId = window.setTimeout(() => {
        isShowXBarRef.value = false;
      }, props.duration);
    }
    function showXBar() {
      if (xBarVanishTimerId !== void 0) {
        window.clearTimeout(xBarVanishTimerId);
      }
      isShowXBarRef.value = true;
    }
    function showYBar() {
      if (yBarVanishTimerId !== void 0) {
        window.clearTimeout(yBarVanishTimerId);
      }
      isShowYBarRef.value = true;
    }
    function handleScroll(e) {
      const {
        onScroll
      } = props;
      if (onScroll) onScroll(e);
      syncScrollState();
    }
    function syncScrollState() {
      const {
        value: container
      } = mergedContainerRef;
      if (container) {
        containerScrollTopRef.value = container.scrollTop;
        containerScrollLeftRef.value = container.scrollLeft * ((rtlEnabledRef === null || rtlEnabledRef === void 0 ? void 0 : rtlEnabledRef.value) ? -1 : 1);
      }
    }
    function syncPositionState() {
      const {
        value: content
      } = mergedContentRef;
      if (content) {
        contentHeightRef.value = content.offsetHeight;
        contentWidthRef.value = content.offsetWidth;
      }
      const {
        value: container
      } = mergedContainerRef;
      if (container) {
        containerHeightRef.value = container.offsetHeight;
        containerWidthRef.value = container.offsetWidth;
      }
      const {
        value: xRailEl
      } = xRailRef;
      const {
        value: yRailEl
      } = yRailRef;
      if (xRailEl) {
        xRailSizeRef.value = xRailEl.offsetWidth;
      }
      if (yRailEl) {
        yRailSizeRef.value = yRailEl.offsetHeight;
      }
    }
    function syncUnifiedContainer() {
      const {
        value: container
      } = mergedContainerRef;
      if (container) {
        containerScrollTopRef.value = container.scrollTop;
        containerScrollLeftRef.value = container.scrollLeft * ((rtlEnabledRef === null || rtlEnabledRef === void 0 ? void 0 : rtlEnabledRef.value) ? -1 : 1);
        containerHeightRef.value = container.offsetHeight;
        containerWidthRef.value = container.offsetWidth;
        contentHeightRef.value = container.scrollHeight;
        contentWidthRef.value = container.scrollWidth;
      }
      const {
        value: xRailEl
      } = xRailRef;
      const {
        value: yRailEl
      } = yRailRef;
      if (xRailEl) {
        xRailSizeRef.value = xRailEl.offsetWidth;
      }
      if (yRailEl) {
        yRailSizeRef.value = yRailEl.offsetHeight;
      }
    }
    function sync() {
      if (!props.scrollable) return;
      if (props.useUnifiedContainer) {
        syncUnifiedContainer();
      } else {
        syncPositionState();
        syncScrollState();
      }
    }
    function isMouseUpAway(e) {
      var _a;
      return !((_a = wrapperRef.value) === null || _a === void 0 ? void 0 : _a.contains(getPreciseEventTarget(e)));
    }
    function handleXScrollMouseDown(e) {
      e.preventDefault();
      e.stopPropagation();
      xBarPressed = true;
      on("mousemove", window, handleXScrollMouseMove, true);
      on("mouseup", window, handleXScrollMouseUp, true);
      memoXLeft = containerScrollLeftRef.value;
      memoMouseX = (rtlEnabledRef === null || rtlEnabledRef === void 0 ? void 0 : rtlEnabledRef.value) ? window.innerWidth - e.clientX : e.clientX;
    }
    function handleXScrollMouseMove(e) {
      if (!xBarPressed) return;
      if (xBarVanishTimerId !== void 0) {
        window.clearTimeout(xBarVanishTimerId);
      }
      if (yBarVanishTimerId !== void 0) {
        window.clearTimeout(yBarVanishTimerId);
      }
      const {
        value: containerWidth
      } = containerWidthRef;
      const {
        value: contentWidth
      } = contentWidthRef;
      const {
        value: xBarSize
      } = xBarSizeRef;
      if (containerWidth === null || contentWidth === null) return;
      const dX = (rtlEnabledRef === null || rtlEnabledRef === void 0 ? void 0 : rtlEnabledRef.value) ? window.innerWidth - e.clientX - memoMouseX : e.clientX - memoMouseX;
      const dScrollLeft = dX * (contentWidth - containerWidth) / (containerWidth - xBarSize);
      const toScrollLeftUpperBound = contentWidth - containerWidth;
      let toScrollLeft = memoXLeft + dScrollLeft;
      toScrollLeft = Math.min(toScrollLeftUpperBound, toScrollLeft);
      toScrollLeft = Math.max(toScrollLeft, 0);
      const {
        value: container
      } = mergedContainerRef;
      if (container) {
        container.scrollLeft = toScrollLeft * ((rtlEnabledRef === null || rtlEnabledRef === void 0 ? void 0 : rtlEnabledRef.value) ? -1 : 1);
        const {
          internalOnUpdateScrollLeft
        } = props;
        if (internalOnUpdateScrollLeft) internalOnUpdateScrollLeft(toScrollLeft);
      }
    }
    function handleXScrollMouseUp(e) {
      e.preventDefault();
      e.stopPropagation();
      off("mousemove", window, handleXScrollMouseMove, true);
      off("mouseup", window, handleXScrollMouseUp, true);
      xBarPressed = false;
      sync();
      if (isMouseUpAway(e)) {
        hideBar();
      }
    }
    function handleYScrollMouseDown(e) {
      e.preventDefault();
      e.stopPropagation();
      yBarPressed = true;
      on("mousemove", window, handleYScrollMouseMove, true);
      on("mouseup", window, handleYScrollMouseUp, true);
      memoYTop = containerScrollTopRef.value;
      memoMouseY = e.clientY;
    }
    function handleYScrollMouseMove(e) {
      if (!yBarPressed) return;
      if (xBarVanishTimerId !== void 0) {
        window.clearTimeout(xBarVanishTimerId);
      }
      if (yBarVanishTimerId !== void 0) {
        window.clearTimeout(yBarVanishTimerId);
      }
      const {
        value: containerHeight
      } = containerHeightRef;
      const {
        value: contentHeight
      } = contentHeightRef;
      const {
        value: yBarSize
      } = yBarSizeRef;
      if (containerHeight === null || contentHeight === null) return;
      const dY = e.clientY - memoMouseY;
      const dScrollTop = dY * (contentHeight - containerHeight) / (containerHeight - yBarSize);
      const toScrollTopUpperBound = contentHeight - containerHeight;
      let toScrollTop = memoYTop + dScrollTop;
      toScrollTop = Math.min(toScrollTopUpperBound, toScrollTop);
      toScrollTop = Math.max(toScrollTop, 0);
      const {
        value: container
      } = mergedContainerRef;
      if (container) {
        container.scrollTop = toScrollTop;
      }
    }
    function handleYScrollMouseUp(e) {
      e.preventDefault();
      e.stopPropagation();
      off("mousemove", window, handleYScrollMouseMove, true);
      off("mouseup", window, handleYScrollMouseUp, true);
      yBarPressed = false;
      sync();
      if (isMouseUpAway(e)) {
        hideBar();
      }
    }
    watchEffect(() => {
      const {
        value: needXBar
      } = needXBarRef;
      const {
        value: needYBar
      } = needYBarRef;
      const {
        value: mergedClsPrefix
      } = mergedClsPrefixRef;
      const {
        value: xRailEl
      } = xRailRef;
      const {
        value: yRailEl
      } = yRailRef;
      if (xRailEl) {
        if (!needXBar) {
          xRailEl.classList.add(`${mergedClsPrefix}-scrollbar-rail--disabled`);
        } else {
          xRailEl.classList.remove(`${mergedClsPrefix}-scrollbar-rail--disabled`);
        }
      }
      if (yRailEl) {
        if (!needYBar) {
          yRailEl.classList.add(`${mergedClsPrefix}-scrollbar-rail--disabled`);
        } else {
          yRailEl.classList.remove(`${mergedClsPrefix}-scrollbar-rail--disabled`);
        }
      }
    });
    onMounted(() => {
      if (props.container) return;
      sync();
    });
    onBeforeUnmount(() => {
      if (xBarVanishTimerId !== void 0) {
        window.clearTimeout(xBarVanishTimerId);
      }
      if (yBarVanishTimerId !== void 0) {
        window.clearTimeout(yBarVanishTimerId);
      }
      off("mousemove", window, handleYScrollMouseMove, true);
      off("mouseup", window, handleYScrollMouseUp, true);
    });
    const cssVarsRef = computed(() => {
      const {
        common: {
          cubicBezierEaseInOut: cubicBezierEaseInOut2
        },
        self: {
          color,
          colorHover,
          height,
          width,
          borderRadius,
          railInsetHorizontalTop,
          railInsetHorizontalBottom,
          railInsetVerticalRight,
          railInsetVerticalLeft,
          railColor
        }
      } = themeRef.value;
      const {
        top: railTopHorizontalTop,
        right: railRightHorizontalTop,
        bottom: railBottomHorizontalTop,
        left: railLeftHorizontalTop
      } = getMargin(railInsetHorizontalTop);
      const {
        top: railTopHorizontalBottom,
        right: railRightHorizontalBottom,
        bottom: railBottomHorizontalBottom,
        left: railLeftHorizontalBottom
      } = getMargin(railInsetHorizontalBottom);
      const {
        top: railTopVerticalRight,
        right: railRightVerticalRight,
        bottom: railBottomVerticalRight,
        left: railLeftVerticalRight
      } = getMargin((rtlEnabledRef === null || rtlEnabledRef === void 0 ? void 0 : rtlEnabledRef.value) ? rtlInset(railInsetVerticalRight) : railInsetVerticalRight);
      const {
        top: railTopVerticalLeft,
        right: railRightVerticalLeft,
        bottom: railBottomVerticalLeft,
        left: railLeftVerticalLeft
      } = getMargin((rtlEnabledRef === null || rtlEnabledRef === void 0 ? void 0 : rtlEnabledRef.value) ? rtlInset(railInsetVerticalLeft) : railInsetVerticalLeft);
      return {
        "--n-scrollbar-bezier": cubicBezierEaseInOut2,
        "--n-scrollbar-color": color,
        "--n-scrollbar-color-hover": colorHover,
        "--n-scrollbar-border-radius": borderRadius,
        "--n-scrollbar-width": width,
        "--n-scrollbar-height": height,
        "--n-scrollbar-rail-top-horizontal-top": railTopHorizontalTop,
        "--n-scrollbar-rail-right-horizontal-top": railRightHorizontalTop,
        "--n-scrollbar-rail-bottom-horizontal-top": railBottomHorizontalTop,
        "--n-scrollbar-rail-left-horizontal-top": railLeftHorizontalTop,
        "--n-scrollbar-rail-top-horizontal-bottom": railTopHorizontalBottom,
        "--n-scrollbar-rail-right-horizontal-bottom": railRightHorizontalBottom,
        "--n-scrollbar-rail-bottom-horizontal-bottom": railBottomHorizontalBottom,
        "--n-scrollbar-rail-left-horizontal-bottom": railLeftHorizontalBottom,
        "--n-scrollbar-rail-top-vertical-right": railTopVerticalRight,
        "--n-scrollbar-rail-right-vertical-right": railRightVerticalRight,
        "--n-scrollbar-rail-bottom-vertical-right": railBottomVerticalRight,
        "--n-scrollbar-rail-left-vertical-right": railLeftVerticalRight,
        "--n-scrollbar-rail-top-vertical-left": railTopVerticalLeft,
        "--n-scrollbar-rail-right-vertical-left": railRightVerticalLeft,
        "--n-scrollbar-rail-bottom-vertical-left": railBottomVerticalLeft,
        "--n-scrollbar-rail-left-vertical-left": railLeftVerticalLeft,
        "--n-scrollbar-rail-color": railColor
      };
    });
    const themeClassHandle = inlineThemeDisabled ? useThemeClass("scrollbar", void 0, cssVarsRef, props) : void 0;
    const exposedMethods = {
      scrollTo,
      scrollBy,
      sync,
      syncUnifiedContainer,
      handleMouseEnterWrapper,
      handleMouseLeaveWrapper
    };
    return Object.assign(Object.assign({}, exposedMethods), {
      mergedClsPrefix: mergedClsPrefixRef,
      rtlEnabled: rtlEnabledRef,
      containerScrollTop: containerScrollTopRef,
      wrapperRef,
      containerRef,
      contentRef,
      yRailRef,
      xRailRef,
      needYBar: needYBarRef,
      needXBar: needXBarRef,
      yBarSizePx: yBarSizePxRef,
      xBarSizePx: xBarSizePxRef,
      yBarTopPx: yBarTopPxRef,
      xBarLeftPx: xBarLeftPxRef,
      isShowXBar: mergedShowXBarRef,
      isShowYBar: mergedShowYBarRef,
      isIos: isIos2,
      handleScroll,
      handleContentResize,
      handleContainerResize,
      handleYScrollMouseDown,
      handleXScrollMouseDown,
      cssVars: inlineThemeDisabled ? void 0 : cssVarsRef,
      themeClass: themeClassHandle === null || themeClassHandle === void 0 ? void 0 : themeClassHandle.themeClass,
      onRender: themeClassHandle === null || themeClassHandle === void 0 ? void 0 : themeClassHandle.onRender
    });
  },
  render() {
    var _a;
    const {
      $slots,
      mergedClsPrefix,
      triggerDisplayManually,
      rtlEnabled,
      internalHoistYRail,
      yPlacement,
      xPlacement,
      xScrollable
    } = this;
    if (!this.scrollable) return (_a = $slots.default) === null || _a === void 0 ? void 0 : _a.call($slots);
    const triggerIsNone = this.trigger === "none";
    const createYRail = (className, style2) => {
      return h("div", {
        ref: "yRailRef",
        class: [`${mergedClsPrefix}-scrollbar-rail`, `${mergedClsPrefix}-scrollbar-rail--vertical`, `${mergedClsPrefix}-scrollbar-rail--vertical--${yPlacement}`, className],
        "data-scrollbar-rail": true,
        style: [style2 || "", this.verticalRailStyle],
        "aria-hidden": true
      }, h(triggerIsNone ? Wrapper : Transition, triggerIsNone ? null : {
        name: "fade-in-transition"
      }, {
        default: () => this.needYBar && this.isShowYBar && !this.isIos ? h("div", {
          class: `${mergedClsPrefix}-scrollbar-rail__scrollbar`,
          style: {
            height: this.yBarSizePx,
            top: this.yBarTopPx
          },
          onMousedown: this.handleYScrollMouseDown
        }) : null
      }));
    };
    const createChildren = () => {
      var _a2, _b;
      (_a2 = this.onRender) === null || _a2 === void 0 ? void 0 : _a2.call(this);
      return h("div", mergeProps(this.$attrs, {
        role: "none",
        ref: "wrapperRef",
        class: [`${mergedClsPrefix}-scrollbar`, this.themeClass, rtlEnabled && `${mergedClsPrefix}-scrollbar--rtl`],
        style: this.cssVars,
        onMouseenter: triggerDisplayManually ? void 0 : this.handleMouseEnterWrapper,
        onMouseleave: triggerDisplayManually ? void 0 : this.handleMouseLeaveWrapper
      }), [this.container ? (_b = $slots.default) === null || _b === void 0 ? void 0 : _b.call($slots) : h("div", {
        role: "none",
        ref: "containerRef",
        class: [`${mergedClsPrefix}-scrollbar-container`, this.containerClass],
        style: this.containerStyle,
        onScroll: this.handleScroll,
        onWheel: this.onWheel
      }, h(VResizeObserver, {
        onResize: this.handleContentResize
      }, {
        default: () => h("div", {
          ref: "contentRef",
          role: "none",
          style: [{
            width: this.xScrollable ? "fit-content" : null
          }, this.contentStyle],
          class: [`${mergedClsPrefix}-scrollbar-content`, this.contentClass]
        }, $slots)
      })), internalHoistYRail ? null : createYRail(void 0, void 0), xScrollable && h("div", {
        ref: "xRailRef",
        class: [`${mergedClsPrefix}-scrollbar-rail`, `${mergedClsPrefix}-scrollbar-rail--horizontal`, `${mergedClsPrefix}-scrollbar-rail--horizontal--${xPlacement}`],
        style: this.horizontalRailStyle,
        "data-scrollbar-rail": true,
        "aria-hidden": true
      }, h(triggerIsNone ? Wrapper : Transition, triggerIsNone ? null : {
        name: "fade-in-transition"
      }, {
        default: () => this.needXBar && this.isShowXBar && !this.isIos ? h("div", {
          class: `${mergedClsPrefix}-scrollbar-rail__scrollbar`,
          style: {
            width: this.xBarSizePx,
            right: rtlEnabled ? this.xBarLeftPx : void 0,
            left: rtlEnabled ? void 0 : this.xBarLeftPx
          },
          onMousedown: this.handleXScrollMouseDown
        }) : null
      }))]);
    };
    const scrollbarNode = this.container ? createChildren() : h(VResizeObserver, {
      onResize: this.handleContainerResize
    }, {
      default: createChildren
    });
    if (internalHoistYRail) {
      return h(Fragment, null, scrollbarNode, createYRail(this.themeClass, this.cssVars));
    } else {
      return scrollbarNode;
    }
  }
});
const XScrollbar = Scrollbar;
function toArray(arg) {
  if (Array.isArray(arg))
    return arg;
  return [arg];
}
const TRAVERSE_COMMAND = {
  STOP: "STOP"
};
function traverseWithCb(treeNode, callback) {
  const command = callback(treeNode);
  if (treeNode.children !== void 0 && command !== TRAVERSE_COMMAND.STOP) {
    treeNode.children.forEach((childNode) => traverseWithCb(childNode, callback));
  }
}
function getNonLeafKeys(treeNodes, options = {}) {
  const { preserveGroup = false } = options;
  const keys2 = [];
  const cb = preserveGroup ? (node) => {
    if (!node.isLeaf) {
      keys2.push(node.key);
      traverse(node.children);
    }
  } : (node) => {
    if (!node.isLeaf) {
      if (!node.isGroup)
        keys2.push(node.key);
      traverse(node.children);
    }
  };
  function traverse(nodes) {
    nodes.forEach(cb);
  }
  traverse(treeNodes);
  return keys2;
}
function isLeaf(rawNode, getChildren) {
  const { isLeaf: isLeaf2 } = rawNode;
  if (isLeaf2 !== void 0)
    return isLeaf2;
  else if (!getChildren(rawNode))
    return true;
  return false;
}
function defaultGetChildren(node) {
  return node.children;
}
function defaultGetKey(node) {
  return node.key;
}
function isIgnored() {
  return false;
}
function isShallowLoaded(rawNode, getChildren) {
  const { isLeaf: isLeaf2 } = rawNode;
  if (isLeaf2 === false && !Array.isArray(getChildren(rawNode)))
    return false;
  return true;
}
function isDisabled(rawNode) {
  return rawNode.disabled === true;
}
function isExpilicitlyNotLoaded(rawNode, getChildren) {
  return rawNode.isLeaf === false && !Array.isArray(getChildren(rawNode));
}
function isNodeInvalid(rawNode, getChildren) {
  if (rawNode.isLeaf === true) {
    const children = getChildren(rawNode);
    if (Array.isArray(children) && children.length > 0)
      return true;
  }
  return false;
}
function unwrapCheckedKeys(result) {
  var _a;
  if (result === void 0 || result === null)
    return [];
  if (Array.isArray(result))
    return result;
  return (_a = result.checkedKeys) !== null && _a !== void 0 ? _a : [];
}
function unwrapIndeterminateKeys(result) {
  var _a;
  if (result === void 0 || result === null || Array.isArray(result)) {
    return [];
  }
  return (_a = result.indeterminateKeys) !== null && _a !== void 0 ? _a : [];
}
function merge(originalKeys, keysToAdd) {
  const set = new Set(originalKeys);
  keysToAdd.forEach((key) => {
    if (!set.has(key)) {
      set.add(key);
    }
  });
  return Array.from(set);
}
function minus(originalKeys, keysToRemove) {
  const set = new Set(originalKeys);
  keysToRemove.forEach((key) => {
    if (set.has(key)) {
      set.delete(key);
    }
  });
  return Array.from(set);
}
function isGroup(rawNode) {
  return (rawNode === null || rawNode === void 0 ? void 0 : rawNode.type) === "group";
}
class SubtreeNotLoadedError extends Error {
  constructor() {
    super();
    this.message = "SubtreeNotLoadedError: checking a subtree whose required nodes are not fully loaded.";
  }
}
function getExtendedCheckedKeySetAfterCheck(checkKeys, currentCheckedKeys, treeMate, allowNotLoaded) {
  return getExtendedCheckedKeySet(currentCheckedKeys.concat(checkKeys), treeMate, allowNotLoaded, false);
}
function getAvailableAscendantNodeSet(uncheckedKeys, treeMate) {
  const visitedKeys = /* @__PURE__ */ new Set();
  uncheckedKeys.forEach((uncheckedKey) => {
    const uncheckedTreeNode = treeMate.treeNodeMap.get(uncheckedKey);
    if (uncheckedTreeNode !== void 0) {
      let nodeCursor = uncheckedTreeNode.parent;
      while (nodeCursor !== null) {
        if (nodeCursor.disabled)
          break;
        if (visitedKeys.has(nodeCursor.key))
          break;
        else {
          visitedKeys.add(nodeCursor.key);
        }
        nodeCursor = nodeCursor.parent;
      }
    }
  });
  return visitedKeys;
}
function getExtendedCheckedKeySetAfterUncheck(uncheckedKeys, currentCheckedKeys, treeMate, allowNotLoaded) {
  const extendedCheckedKeySet = getExtendedCheckedKeySet(currentCheckedKeys, treeMate, allowNotLoaded, false);
  const extendedKeySetToUncheck = getExtendedCheckedKeySet(uncheckedKeys, treeMate, allowNotLoaded, true);
  const ascendantKeySet = getAvailableAscendantNodeSet(uncheckedKeys, treeMate);
  const keysToRemove = [];
  extendedCheckedKeySet.forEach((key) => {
    if (extendedKeySetToUncheck.has(key) || ascendantKeySet.has(key)) {
      keysToRemove.push(key);
    }
  });
  keysToRemove.forEach((key) => extendedCheckedKeySet.delete(key));
  return extendedCheckedKeySet;
}
function getCheckedKeys(options, treeMate) {
  const { checkedKeys, keysToCheck, keysToUncheck, indeterminateKeys, cascade, leafOnly, checkStrategy, allowNotLoaded } = options;
  if (!cascade) {
    if (keysToCheck !== void 0) {
      return {
        checkedKeys: merge(checkedKeys, keysToCheck),
        indeterminateKeys: Array.from(indeterminateKeys)
      };
    } else if (keysToUncheck !== void 0) {
      return {
        checkedKeys: minus(checkedKeys, keysToUncheck),
        indeterminateKeys: Array.from(indeterminateKeys)
      };
    } else {
      return {
        checkedKeys: Array.from(checkedKeys),
        indeterminateKeys: Array.from(indeterminateKeys)
      };
    }
  }
  const { levelTreeNodeMap } = treeMate;
  let extendedCheckedKeySet;
  if (keysToUncheck !== void 0) {
    extendedCheckedKeySet = getExtendedCheckedKeySetAfterUncheck(keysToUncheck, checkedKeys, treeMate, allowNotLoaded);
  } else if (keysToCheck !== void 0) {
    extendedCheckedKeySet = getExtendedCheckedKeySetAfterCheck(keysToCheck, checkedKeys, treeMate, allowNotLoaded);
  } else {
    extendedCheckedKeySet = getExtendedCheckedKeySet(checkedKeys, treeMate, allowNotLoaded, false);
  }
  const checkStrategyIsParent = checkStrategy === "parent";
  const checkStrategyIsChild = checkStrategy === "child" || leafOnly;
  const syntheticCheckedKeySet = extendedCheckedKeySet;
  const syntheticIndeterminateKeySet = /* @__PURE__ */ new Set();
  const maxLevel = Math.max.apply(null, Array.from(levelTreeNodeMap.keys()));
  for (let level = maxLevel; level >= 0; level -= 1) {
    const levelIsZero = level === 0;
    const levelTreeNodes = levelTreeNodeMap.get(level);
    for (const levelTreeNode of levelTreeNodes) {
      if (levelTreeNode.isLeaf)
        continue;
      const { key: levelTreeNodeKey, shallowLoaded } = levelTreeNode;
      if (checkStrategyIsChild && shallowLoaded) {
        levelTreeNode.children.forEach((v) => {
          if (!v.disabled && !v.isLeaf && v.shallowLoaded && syntheticCheckedKeySet.has(v.key)) {
            syntheticCheckedKeySet.delete(v.key);
          }
        });
      }
      if (levelTreeNode.disabled || !shallowLoaded) {
        continue;
      }
      let fullyChecked = true;
      let partialChecked = false;
      let allDisabled = true;
      for (const childNode of levelTreeNode.children) {
        const childKey = childNode.key;
        if (childNode.disabled)
          continue;
        if (allDisabled)
          allDisabled = false;
        if (syntheticCheckedKeySet.has(childKey)) {
          partialChecked = true;
        } else if (syntheticIndeterminateKeySet.has(childKey)) {
          partialChecked = true;
          fullyChecked = false;
          break;
        } else {
          fullyChecked = false;
          if (partialChecked) {
            break;
          }
        }
      }
      if (fullyChecked && !allDisabled) {
        if (checkStrategyIsParent) {
          levelTreeNode.children.forEach((v) => {
            if (!v.disabled && syntheticCheckedKeySet.has(v.key)) {
              syntheticCheckedKeySet.delete(v.key);
            }
          });
        }
        syntheticCheckedKeySet.add(levelTreeNodeKey);
      } else if (partialChecked) {
        syntheticIndeterminateKeySet.add(levelTreeNodeKey);
      }
      if (levelIsZero && checkStrategyIsChild && syntheticCheckedKeySet.has(levelTreeNodeKey)) {
        syntheticCheckedKeySet.delete(levelTreeNodeKey);
      }
    }
  }
  return {
    checkedKeys: Array.from(syntheticCheckedKeySet),
    indeterminateKeys: Array.from(syntheticIndeterminateKeySet)
  };
}
function getExtendedCheckedKeySet(checkedKeys, treeMate, allowNotLoaded, isUnchecking) {
  const { treeNodeMap, getChildren } = treeMate;
  const visitedKeySet = /* @__PURE__ */ new Set();
  const extendedKeySet = new Set(checkedKeys);
  checkedKeys.forEach((checkedKey) => {
    const checkedTreeNode = treeNodeMap.get(checkedKey);
    if (checkedTreeNode !== void 0) {
      traverseWithCb(checkedTreeNode, (treeNode) => {
        if (treeNode.disabled) {
          return TRAVERSE_COMMAND.STOP;
        }
        const { key } = treeNode;
        if (visitedKeySet.has(key))
          return;
        visitedKeySet.add(key);
        extendedKeySet.add(key);
        if (isExpilicitlyNotLoaded(treeNode.rawNode, getChildren)) {
          if (isUnchecking) {
            return TRAVERSE_COMMAND.STOP;
          } else if (!allowNotLoaded) {
            throw new SubtreeNotLoadedError();
          }
        }
      });
    }
  });
  return extendedKeySet;
}
function getPath(key, { includeGroup = false, includeSelf = true }, treeMate) {
  var _a;
  const treeNodeMap = treeMate.treeNodeMap;
  let treeNode = key === null || key === void 0 ? null : (_a = treeNodeMap.get(key)) !== null && _a !== void 0 ? _a : null;
  const mergedPath = {
    keyPath: [],
    treeNodePath: [],
    treeNode
  };
  if (treeNode === null || treeNode === void 0 ? void 0 : treeNode.ignored) {
    mergedPath.treeNode = null;
    return mergedPath;
  }
  while (treeNode) {
    if (!treeNode.ignored && (includeGroup || !treeNode.isGroup)) {
      mergedPath.treeNodePath.push(treeNode);
    }
    treeNode = treeNode.parent;
  }
  mergedPath.treeNodePath.reverse();
  if (!includeSelf)
    mergedPath.treeNodePath.pop();
  mergedPath.keyPath = mergedPath.treeNodePath.map((treeNode2) => treeNode2.key);
  return mergedPath;
}
function getFirstAvailableNode(nodes) {
  if (nodes.length === 0)
    return null;
  const node = nodes[0];
  if (node.isGroup || node.ignored || node.disabled) {
    return node.getNext();
  }
  return node;
}
function rawGetNext(node, loop) {
  const sibs = node.siblings;
  const l = sibs.length;
  const { index } = node;
  if (loop) {
    return sibs[(index + 1) % l];
  } else {
    if (index === sibs.length - 1)
      return null;
    return sibs[index + 1];
  }
}
function move(fromNode, dir, { loop = false, includeDisabled = false } = {}) {
  const iterate = dir === "prev" ? rawGetPrev : rawGetNext;
  const getChildOptions = {
    reverse: dir === "prev"
  };
  let meet = false;
  let endNode = null;
  function traverse(node) {
    if (node === null)
      return;
    if (node === fromNode) {
      if (!meet) {
        meet = true;
      } else if (!fromNode.disabled && !fromNode.isGroup) {
        endNode = fromNode;
        return;
      }
    } else {
      if ((!node.disabled || includeDisabled) && !node.ignored && !node.isGroup) {
        endNode = node;
        return;
      }
    }
    if (node.isGroup) {
      const child = getChild(node, getChildOptions);
      if (child !== null) {
        endNode = child;
      } else {
        traverse(iterate(node, loop));
      }
    } else {
      const nextNode = iterate(node, false);
      if (nextNode !== null) {
        traverse(nextNode);
      } else {
        const parent = rawGetParent(node);
        if (parent === null || parent === void 0 ? void 0 : parent.isGroup) {
          traverse(iterate(parent, loop));
        } else if (loop) {
          traverse(iterate(node, true));
        }
      }
    }
  }
  traverse(fromNode);
  return endNode;
}
function rawGetPrev(node, loop) {
  const sibs = node.siblings;
  const l = sibs.length;
  const { index } = node;
  if (loop) {
    return sibs[(index - 1 + l) % l];
  } else {
    if (index === 0)
      return null;
    return sibs[index - 1];
  }
}
function rawGetParent(node) {
  return node.parent;
}
function getChild(node, options = {}) {
  const { reverse = false } = options;
  const { children } = node;
  if (children) {
    const { length } = children;
    const start = reverse ? length - 1 : 0;
    const end = reverse ? -1 : length;
    const delta = reverse ? -1 : 1;
    for (let i = start; i !== end; i += delta) {
      const child = children[i];
      if (!child.disabled && !child.ignored) {
        if (child.isGroup) {
          const childInGroup = getChild(child, options);
          if (childInGroup !== null)
            return childInGroup;
        } else {
          return child;
        }
      }
    }
  }
  return null;
}
const moveMethods = {
  getChild() {
    if (this.ignored)
      return null;
    return getChild(this);
  },
  getParent() {
    const { parent } = this;
    if (parent === null || parent === void 0 ? void 0 : parent.isGroup) {
      return parent.getParent();
    }
    return parent;
  },
  getNext(options = {}) {
    return move(this, "next", options);
  },
  getPrev(options = {}) {
    return move(this, "prev", options);
  }
};
function flatten(treeNodes, expandedKeys) {
  const expandedKeySet = expandedKeys ? new Set(expandedKeys) : void 0;
  const flattenedNodes = [];
  function traverse(treeNodes2) {
    treeNodes2.forEach((treeNode) => {
      flattenedNodes.push(treeNode);
      if (treeNode.isLeaf || !treeNode.children || treeNode.ignored)
        return;
      if (treeNode.isGroup) {
        traverse(treeNode.children);
      } else if (
        // normal non-leaf node
        expandedKeySet === void 0 || expandedKeySet.has(treeNode.key)
      ) {
        traverse(treeNode.children);
      }
    });
  }
  traverse(treeNodes);
  return flattenedNodes;
}
function contains(parent, child) {
  const parentKey = parent.key;
  while (child) {
    if (child.key === parentKey)
      return true;
    child = child.parent;
  }
  return false;
}
function createTreeNodes(rawNodes, treeNodeMap, levelTreeNodeMap, nodeProto, getChildren, parent = null, level = 0) {
  const treeNodes = [];
  rawNodes.forEach((rawNode, index) => {
    var _a;
    if (process$1.env.NODE_ENV !== "production" && isNodeInvalid(rawNode, getChildren)) {
      console.error("[treemate]: node", rawNode, "is invalid");
    }
    const treeNode = Object.create(nodeProto);
    treeNode.rawNode = rawNode;
    treeNode.siblings = treeNodes;
    treeNode.level = level;
    treeNode.index = index;
    treeNode.isFirstChild = index === 0;
    treeNode.isLastChild = index + 1 === rawNodes.length;
    treeNode.parent = parent;
    if (!treeNode.ignored) {
      const rawChildren = getChildren(rawNode);
      if (Array.isArray(rawChildren)) {
        treeNode.children = createTreeNodes(rawChildren, treeNodeMap, levelTreeNodeMap, nodeProto, getChildren, treeNode, level + 1);
      }
    }
    treeNodes.push(treeNode);
    treeNodeMap.set(treeNode.key, treeNode);
    if (!levelTreeNodeMap.has(level))
      levelTreeNodeMap.set(level, []);
    (_a = levelTreeNodeMap.get(level)) === null || _a === void 0 ? void 0 : _a.push(treeNode);
  });
  return treeNodes;
}
function createTreeMate(rawNodes, options = {}) {
  var _a;
  const treeNodeMap = /* @__PURE__ */ new Map();
  const levelTreeNodeMap = /* @__PURE__ */ new Map();
  const { getDisabled = isDisabled, getIgnored = isIgnored, getIsGroup = isGroup, getKey = defaultGetKey } = options;
  const _getChildren = (_a = options.getChildren) !== null && _a !== void 0 ? _a : defaultGetChildren;
  const getChildren = options.ignoreEmptyChildren ? (node) => {
    const children = _getChildren(node);
    if (Array.isArray(children)) {
      if (!children.length)
        return null;
      return children;
    }
    return children;
  } : _getChildren;
  const nodeProto = Object.assign({
    get key() {
      return getKey(this.rawNode);
    },
    get disabled() {
      return getDisabled(this.rawNode);
    },
    get isGroup() {
      return getIsGroup(this.rawNode);
    },
    get isLeaf() {
      return isLeaf(this.rawNode, getChildren);
    },
    get shallowLoaded() {
      return isShallowLoaded(this.rawNode, getChildren);
    },
    get ignored() {
      return getIgnored(this.rawNode);
    },
    contains(node) {
      return contains(this, node);
    }
  }, moveMethods);
  const treeNodes = createTreeNodes(rawNodes, treeNodeMap, levelTreeNodeMap, nodeProto, getChildren);
  function getNode(key) {
    if (key === null || key === void 0)
      return null;
    const tmNode = treeNodeMap.get(key);
    if (tmNode && !tmNode.isGroup && !tmNode.ignored) {
      return tmNode;
    }
    return null;
  }
  function _getNode(key) {
    if (key === null || key === void 0)
      return null;
    const tmNode = treeNodeMap.get(key);
    if (tmNode && !tmNode.ignored) {
      return tmNode;
    }
    return null;
  }
  function getPrev(key, options2) {
    const node = _getNode(key);
    if (!node)
      return null;
    return node.getPrev(options2);
  }
  function getNext(key, options2) {
    const node = _getNode(key);
    if (!node)
      return null;
    return node.getNext(options2);
  }
  function getParent(key) {
    const node = _getNode(key);
    if (!node)
      return null;
    return node.getParent();
  }
  function getChild2(key) {
    const node = _getNode(key);
    if (!node)
      return null;
    return node.getChild();
  }
  const treemate = {
    treeNodes,
    treeNodeMap,
    levelTreeNodeMap,
    maxLevel: Math.max(...levelTreeNodeMap.keys()),
    getChildren,
    getFlattenedNodes(expandedKeys) {
      return flatten(treeNodes, expandedKeys);
    },
    getNode,
    getPrev,
    getNext,
    getParent,
    getChild: getChild2,
    getFirstAvailableNode() {
      return getFirstAvailableNode(treeNodes);
    },
    getPath(key, options2 = {}) {
      return getPath(key, options2, treemate);
    },
    getCheckedKeys(checkedKeys, options2 = {}) {
      const { cascade = true, leafOnly = false, checkStrategy = "all", allowNotLoaded = false } = options2;
      return getCheckedKeys({
        checkedKeys: unwrapCheckedKeys(checkedKeys),
        indeterminateKeys: unwrapIndeterminateKeys(checkedKeys),
        cascade,
        leafOnly,
        checkStrategy,
        allowNotLoaded
      }, treemate);
    },
    check(keysToCheck, checkedKeys, options2 = {}) {
      const { cascade = true, leafOnly = false, checkStrategy = "all", allowNotLoaded = false } = options2;
      return getCheckedKeys({
        checkedKeys: unwrapCheckedKeys(checkedKeys),
        indeterminateKeys: unwrapIndeterminateKeys(checkedKeys),
        keysToCheck: keysToCheck === void 0 || keysToCheck === null ? [] : toArray(keysToCheck),
        cascade,
        leafOnly,
        checkStrategy,
        allowNotLoaded
      }, treemate);
    },
    uncheck(keysToUncheck, checkedKeys, options2 = {}) {
      const { cascade = true, leafOnly = false, checkStrategy = "all", allowNotLoaded = false } = options2;
      return getCheckedKeys({
        checkedKeys: unwrapCheckedKeys(checkedKeys),
        indeterminateKeys: unwrapIndeterminateKeys(checkedKeys),
        keysToUncheck: keysToUncheck === null || keysToUncheck === void 0 ? [] : toArray(keysToUncheck),
        cascade,
        leafOnly,
        checkStrategy,
        allowNotLoaded
      }, treemate);
    },
    getNonLeafKeys(options2 = {}) {
      return getNonLeafKeys(treeNodes, options2);
    }
  };
  return treemate;
}
const {
  cubicBezierEaseIn,
  cubicBezierEaseOut
} = commonVariables$2;
function fadeInScaleUpTransition({
  transformOrigin = "inherit",
  duration = ".2s",
  enterScale = ".9",
  originalTransform = "",
  originalTransition = ""
} = {}) {
  return [c$1("&.fade-in-scale-up-transition-leave-active", {
    transformOrigin,
    transition: `opacity ${duration} ${cubicBezierEaseIn}, transform ${duration} ${cubicBezierEaseIn} ${originalTransition && `,${originalTransition}`}`
  }), c$1("&.fade-in-scale-up-transition-enter-active", {
    transformOrigin,
    transition: `opacity ${duration} ${cubicBezierEaseOut}, transform ${duration} ${cubicBezierEaseOut} ${originalTransition && `,${originalTransition}`}`
  }), c$1("&.fade-in-scale-up-transition-enter-from, &.fade-in-scale-up-transition-leave-to", {
    opacity: 0,
    transform: `${originalTransform} scale(${enterScale})`
  }), c$1("&.fade-in-scale-up-transition-leave-from, &.fade-in-scale-up-transition-enter-to", {
    opacity: 1,
    transform: `${originalTransform} scale(1)`
  })];
}
const commonVariables$1 = {
  space: "6px",
  spaceArrow: "10px",
  arrowOffset: "10px",
  arrowOffsetVertical: "10px",
  arrowHeight: "6px",
  padding: "8px 14px"
};
function self$5(vars) {
  const {
    boxShadow2,
    popoverColor,
    textColor2,
    borderRadius,
    fontSize: fontSize2,
    dividerColor
  } = vars;
  return Object.assign(Object.assign({}, commonVariables$1), {
    fontSize: fontSize2,
    borderRadius,
    color: popoverColor,
    dividerColor,
    textColor: textColor2,
    boxShadow: boxShadow2
  });
}
const popoverLight = {
  name: "Popover",
  common: derived,
  self: self$5
};
const oppositePlacement = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left"
};
const arrowSize = "var(--n-arrow-height) * 1.414";
const style$3 = c$1([cB("popover", `
 transition:
 box-shadow .3s var(--n-bezier),
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier);
 position: relative;
 font-size: var(--n-font-size);
 color: var(--n-text-color);
 box-shadow: var(--n-box-shadow);
 word-break: break-word;
 `, [c$1(">", [cB("scrollbar", `
 height: inherit;
 max-height: inherit;
 `)]), cNotM("raw", `
 background-color: var(--n-color);
 border-radius: var(--n-border-radius);
 `, [cNotM("scrollable", [cNotM("show-header-or-footer", "padding: var(--n-padding);")])]), cE("header", `
 padding: var(--n-padding);
 border-bottom: 1px solid var(--n-divider-color);
 transition: border-color .3s var(--n-bezier);
 `), cE("footer", `
 padding: var(--n-padding);
 border-top: 1px solid var(--n-divider-color);
 transition: border-color .3s var(--n-bezier);
 `), cM("scrollable, show-header-or-footer", [cE("content", `
 padding: var(--n-padding);
 `)])]), cB("popover-shared", `
 transform-origin: inherit;
 `, [
  cB("popover-arrow-wrapper", `
 position: absolute;
 overflow: hidden;
 pointer-events: none;
 `, [cB("popover-arrow", `
 transition: background-color .3s var(--n-bezier);
 position: absolute;
 display: block;
 width: calc(${arrowSize});
 height: calc(${arrowSize});
 box-shadow: 0 0 8px 0 rgba(0, 0, 0, .12);
 transform: rotate(45deg);
 background-color: var(--n-color);
 pointer-events: all;
 `)]),
  // body transition
  c$1("&.popover-transition-enter-from, &.popover-transition-leave-to", `
 opacity: 0;
 transform: scale(.85);
 `),
  c$1("&.popover-transition-enter-to, &.popover-transition-leave-from", `
 transform: scale(1);
 opacity: 1;
 `),
  c$1("&.popover-transition-enter-active", `
 transition:
 box-shadow .3s var(--n-bezier),
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier),
 opacity .15s var(--n-bezier-ease-out),
 transform .15s var(--n-bezier-ease-out);
 `),
  c$1("&.popover-transition-leave-active", `
 transition:
 box-shadow .3s var(--n-bezier),
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier),
 opacity .15s var(--n-bezier-ease-in),
 transform .15s var(--n-bezier-ease-in);
 `)
]), placementStyle("top-start", `
 top: calc(${arrowSize} / -2);
 left: calc(${getArrowOffset("top-start")} - var(--v-offset-left));
 `), placementStyle("top", `
 top: calc(${arrowSize} / -2);
 transform: translateX(calc(${arrowSize} / -2)) rotate(45deg);
 left: 50%;
 `), placementStyle("top-end", `
 top: calc(${arrowSize} / -2);
 right: calc(${getArrowOffset("top-end")} + var(--v-offset-left));
 `), placementStyle("bottom-start", `
 bottom: calc(${arrowSize} / -2);
 left: calc(${getArrowOffset("bottom-start")} - var(--v-offset-left));
 `), placementStyle("bottom", `
 bottom: calc(${arrowSize} / -2);
 transform: translateX(calc(${arrowSize} / -2)) rotate(45deg);
 left: 50%;
 `), placementStyle("bottom-end", `
 bottom: calc(${arrowSize} / -2);
 right: calc(${getArrowOffset("bottom-end")} + var(--v-offset-left));
 `), placementStyle("left-start", `
 left: calc(${arrowSize} / -2);
 top: calc(${getArrowOffset("left-start")} - var(--v-offset-top));
 `), placementStyle("left", `
 left: calc(${arrowSize} / -2);
 transform: translateY(calc(${arrowSize} / -2)) rotate(45deg);
 top: 50%;
 `), placementStyle("left-end", `
 left: calc(${arrowSize} / -2);
 bottom: calc(${getArrowOffset("left-end")} + var(--v-offset-top));
 `), placementStyle("right-start", `
 right: calc(${arrowSize} / -2);
 top: calc(${getArrowOffset("right-start")} - var(--v-offset-top));
 `), placementStyle("right", `
 right: calc(${arrowSize} / -2);
 transform: translateY(calc(${arrowSize} / -2)) rotate(45deg);
 top: 50%;
 `), placementStyle("right-end", `
 right: calc(${arrowSize} / -2);
 bottom: calc(${getArrowOffset("right-end")} + var(--v-offset-top));
 `), ...map({
  top: ["right-start", "left-start"],
  right: ["top-end", "bottom-end"],
  bottom: ["right-end", "left-end"],
  left: ["top-start", "bottom-start"]
}, (placements, direction) => {
  const isVertical = ["right", "left"].includes(direction);
  const sizeType = isVertical ? "width" : "height";
  return placements.map((placement) => {
    const isReverse = placement.split("-")[1] === "end";
    const targetSize = `var(--v-target-${sizeType}, 0px)`;
    const centerOffset = `calc((${targetSize} - ${arrowSize}) / 2)`;
    const offset = getArrowOffset(placement);
    return c$1(`[v-placement="${placement}"] >`, [cB("popover-shared", [cM("center-arrow", [cB("popover-arrow", `${direction}: calc(max(${centerOffset}, ${offset}) ${isReverse ? "+" : "-"} var(--v-offset-${isVertical ? "left" : "top"}));`)])])]);
  });
})]);
function getArrowOffset(placement) {
  return ["top", "bottom"].includes(placement.split("-")[0]) ? "var(--n-arrow-offset)" : "var(--n-arrow-offset-vertical)";
}
function placementStyle(placement, arrowStyleLiteral) {
  const position = placement.split("-")[0];
  const sizeStyle = ["top", "bottom"].includes(position) ? "height: var(--n-space-arrow);" : "width: var(--n-space-arrow);";
  return c$1(`[v-placement="${placement}"] >`, [cB("popover-shared", `
 margin-${oppositePlacement[position]}: var(--n-space);
 `, [cM("show-arrow", `
 margin-${oppositePlacement[position]}: var(--n-space-arrow);
 `), cM("overlap", `
 margin: 0;
 `), cCB("popover-arrow-wrapper", `
 right: 0;
 left: 0;
 top: 0;
 bottom: 0;
 ${position}: 100%;
 ${oppositePlacement[position]}: auto;
 ${sizeStyle}
 `, [cB("popover-arrow", arrowStyleLiteral)])])]);
}
const popoverBodyProps = Object.assign(Object.assign({}, useTheme.props), {
  to: useAdjustedTo.propTo,
  show: Boolean,
  trigger: String,
  showArrow: Boolean,
  delay: Number,
  duration: Number,
  raw: Boolean,
  arrowPointToCenter: Boolean,
  arrowClass: String,
  arrowStyle: [String, Object],
  arrowWrapperClass: String,
  arrowWrapperStyle: [String, Object],
  displayDirective: String,
  x: Number,
  y: Number,
  flip: Boolean,
  overlap: Boolean,
  placement: String,
  width: [Number, String],
  keepAliveOnHover: Boolean,
  scrollable: Boolean,
  contentClass: String,
  contentStyle: [Object, String],
  headerClass: String,
  headerStyle: [Object, String],
  footerClass: String,
  footerStyle: [Object, String],
  // private
  internalDeactivateImmediately: Boolean,
  animated: Boolean,
  onClickoutside: Function,
  internalTrapFocus: Boolean,
  internalOnAfterLeave: Function,
  // deprecated
  minWidth: Number,
  maxWidth: Number
});
function renderArrow({
  arrowClass,
  arrowStyle,
  arrowWrapperClass,
  arrowWrapperStyle,
  clsPrefix
}) {
  return h("div", {
    key: "__popover-arrow__",
    style: arrowWrapperStyle,
    class: [`${clsPrefix}-popover-arrow-wrapper`, arrowWrapperClass]
  }, h("div", {
    class: [`${clsPrefix}-popover-arrow`, arrowClass],
    style: arrowStyle
  }));
}
const NPopoverBody = defineComponent({
  name: "PopoverBody",
  inheritAttrs: false,
  props: popoverBodyProps,
  setup(props, {
    slots,
    attrs
  }) {
    const {
      namespaceRef,
      mergedClsPrefixRef,
      inlineThemeDisabled
    } = useConfig(props);
    const themeRef = useTheme("Popover", "-popover", style$3, popoverLight, props, mergedClsPrefixRef);
    const followerRef = ref(null);
    const NPopover2 = inject("NPopover");
    const bodyRef = ref(null);
    const followerEnabledRef = ref(props.show);
    const displayedRef = ref(false);
    watchEffect(() => {
      const {
        show
      } = props;
      if (show && !isJsdom() && !props.internalDeactivateImmediately) {
        displayedRef.value = true;
      }
    });
    const directivesRef = computed(() => {
      const {
        trigger: trigger2,
        onClickoutside
      } = props;
      const directives = [];
      const {
        positionManuallyRef: {
          value: positionManually
        }
      } = NPopover2;
      if (!positionManually) {
        if (trigger2 === "click" && !onClickoutside) {
          directives.push([clickoutside, handleClickOutside, void 0, {
            capture: true
          }]);
        }
        if (trigger2 === "hover") {
          directives.push([mousemoveoutside, handleMouseMoveOutside]);
        }
      }
      if (onClickoutside) {
        directives.push([clickoutside, handleClickOutside, void 0, {
          capture: true
        }]);
      }
      if (props.displayDirective === "show" || props.animated && displayedRef.value) {
        directives.push([vShow, props.show]);
      }
      return directives;
    });
    const cssVarsRef = computed(() => {
      const {
        common: {
          cubicBezierEaseInOut: cubicBezierEaseInOut2,
          cubicBezierEaseIn: cubicBezierEaseIn2,
          cubicBezierEaseOut: cubicBezierEaseOut2
        },
        self: {
          space,
          spaceArrow,
          padding,
          fontSize: fontSize2,
          textColor,
          dividerColor,
          color,
          boxShadow,
          borderRadius,
          arrowHeight,
          arrowOffset,
          arrowOffsetVertical
        }
      } = themeRef.value;
      return {
        "--n-box-shadow": boxShadow,
        "--n-bezier": cubicBezierEaseInOut2,
        "--n-bezier-ease-in": cubicBezierEaseIn2,
        "--n-bezier-ease-out": cubicBezierEaseOut2,
        "--n-font-size": fontSize2,
        "--n-text-color": textColor,
        "--n-color": color,
        "--n-divider-color": dividerColor,
        "--n-border-radius": borderRadius,
        "--n-arrow-height": arrowHeight,
        "--n-arrow-offset": arrowOffset,
        "--n-arrow-offset-vertical": arrowOffsetVertical,
        "--n-padding": padding,
        "--n-space": space,
        "--n-space-arrow": spaceArrow
      };
    });
    const styleRef = computed(() => {
      const width = props.width === "trigger" ? void 0 : formatLength(props.width);
      const style2 = [];
      if (width) {
        style2.push({
          width
        });
      }
      const {
        maxWidth,
        minWidth
      } = props;
      if (maxWidth) {
        style2.push({
          maxWidth: formatLength(maxWidth)
        });
      }
      if (minWidth) {
        style2.push({
          maxWidth: formatLength(minWidth)
        });
      }
      if (!inlineThemeDisabled) {
        style2.push(cssVarsRef.value);
      }
      return style2;
    });
    const themeClassHandle = inlineThemeDisabled ? useThemeClass("popover", void 0, cssVarsRef, props) : void 0;
    NPopover2.setBodyInstance({
      syncPosition
    });
    onBeforeUnmount(() => {
      NPopover2.setBodyInstance(null);
    });
    watch(toRef(props, "show"), (value) => {
      if (props.animated) return;
      if (value) {
        followerEnabledRef.value = true;
      } else {
        followerEnabledRef.value = false;
      }
    });
    function syncPosition() {
      var _a;
      (_a = followerRef.value) === null || _a === void 0 ? void 0 : _a.syncPosition();
    }
    function handleMouseEnter(e) {
      if (props.trigger === "hover" && props.keepAliveOnHover && props.show) {
        NPopover2.handleMouseEnter(e);
      }
    }
    function handleMouseLeave(e) {
      if (props.trigger === "hover" && props.keepAliveOnHover) {
        NPopover2.handleMouseLeave(e);
      }
    }
    function handleMouseMoveOutside(e) {
      if (props.trigger === "hover" && !getTriggerElement().contains(getPreciseEventTarget(e))) {
        NPopover2.handleMouseMoveOutside(e);
      }
    }
    function handleClickOutside(e) {
      if (props.trigger === "click" && !getTriggerElement().contains(getPreciseEventTarget(e)) || props.onClickoutside) {
        NPopover2.handleClickOutside(e);
      }
    }
    function getTriggerElement() {
      return NPopover2.getTriggerElement();
    }
    provide(popoverBodyInjectionKey, bodyRef);
    provide(drawerBodyInjectionKey, null);
    provide(modalBodyInjectionKey, null);
    function renderContentNode() {
      themeClassHandle === null || themeClassHandle === void 0 ? void 0 : themeClassHandle.onRender();
      const shouldRenderDom = props.displayDirective === "show" || props.show || props.animated && displayedRef.value;
      if (!shouldRenderDom) {
        return null;
      }
      let contentNode;
      const renderBody = NPopover2.internalRenderBodyRef.value;
      const {
        value: mergedClsPrefix
      } = mergedClsPrefixRef;
      if (!renderBody) {
        const {
          value: extraClass
        } = NPopover2.extraClassRef;
        const {
          internalTrapFocus
        } = props;
        const hasHeaderOrFooter = !isSlotEmpty(slots.header) || !isSlotEmpty(slots.footer);
        const renderContentInnerNode = () => {
          var _a, _b;
          const body = hasHeaderOrFooter ? h(Fragment, null, resolveWrappedSlot(slots.header, (children) => {
            return children ? h("div", {
              class: [`${mergedClsPrefix}-popover__header`, props.headerClass],
              style: props.headerStyle
            }, children) : null;
          }), resolveWrappedSlot(slots.default, (children) => {
            return children ? h("div", {
              class: [`${mergedClsPrefix}-popover__content`, props.contentClass],
              style: props.contentStyle
            }, slots) : null;
          }), resolveWrappedSlot(slots.footer, (children) => {
            return children ? h("div", {
              class: [`${mergedClsPrefix}-popover__footer`, props.footerClass],
              style: props.footerStyle
            }, children) : null;
          })) : props.scrollable ? (_a = slots.default) === null || _a === void 0 ? void 0 : _a.call(slots) : h("div", {
            class: [`${mergedClsPrefix}-popover__content`, props.contentClass],
            style: props.contentStyle
          }, slots);
          const maybeScrollableBody = props.scrollable ? h(XScrollbar, {
            contentClass: hasHeaderOrFooter ? void 0 : `${mergedClsPrefix}-popover__content ${(_b = props.contentClass) !== null && _b !== void 0 ? _b : ""}`,
            contentStyle: hasHeaderOrFooter ? void 0 : props.contentStyle
          }, {
            default: () => body
          }) : body;
          const arrow = props.showArrow ? renderArrow({
            arrowClass: props.arrowClass,
            arrowStyle: props.arrowStyle,
            arrowWrapperClass: props.arrowWrapperClass,
            arrowWrapperStyle: props.arrowWrapperStyle,
            clsPrefix: mergedClsPrefix
          }) : null;
          return [maybeScrollableBody, arrow];
        };
        contentNode = h("div", mergeProps({
          class: [`${mergedClsPrefix}-popover`, `${mergedClsPrefix}-popover-shared`, themeClassHandle === null || themeClassHandle === void 0 ? void 0 : themeClassHandle.themeClass.value, extraClass.map((v) => `${mergedClsPrefix}-${v}`), {
            [`${mergedClsPrefix}-popover--scrollable`]: props.scrollable,
            [`${mergedClsPrefix}-popover--show-header-or-footer`]: hasHeaderOrFooter,
            [`${mergedClsPrefix}-popover--raw`]: props.raw,
            [`${mergedClsPrefix}-popover-shared--overlap`]: props.overlap,
            [`${mergedClsPrefix}-popover-shared--show-arrow`]: props.showArrow,
            [`${mergedClsPrefix}-popover-shared--center-arrow`]: props.arrowPointToCenter
          }],
          ref: bodyRef,
          style: styleRef.value,
          onKeydown: NPopover2.handleKeydown,
          onMouseenter: handleMouseEnter,
          onMouseleave: handleMouseLeave
        }, attrs), internalTrapFocus ? h(FocusTrap, {
          active: props.show,
          autoFocus: true
        }, {
          default: renderContentInnerNode
        }) : renderContentInnerNode());
      } else {
        contentNode = renderBody(
          // The popover class and overlap class must exists, they will be used
          // to place the body & transition animation.
          // Shadow class exists for reuse box-shadow.
          [`${mergedClsPrefix}-popover-shared`, themeClassHandle === null || themeClassHandle === void 0 ? void 0 : themeClassHandle.themeClass.value, props.overlap && `${mergedClsPrefix}-popover-shared--overlap`, props.showArrow && `${mergedClsPrefix}-popover-shared--show-arrow`, props.arrowPointToCenter && `${mergedClsPrefix}-popover-shared--center-arrow`],
          bodyRef,
          styleRef.value,
          handleMouseEnter,
          handleMouseLeave
        );
      }
      return withDirectives(contentNode, directivesRef.value);
    }
    return {
      displayed: displayedRef,
      namespace: namespaceRef,
      isMounted: NPopover2.isMountedRef,
      zIndex: NPopover2.zIndexRef,
      followerRef,
      adjustedTo: useAdjustedTo(props),
      followerEnabled: followerEnabledRef,
      renderContentNode
    };
  },
  render() {
    return h(VFollower, {
      ref: "followerRef",
      zIndex: this.zIndex,
      show: this.show,
      enabled: this.followerEnabled,
      to: this.adjustedTo,
      x: this.x,
      y: this.y,
      flip: this.flip,
      placement: this.placement,
      containerClass: this.namespace,
      overlap: this.overlap,
      width: this.width === "trigger" ? "target" : void 0,
      teleportDisabled: this.adjustedTo === useAdjustedTo.tdkey
    }, {
      default: () => {
        return this.animated ? h(Transition, {
          name: "popover-transition",
          appear: this.isMounted,
          // Don't use watch to enable follower, since the transition may
          // make position sync timing very subtle and buggy.
          onEnter: () => {
            this.followerEnabled = true;
          },
          onAfterLeave: () => {
            var _a;
            (_a = this.internalOnAfterLeave) === null || _a === void 0 ? void 0 : _a.call(this);
            this.followerEnabled = false;
            this.displayed = false;
          }
        }, {
          default: this.renderContentNode
        }) : this.renderContentNode();
      }
    });
  }
});
const bodyPropKeys = Object.keys(popoverBodyProps);
const triggerEventMap = {
  focus: ["onFocus", "onBlur"],
  click: ["onClick"],
  hover: ["onMouseenter", "onMouseleave"],
  manual: [],
  nested: ["onFocus", "onBlur", "onMouseenter", "onMouseleave", "onClick"]
};
function appendEvents(vNode, trigger2, events2) {
  triggerEventMap[trigger2].forEach((eventName) => {
    if (!vNode.props) {
      vNode.props = {};
    } else {
      vNode.props = Object.assign({}, vNode.props);
    }
    const originalHandler = vNode.props[eventName];
    const handler = events2[eventName];
    if (!originalHandler) {
      vNode.props[eventName] = handler;
    } else {
      vNode.props[eventName] = (...args) => {
        originalHandler(...args);
        handler(...args);
      };
    }
  });
}
const popoverBaseProps = {
  show: {
    type: Boolean,
    default: void 0
  },
  defaultShow: Boolean,
  showArrow: {
    type: Boolean,
    default: true
  },
  trigger: {
    type: String,
    default: "hover"
  },
  delay: {
    type: Number,
    default: 100
  },
  duration: {
    type: Number,
    default: 100
  },
  raw: Boolean,
  placement: {
    type: String,
    default: "top"
  },
  x: Number,
  y: Number,
  arrowPointToCenter: Boolean,
  disabled: Boolean,
  getDisabled: Function,
  displayDirective: {
    type: String,
    default: "if"
  },
  arrowClass: String,
  arrowStyle: [String, Object],
  arrowWrapperClass: String,
  arrowWrapperStyle: [String, Object],
  flip: {
    type: Boolean,
    default: true
  },
  animated: {
    type: Boolean,
    default: true
  },
  width: {
    type: [Number, String],
    default: void 0
  },
  overlap: Boolean,
  keepAliveOnHover: {
    type: Boolean,
    default: true
  },
  zIndex: Number,
  to: useAdjustedTo.propTo,
  scrollable: Boolean,
  contentClass: String,
  contentStyle: [Object, String],
  headerClass: String,
  headerStyle: [Object, String],
  footerClass: String,
  footerStyle: [Object, String],
  // events
  onClickoutside: Function,
  "onUpdate:show": [Function, Array],
  onUpdateShow: [Function, Array],
  // internal
  internalDeactivateImmediately: Boolean,
  internalSyncTargetWithParent: Boolean,
  internalInheritedEventHandlers: {
    type: Array,
    default: () => []
  },
  internalTrapFocus: Boolean,
  internalExtraClass: {
    type: Array,
    default: () => []
  },
  // deprecated
  onShow: [Function, Array],
  onHide: [Function, Array],
  arrow: {
    type: Boolean,
    default: void 0
  },
  minWidth: Number,
  maxWidth: Number
};
const popoverProps = Object.assign(Object.assign(Object.assign({}, useTheme.props), popoverBaseProps), {
  internalOnAfterLeave: Function,
  internalRenderBody: Function
});
const NPopover = defineComponent({
  name: "Popover",
  inheritAttrs: false,
  props: popoverProps,
  slots: Object,
  __popover__: true,
  setup(props) {
    if (process$1.env.NODE_ENV !== "production") {
      watchEffect(() => {
        if (props.maxWidth !== void 0) {
          warnOnce("popover", "`max-width` is deprecated, please use `style` instead.");
        }
        if (props.minWidth !== void 0) {
          warnOnce("popover", "`min-width` is deprecated, please use `style` instead.");
        }
        if (props.arrow !== void 0) {
          warnOnce("popover", "`arrow` is deprecated, please use `showArrow` instead.");
        }
        if (props.onHide !== void 0) {
          warnOnce("popover", "`on-hide` is deprecated, please use `on-update:show` instead.");
        }
        if (props.onShow !== void 0) {
          warnOnce("popover", "`on-show` is deprecated, please use `on-update:show` instead.");
        }
      });
    }
    const isMountedRef = isMounted();
    const binderInstRef = ref(null);
    const controlledShowRef = computed(() => props.show);
    const uncontrolledShowRef = ref(props.defaultShow);
    const mergedShowWithoutDisabledRef = useMergedState(controlledShowRef, uncontrolledShowRef);
    const mergedShowConsideringDisabledPropRef = useMemo(() => {
      if (props.disabled) return false;
      return mergedShowWithoutDisabledRef.value;
    });
    const getMergedDisabled = () => {
      if (props.disabled) return true;
      const {
        getDisabled
      } = props;
      if (getDisabled === null || getDisabled === void 0 ? void 0 : getDisabled()) return true;
      return false;
    };
    const getMergedShow = () => {
      if (getMergedDisabled()) return false;
      return mergedShowWithoutDisabledRef.value;
    };
    const compatibleShowArrowRef = useCompitable(props, ["arrow", "showArrow"]);
    const mergedShowArrowRef = computed(() => {
      if (props.overlap) return false;
      return compatibleShowArrowRef.value;
    });
    let bodyInstance = null;
    const showTimerIdRef = ref(null);
    const hideTimerIdRef = ref(null);
    const positionManuallyRef = useMemo(() => {
      return props.x !== void 0 && props.y !== void 0;
    });
    function doUpdateShow(value) {
      const {
        "onUpdate:show": _onUpdateShow,
        onUpdateShow,
        onShow,
        onHide
      } = props;
      uncontrolledShowRef.value = value;
      if (_onUpdateShow) {
        call(_onUpdateShow, value);
      }
      if (onUpdateShow) {
        call(onUpdateShow, value);
      }
      if (value && onShow) {
        call(onShow, true);
      }
      if (value && onHide) {
        call(onHide, false);
      }
    }
    function syncPosition() {
      if (bodyInstance) {
        bodyInstance.syncPosition();
      }
    }
    function clearShowTimer() {
      const {
        value: showTimerId
      } = showTimerIdRef;
      if (showTimerId) {
        window.clearTimeout(showTimerId);
        showTimerIdRef.value = null;
      }
    }
    function clearHideTimer() {
      const {
        value: hideTimerId
      } = hideTimerIdRef;
      if (hideTimerId) {
        window.clearTimeout(hideTimerId);
        hideTimerIdRef.value = null;
      }
    }
    function handleFocus() {
      const mergedDisabled = getMergedDisabled();
      if (props.trigger === "focus" && !mergedDisabled) {
        if (getMergedShow()) return;
        doUpdateShow(true);
      }
    }
    function handleBlur() {
      const mergedDisabled = getMergedDisabled();
      if (props.trigger === "focus" && !mergedDisabled) {
        if (!getMergedShow()) return;
        doUpdateShow(false);
      }
    }
    function handleMouseEnter() {
      const mergedDisabled = getMergedDisabled();
      if (props.trigger === "hover" && !mergedDisabled) {
        clearHideTimer();
        if (showTimerIdRef.value !== null) return;
        if (getMergedShow()) return;
        const delayCallback = () => {
          doUpdateShow(true);
          showTimerIdRef.value = null;
        };
        const {
          delay
        } = props;
        if (delay === 0) {
          delayCallback();
        } else {
          showTimerIdRef.value = window.setTimeout(delayCallback, delay);
        }
      }
    }
    function handleMouseLeave() {
      const mergedDisabled = getMergedDisabled();
      if (props.trigger === "hover" && !mergedDisabled) {
        clearShowTimer();
        if (hideTimerIdRef.value !== null) return;
        if (!getMergedShow()) return;
        const delayedCallback = () => {
          doUpdateShow(false);
          hideTimerIdRef.value = null;
        };
        const {
          duration
        } = props;
        if (duration === 0) {
          delayedCallback();
        } else {
          hideTimerIdRef.value = window.setTimeout(delayedCallback, duration);
        }
      }
    }
    function handleMouseMoveOutside() {
      handleMouseLeave();
    }
    function handleClickOutside(e) {
      var _a;
      if (!getMergedShow()) return;
      if (props.trigger === "click") {
        clearShowTimer();
        clearHideTimer();
        doUpdateShow(false);
      }
      (_a = props.onClickoutside) === null || _a === void 0 ? void 0 : _a.call(props, e);
    }
    function handleClick() {
      if (props.trigger === "click" && !getMergedDisabled()) {
        clearShowTimer();
        clearHideTimer();
        const nextShow = !getMergedShow();
        doUpdateShow(nextShow);
      }
    }
    function handleKeydown(e) {
      if (!props.internalTrapFocus) return;
      if (e.key === "Escape") {
        clearShowTimer();
        clearHideTimer();
        doUpdateShow(false);
      }
    }
    function setShow(value) {
      uncontrolledShowRef.value = value;
    }
    function getTriggerElement() {
      var _a;
      return (_a = binderInstRef.value) === null || _a === void 0 ? void 0 : _a.targetRef;
    }
    function setBodyInstance(value) {
      bodyInstance = value;
    }
    provide("NPopover", {
      getTriggerElement,
      handleKeydown,
      handleMouseEnter,
      handleMouseLeave,
      handleClickOutside,
      handleMouseMoveOutside,
      setBodyInstance,
      positionManuallyRef,
      isMountedRef,
      zIndexRef: toRef(props, "zIndex"),
      extraClassRef: toRef(props, "internalExtraClass"),
      internalRenderBodyRef: toRef(props, "internalRenderBody")
    });
    watchEffect(() => {
      if (mergedShowWithoutDisabledRef.value && getMergedDisabled()) {
        doUpdateShow(false);
      }
    });
    const returned = {
      binderInstRef,
      positionManually: positionManuallyRef,
      mergedShowConsideringDisabledProp: mergedShowConsideringDisabledPropRef,
      // if to show popover body
      uncontrolledShow: uncontrolledShowRef,
      mergedShowArrow: mergedShowArrowRef,
      getMergedShow,
      setShow,
      handleClick,
      handleMouseEnter,
      handleMouseLeave,
      handleFocus,
      handleBlur,
      syncPosition
    };
    return returned;
  },
  render() {
    var _a;
    const {
      positionManually,
      $slots: slots
    } = this;
    let triggerVNode;
    let popoverInside = false;
    if (!positionManually) {
      triggerVNode = getFirstSlotVNode(slots, "trigger");
      if (triggerVNode) {
        triggerVNode = cloneVNode(triggerVNode);
        triggerVNode = triggerVNode.type === Text ? h("span", [triggerVNode]) : triggerVNode;
        const handlers = {
          onClick: this.handleClick,
          onMouseenter: this.handleMouseEnter,
          onMouseleave: this.handleMouseLeave,
          onFocus: this.handleFocus,
          onBlur: this.handleBlur
        };
        if ((_a = triggerVNode.type) === null || _a === void 0 ? void 0 : _a.__popover__) {
          popoverInside = true;
          if (!triggerVNode.props) {
            triggerVNode.props = {
              internalSyncTargetWithParent: true,
              internalInheritedEventHandlers: []
            };
          }
          triggerVNode.props.internalSyncTargetWithParent = true;
          if (!triggerVNode.props.internalInheritedEventHandlers) {
            triggerVNode.props.internalInheritedEventHandlers = [handlers];
          } else {
            triggerVNode.props.internalInheritedEventHandlers = [handlers, ...triggerVNode.props.internalInheritedEventHandlers];
          }
        } else {
          const {
            internalInheritedEventHandlers
          } = this;
          const ascendantAndCurrentHandlers = [handlers, ...internalInheritedEventHandlers];
          const mergedHandlers = {
            onBlur: (e) => {
              ascendantAndCurrentHandlers.forEach((_handlers) => {
                _handlers.onBlur(e);
              });
            },
            onFocus: (e) => {
              ascendantAndCurrentHandlers.forEach((_handlers) => {
                _handlers.onFocus(e);
              });
            },
            onClick: (e) => {
              ascendantAndCurrentHandlers.forEach((_handlers) => {
                _handlers.onClick(e);
              });
            },
            onMouseenter: (e) => {
              ascendantAndCurrentHandlers.forEach((_handlers) => {
                _handlers.onMouseenter(e);
              });
            },
            onMouseleave: (e) => {
              ascendantAndCurrentHandlers.forEach((_handlers) => {
                _handlers.onMouseleave(e);
              });
            }
          };
          appendEvents(triggerVNode, internalInheritedEventHandlers ? "nested" : positionManually ? "manual" : this.trigger, mergedHandlers);
        }
      }
    }
    return h(Binder, {
      ref: "binderInstRef",
      syncTarget: !popoverInside,
      syncTargetWithParent: this.internalSyncTargetWithParent
    }, {
      default: () => {
        void this.mergedShowConsideringDisabledProp;
        const mergedShow = this.getMergedShow();
        return [this.internalTrapFocus && mergedShow ? withDirectives(h("div", {
          style: {
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
          }
        }), [[zindexable, {
          enabled: mergedShow,
          zIndex: this.zIndex
        }]]) : null, positionManually ? null : h(VTarget, null, {
          default: () => triggerVNode
        }), h(NPopoverBody, keep(this.$props, bodyPropKeys, Object.assign(Object.assign({}, this.$attrs), {
          showArrow: this.mergedShowArrow,
          show: mergedShow
        })), {
          default: () => {
            var _a2, _b;
            return (_b = (_a2 = this.$slots).default) === null || _b === void 0 ? void 0 : _b.call(_a2);
          },
          header: () => {
            var _a2, _b;
            return (_b = (_a2 = this.$slots).header) === null || _b === void 0 ? void 0 : _b.call(_a2);
          },
          footer: () => {
            var _a2, _b;
            return (_b = (_a2 = this.$slots).footer) === null || _b === void 0 ? void 0 : _b.call(_a2);
          }
        })];
      }
    });
  }
});
const commonVariables = {
  padding: "4px 0",
  optionIconSizeSmall: "14px",
  optionIconSizeMedium: "16px",
  optionIconSizeLarge: "16px",
  optionIconSizeHuge: "18px",
  optionSuffixWidthSmall: "14px",
  optionSuffixWidthMedium: "14px",
  optionSuffixWidthLarge: "16px",
  optionSuffixWidthHuge: "16px",
  optionIconSuffixWidthSmall: "32px",
  optionIconSuffixWidthMedium: "32px",
  optionIconSuffixWidthLarge: "36px",
  optionIconSuffixWidthHuge: "36px",
  optionPrefixWidthSmall: "14px",
  optionPrefixWidthMedium: "14px",
  optionPrefixWidthLarge: "16px",
  optionPrefixWidthHuge: "16px",
  optionIconPrefixWidthSmall: "36px",
  optionIconPrefixWidthMedium: "36px",
  optionIconPrefixWidthLarge: "40px",
  optionIconPrefixWidthHuge: "40px"
};
function self$4(vars) {
  const {
    primaryColor,
    textColor2,
    dividerColor,
    hoverColor,
    popoverColor,
    invertedColor,
    borderRadius,
    fontSizeSmall,
    fontSizeMedium,
    fontSizeLarge,
    fontSizeHuge,
    heightSmall,
    heightMedium,
    heightLarge,
    heightHuge,
    textColor3,
    opacityDisabled
  } = vars;
  return Object.assign(Object.assign({}, commonVariables), {
    optionHeightSmall: heightSmall,
    optionHeightMedium: heightMedium,
    optionHeightLarge: heightLarge,
    optionHeightHuge: heightHuge,
    borderRadius,
    fontSizeSmall,
    fontSizeMedium,
    fontSizeLarge,
    fontSizeHuge,
    // non-inverted
    optionTextColor: textColor2,
    optionTextColorHover: textColor2,
    optionTextColorActive: primaryColor,
    optionTextColorChildActive: primaryColor,
    color: popoverColor,
    dividerColor,
    suffixColor: textColor2,
    prefixColor: textColor2,
    optionColorHover: hoverColor,
    optionColorActive: changeColor(primaryColor, {
      alpha: 0.1
    }),
    groupHeaderTextColor: textColor3,
    // inverted
    optionTextColorInverted: "#BBB",
    optionTextColorHoverInverted: "#FFF",
    optionTextColorActiveInverted: "#FFF",
    optionTextColorChildActiveInverted: "#FFF",
    colorInverted: invertedColor,
    dividerColorInverted: "#BBB",
    suffixColorInverted: "#BBB",
    prefixColorInverted: "#BBB",
    optionColorHoverInverted: primaryColor,
    optionColorActiveInverted: primaryColor,
    groupHeaderTextColorInverted: "#AAA",
    optionOpacityDisabled: opacityDisabled
  });
}
const dropdownLight = createTheme({
  name: "Dropdown",
  common: derived,
  peers: {
    Popover: popoverLight
  },
  self: self$4
});
const commonVars = {
  padding: "8px 14px"
};
function self$3(vars) {
  const {
    borderRadius,
    boxShadow2,
    baseColor
  } = vars;
  return Object.assign(Object.assign({}, commonVars), {
    borderRadius,
    boxShadow: boxShadow2,
    color: composite(baseColor, "rgba(0, 0, 0, .85)"),
    textColor: baseColor
  });
}
const tooltipLight = createTheme({
  name: "Tooltip",
  common: derived,
  peers: {
    Popover: popoverLight
  },
  self: self$3
});
const tooltipProps = Object.assign(Object.assign({}, popoverBaseProps), useTheme.props);
const NTooltip = defineComponent({
  name: "Tooltip",
  props: tooltipProps,
  slots: Object,
  __popover__: true,
  setup(props) {
    const {
      mergedClsPrefixRef
    } = useConfig(props);
    const themeRef = useTheme("Tooltip", "-tooltip", void 0, tooltipLight, props, mergedClsPrefixRef);
    const popoverRef = ref(null);
    const tooltipExposedMethod = {
      syncPosition() {
        popoverRef.value.syncPosition();
      },
      setShow(show) {
        popoverRef.value.setShow(show);
      }
    };
    return Object.assign(Object.assign({}, tooltipExposedMethod), {
      popoverRef,
      mergedTheme: themeRef,
      popoverThemeOverrides: computed(() => {
        return themeRef.value.self;
      })
    });
  },
  render() {
    const {
      mergedTheme,
      internalExtraClass
    } = this;
    return h(NPopover, Object.assign(Object.assign({}, this.$props), {
      theme: mergedTheme.peers.Popover,
      themeOverrides: mergedTheme.peerOverrides.Popover,
      builtinThemeOverrides: this.popoverThemeOverrides,
      internalExtraClass: internalExtraClass.concat("tooltip"),
      ref: "popoverRef"
    }), this.$slots);
  }
});
const dropdownMenuInjectionKey = createInjectionKey("n-dropdown-menu");
const dropdownInjectionKey = createInjectionKey("n-dropdown");
const dropdownOptionInjectionKey = createInjectionKey("n-dropdown-option");
const NDropdownDivider = defineComponent({
  name: "DropdownDivider",
  props: {
    clsPrefix: {
      type: String,
      required: true
    }
  },
  render() {
    return h("div", {
      class: `${this.clsPrefix}-dropdown-divider`
    });
  }
});
const NDropdownGroupHeader = defineComponent({
  name: "DropdownGroupHeader",
  props: {
    clsPrefix: {
      type: String,
      required: true
    },
    tmNode: {
      type: Object,
      required: true
    }
  },
  setup() {
    const {
      showIconRef,
      hasSubmenuRef
    } = inject(dropdownMenuInjectionKey);
    const {
      renderLabelRef,
      labelFieldRef,
      nodePropsRef,
      renderOptionRef
    } = inject(dropdownInjectionKey);
    return {
      labelField: labelFieldRef,
      showIcon: showIconRef,
      hasSubmenu: hasSubmenuRef,
      renderLabel: renderLabelRef,
      nodeProps: nodePropsRef,
      renderOption: renderOptionRef
    };
  },
  render() {
    var _a;
    const {
      clsPrefix,
      hasSubmenu,
      showIcon,
      nodeProps,
      renderLabel,
      renderOption
    } = this;
    const {
      rawNode
    } = this.tmNode;
    const node = h("div", Object.assign({
      class: `${clsPrefix}-dropdown-option`
    }, nodeProps === null || nodeProps === void 0 ? void 0 : nodeProps(rawNode)), h("div", {
      class: `${clsPrefix}-dropdown-option-body ${clsPrefix}-dropdown-option-body--group`
    }, h("div", {
      "data-dropdown-option": true,
      class: [`${clsPrefix}-dropdown-option-body__prefix`, showIcon && `${clsPrefix}-dropdown-option-body__prefix--show-icon`]
    }, render(rawNode.icon)), h("div", {
      class: `${clsPrefix}-dropdown-option-body__label`,
      "data-dropdown-option": true
    }, renderLabel ? renderLabel(rawNode) : render((_a = rawNode.title) !== null && _a !== void 0 ? _a : rawNode[this.labelField])), h("div", {
      class: [`${clsPrefix}-dropdown-option-body__suffix`, hasSubmenu && `${clsPrefix}-dropdown-option-body__suffix--has-submenu`],
      "data-dropdown-option": true
    })));
    if (renderOption) {
      return renderOption({
        node,
        option: rawNode
      });
    }
    return node;
  }
});
function self$2(vars) {
  const {
    textColorBase,
    opacity1,
    opacity2,
    opacity3,
    opacity4,
    opacity5
  } = vars;
  return {
    color: textColorBase,
    opacity1Depth: opacity1,
    opacity2Depth: opacity2,
    opacity3Depth: opacity3,
    opacity4Depth: opacity4,
    opacity5Depth: opacity5
  };
}
const iconLight = {
  common: derived,
  self: self$2
};
const style$2 = cB("icon", `
 height: 1em;
 width: 1em;
 line-height: 1em;
 text-align: center;
 display: inline-block;
 position: relative;
 fill: currentColor;
`, [cM("color-transition", {
  transition: "color .3s var(--n-bezier)"
}), cM("depth", {
  color: "var(--n-color)"
}, [c$1("svg", {
  opacity: "var(--n-opacity)",
  transition: "opacity .3s var(--n-bezier)"
})]), c$1("svg", {
  height: "1em",
  width: "1em"
})]);
const iconProps = Object.assign(Object.assign({}, useTheme.props), {
  depth: [String, Number],
  size: [Number, String],
  color: String,
  component: [Object, Function]
});
const NIcon = defineComponent({
  _n_icon__: true,
  name: "Icon",
  inheritAttrs: false,
  props: iconProps,
  setup(props) {
    const {
      mergedClsPrefixRef,
      inlineThemeDisabled
    } = useConfig(props);
    const themeRef = useTheme("Icon", "-icon", style$2, iconLight, props, mergedClsPrefixRef);
    const cssVarsRef = computed(() => {
      const {
        depth
      } = props;
      const {
        common: {
          cubicBezierEaseInOut: cubicBezierEaseInOut2
        },
        self: self2
      } = themeRef.value;
      if (depth !== void 0) {
        const {
          color,
          [`opacity${depth}Depth`]: opacity
        } = self2;
        return {
          "--n-bezier": cubicBezierEaseInOut2,
          "--n-color": color,
          "--n-opacity": opacity
        };
      }
      return {
        "--n-bezier": cubicBezierEaseInOut2,
        "--n-color": "",
        "--n-opacity": ""
      };
    });
    const themeClassHandle = inlineThemeDisabled ? useThemeClass("icon", computed(() => `${props.depth || "d"}`), cssVarsRef, props) : void 0;
    return {
      mergedClsPrefix: mergedClsPrefixRef,
      mergedStyle: computed(() => {
        const {
          size: size2,
          color
        } = props;
        return {
          fontSize: formatLength(size2),
          color
        };
      }),
      cssVars: inlineThemeDisabled ? void 0 : cssVarsRef,
      themeClass: themeClassHandle === null || themeClassHandle === void 0 ? void 0 : themeClassHandle.themeClass,
      onRender: themeClassHandle === null || themeClassHandle === void 0 ? void 0 : themeClassHandle.onRender
    };
  },
  render() {
    var _a;
    const {
      $parent,
      depth,
      mergedClsPrefix,
      component,
      onRender,
      themeClass
    } = this;
    if ((_a = $parent === null || $parent === void 0 ? void 0 : $parent.$options) === null || _a === void 0 ? void 0 : _a._n_icon__) {
      warn("icon", "don't wrap `n-icon` inside `n-icon`");
    }
    onRender === null || onRender === void 0 ? void 0 : onRender();
    return h("i", mergeProps(this.$attrs, {
      role: "img",
      class: [`${mergedClsPrefix}-icon`, themeClass, {
        [`${mergedClsPrefix}-icon--depth`]: depth,
        [`${mergedClsPrefix}-icon--color-transition`]: depth !== void 0
      }],
      style: [this.cssVars, this.mergedStyle]
    }), component ? h(component) : this.$slots);
  }
});
function isSubmenuNode(rawNode, childrenField) {
  return rawNode.type === "submenu" || rawNode.type === void 0 && rawNode[childrenField] !== void 0;
}
function isGroupNode(rawNode) {
  return rawNode.type === "group";
}
function isDividerNode(rawNode) {
  return rawNode.type === "divider";
}
function isRenderNode(rawNode) {
  return rawNode.type === "render";
}
const NDropdownOption = defineComponent({
  name: "DropdownOption",
  props: {
    clsPrefix: {
      type: String,
      required: true
    },
    tmNode: {
      type: Object,
      required: true
    },
    parentKey: {
      type: [String, Number],
      default: null
    },
    placement: {
      type: String,
      default: "right-start"
    },
    props: Object,
    scrollable: Boolean
  },
  setup(props) {
    const NDropdown2 = inject(dropdownInjectionKey);
    const {
      hoverKeyRef,
      keyboardKeyRef,
      lastToggledSubmenuKeyRef,
      pendingKeyPathRef,
      activeKeyPathRef,
      animatedRef,
      mergedShowRef,
      renderLabelRef,
      renderIconRef,
      labelFieldRef,
      childrenFieldRef,
      renderOptionRef,
      nodePropsRef,
      menuPropsRef
    } = NDropdown2;
    const NDropdownOption2 = inject(dropdownOptionInjectionKey, null);
    const NDropdownMenu2 = inject(dropdownMenuInjectionKey);
    const NPopoverBody2 = inject(popoverBodyInjectionKey);
    const rawNodeRef = computed(() => props.tmNode.rawNode);
    const hasSubmenuRef = computed(() => {
      const {
        value: childrenField
      } = childrenFieldRef;
      return isSubmenuNode(props.tmNode.rawNode, childrenField);
    });
    const mergedDisabledRef = computed(() => {
      const {
        disabled
      } = props.tmNode;
      return disabled;
    });
    const showSubmenuRef = computed(() => {
      if (!hasSubmenuRef.value) return false;
      const {
        key,
        disabled
      } = props.tmNode;
      if (disabled) return false;
      const {
        value: hoverKey
      } = hoverKeyRef;
      const {
        value: keyboardKey
      } = keyboardKeyRef;
      const {
        value: lastToggledSubmenuKey
      } = lastToggledSubmenuKeyRef;
      const {
        value: pendingKeyPath
      } = pendingKeyPathRef;
      if (hoverKey !== null) return pendingKeyPath.includes(key);
      if (keyboardKey !== null) {
        return pendingKeyPath.includes(key) && pendingKeyPath[pendingKeyPath.length - 1] !== key;
      }
      if (lastToggledSubmenuKey !== null) return pendingKeyPath.includes(key);
      return false;
    });
    const shouldDelayRef = computed(() => {
      return keyboardKeyRef.value === null && !animatedRef.value;
    });
    const deferredShowSubmenuRef = useDeferredTrue(showSubmenuRef, 300, shouldDelayRef);
    const parentEnteringSubmenuRef = computed(() => {
      return !!(NDropdownOption2 === null || NDropdownOption2 === void 0 ? void 0 : NDropdownOption2.enteringSubmenuRef.value);
    });
    const enteringSubmenuRef = ref(false);
    provide(dropdownOptionInjectionKey, {
      enteringSubmenuRef
    });
    function handleSubmenuBeforeEnter() {
      enteringSubmenuRef.value = true;
    }
    function handleSubmenuAfterEnter() {
      enteringSubmenuRef.value = false;
    }
    function handleMouseEnter() {
      const {
        parentKey,
        tmNode
      } = props;
      if (tmNode.disabled) return;
      if (!mergedShowRef.value) return;
      lastToggledSubmenuKeyRef.value = parentKey;
      keyboardKeyRef.value = null;
      hoverKeyRef.value = tmNode.key;
    }
    function handleMouseMove() {
      const {
        tmNode
      } = props;
      if (tmNode.disabled) return;
      if (!mergedShowRef.value) return;
      if (hoverKeyRef.value === tmNode.key) return;
      handleMouseEnter();
    }
    function handleMouseLeave(e) {
      if (props.tmNode.disabled) return;
      if (!mergedShowRef.value) return;
      const {
        relatedTarget
      } = e;
      if (relatedTarget && !happensIn({
        target: relatedTarget
      }, "dropdownOption") && !happensIn({
        target: relatedTarget
      }, "scrollbarRail")) {
        hoverKeyRef.value = null;
      }
    }
    function handleClick() {
      const {
        value: hasSubmenu
      } = hasSubmenuRef;
      const {
        tmNode
      } = props;
      if (!mergedShowRef.value) return;
      if (!hasSubmenu && !tmNode.disabled) {
        NDropdown2.doSelect(tmNode.key, tmNode.rawNode);
        NDropdown2.doUpdateShow(false);
      }
    }
    return {
      labelField: labelFieldRef,
      renderLabel: renderLabelRef,
      renderIcon: renderIconRef,
      siblingHasIcon: NDropdownMenu2.showIconRef,
      siblingHasSubmenu: NDropdownMenu2.hasSubmenuRef,
      menuProps: menuPropsRef,
      popoverBody: NPopoverBody2,
      animated: animatedRef,
      mergedShowSubmenu: computed(() => {
        return deferredShowSubmenuRef.value && !parentEnteringSubmenuRef.value;
      }),
      rawNode: rawNodeRef,
      hasSubmenu: hasSubmenuRef,
      pending: useMemo(() => {
        const {
          value: pendingKeyPath
        } = pendingKeyPathRef;
        const {
          key
        } = props.tmNode;
        return pendingKeyPath.includes(key);
      }),
      childActive: useMemo(() => {
        const {
          value: activeKeyPath
        } = activeKeyPathRef;
        const {
          key
        } = props.tmNode;
        const index = activeKeyPath.findIndex((k) => key === k);
        if (index === -1) return false;
        return index < activeKeyPath.length - 1;
      }),
      active: useMemo(() => {
        const {
          value: activeKeyPath
        } = activeKeyPathRef;
        const {
          key
        } = props.tmNode;
        const index = activeKeyPath.findIndex((k) => key === k);
        if (index === -1) return false;
        return index === activeKeyPath.length - 1;
      }),
      mergedDisabled: mergedDisabledRef,
      renderOption: renderOptionRef,
      nodeProps: nodePropsRef,
      handleClick,
      handleMouseMove,
      handleMouseEnter,
      handleMouseLeave,
      handleSubmenuBeforeEnter,
      handleSubmenuAfterEnter
    };
  },
  render() {
    var _a, _b;
    const {
      animated,
      rawNode,
      mergedShowSubmenu,
      clsPrefix,
      siblingHasIcon,
      siblingHasSubmenu,
      renderLabel,
      renderIcon,
      renderOption,
      nodeProps,
      props,
      scrollable
    } = this;
    let submenuVNode = null;
    if (mergedShowSubmenu) {
      const submenuNodeProps = (_a = this.menuProps) === null || _a === void 0 ? void 0 : _a.call(this, rawNode, rawNode.children);
      submenuVNode = h(NDropdownMenu, Object.assign({}, submenuNodeProps, {
        clsPrefix,
        scrollable: this.scrollable,
        tmNodes: this.tmNode.children,
        parentKey: this.tmNode.key
      }));
    }
    const builtinProps = {
      class: [`${clsPrefix}-dropdown-option-body`, this.pending && `${clsPrefix}-dropdown-option-body--pending`, this.active && `${clsPrefix}-dropdown-option-body--active`, this.childActive && `${clsPrefix}-dropdown-option-body--child-active`, this.mergedDisabled && `${clsPrefix}-dropdown-option-body--disabled`],
      onMousemove: this.handleMouseMove,
      onMouseenter: this.handleMouseEnter,
      onMouseleave: this.handleMouseLeave,
      onClick: this.handleClick
    };
    const optionNodeProps = nodeProps === null || nodeProps === void 0 ? void 0 : nodeProps(rawNode);
    const node = h("div", Object.assign({
      class: [`${clsPrefix}-dropdown-option`, optionNodeProps === null || optionNodeProps === void 0 ? void 0 : optionNodeProps.class],
      "data-dropdown-option": true
    }, optionNodeProps), h("div", mergeProps(builtinProps, props), [h("div", {
      class: [`${clsPrefix}-dropdown-option-body__prefix`, siblingHasIcon && `${clsPrefix}-dropdown-option-body__prefix--show-icon`]
    }, [renderIcon ? renderIcon(rawNode) : render(rawNode.icon)]), h("div", {
      "data-dropdown-option": true,
      class: `${clsPrefix}-dropdown-option-body__label`
    }, renderLabel ? renderLabel(rawNode) : render((_b = rawNode[this.labelField]) !== null && _b !== void 0 ? _b : rawNode.title)), h("div", {
      "data-dropdown-option": true,
      class: [`${clsPrefix}-dropdown-option-body__suffix`, siblingHasSubmenu && `${clsPrefix}-dropdown-option-body__suffix--has-submenu`]
    }, this.hasSubmenu ? h(NIcon, null, {
      default: () => h(ChevronRightIcon, null)
    }) : null)]), this.hasSubmenu ? h(Binder, null, {
      default: () => [h(VTarget, null, {
        default: () => h("div", {
          class: `${clsPrefix}-dropdown-offset-container`
        }, h(VFollower, {
          show: this.mergedShowSubmenu,
          placement: this.placement,
          to: scrollable ? this.popoverBody || void 0 : void 0,
          teleportDisabled: !scrollable
        }, {
          default: () => {
            return h("div", {
              class: `${clsPrefix}-dropdown-menu-wrapper`
            }, animated ? h(Transition, {
              onBeforeEnter: this.handleSubmenuBeforeEnter,
              onAfterEnter: this.handleSubmenuAfterEnter,
              name: "fade-in-scale-up-transition",
              appear: true
            }, {
              default: () => submenuVNode
            }) : submenuVNode);
          }
        }))
      })]
    }) : null);
    if (renderOption) {
      return renderOption({
        node,
        option: rawNode
      });
    }
    return node;
  }
});
const NDropdownGroup = defineComponent({
  name: "NDropdownGroup",
  props: {
    clsPrefix: {
      type: String,
      required: true
    },
    tmNode: {
      type: Object,
      required: true
    },
    parentKey: {
      type: [String, Number],
      default: null
    }
  },
  render() {
    const {
      tmNode,
      parentKey,
      clsPrefix
    } = this;
    const {
      children
    } = tmNode;
    return h(Fragment, null, h(NDropdownGroupHeader, {
      clsPrefix,
      tmNode,
      key: tmNode.key
    }), children === null || children === void 0 ? void 0 : children.map((child) => {
      const {
        rawNode
      } = child;
      if (rawNode.show === false) return null;
      if (isDividerNode(rawNode)) {
        return h(NDropdownDivider, {
          clsPrefix,
          key: child.key
        });
      }
      if (child.isGroup) {
        warn("dropdown", "`group` node is not allowed to be put in `group` node.");
        return null;
      }
      return h(NDropdownOption, {
        clsPrefix,
        tmNode: child,
        parentKey,
        key: child.key
      });
    }));
  }
});
const NDropdownRenderOption = defineComponent({
  name: "DropdownRenderOption",
  props: {
    tmNode: {
      type: Object,
      required: true
    }
  },
  render() {
    const {
      rawNode: {
        render: render2,
        props
      }
    } = this.tmNode;
    return h("div", props, [render2 === null || render2 === void 0 ? void 0 : render2()]);
  }
});
const NDropdownMenu = defineComponent({
  name: "DropdownMenu",
  props: {
    scrollable: Boolean,
    showArrow: Boolean,
    arrowStyle: [String, Object],
    clsPrefix: {
      type: String,
      required: true
    },
    tmNodes: {
      type: Array,
      default: () => []
    },
    parentKey: {
      type: [String, Number],
      default: null
    }
  },
  setup(props) {
    const {
      renderIconRef,
      childrenFieldRef
    } = inject(dropdownInjectionKey);
    provide(dropdownMenuInjectionKey, {
      showIconRef: computed(() => {
        const renderIcon = renderIconRef.value;
        return props.tmNodes.some((tmNode) => {
          var _a;
          if (tmNode.isGroup) {
            return (_a = tmNode.children) === null || _a === void 0 ? void 0 : _a.some(({
              rawNode: rawChild
            }) => renderIcon ? renderIcon(rawChild) : rawChild.icon);
          }
          const {
            rawNode
          } = tmNode;
          return renderIcon ? renderIcon(rawNode) : rawNode.icon;
        });
      }),
      hasSubmenuRef: computed(() => {
        const {
          value: childrenField
        } = childrenFieldRef;
        return props.tmNodes.some((tmNode) => {
          var _a;
          if (tmNode.isGroup) {
            return (_a = tmNode.children) === null || _a === void 0 ? void 0 : _a.some(({
              rawNode: rawChild
            }) => isSubmenuNode(rawChild, childrenField));
          }
          const {
            rawNode
          } = tmNode;
          return isSubmenuNode(rawNode, childrenField);
        });
      })
    });
    const bodyRef = ref(null);
    provide(modalBodyInjectionKey, null);
    provide(drawerBodyInjectionKey, null);
    provide(popoverBodyInjectionKey, bodyRef);
    return {
      bodyRef
    };
  },
  render() {
    const {
      parentKey,
      clsPrefix,
      scrollable
    } = this;
    const menuOptionsNode = this.tmNodes.map((tmNode) => {
      const {
        rawNode
      } = tmNode;
      if (rawNode.show === false) return null;
      if (isRenderNode(rawNode)) {
        return h(NDropdownRenderOption, {
          tmNode,
          key: tmNode.key
        });
      }
      if (isDividerNode(rawNode)) {
        return h(NDropdownDivider, {
          clsPrefix,
          key: tmNode.key
        });
      }
      if (isGroupNode(rawNode)) {
        return h(NDropdownGroup, {
          clsPrefix,
          tmNode,
          parentKey,
          key: tmNode.key
        });
      }
      return h(NDropdownOption, {
        clsPrefix,
        tmNode,
        parentKey,
        key: tmNode.key,
        props: rawNode.props,
        scrollable
      });
    });
    return h("div", {
      class: [`${clsPrefix}-dropdown-menu`, scrollable && `${clsPrefix}-dropdown-menu--scrollable`],
      ref: "bodyRef"
    }, scrollable ? h(XScrollbar, {
      contentClass: `${clsPrefix}-dropdown-menu__content`
    }, {
      default: () => menuOptionsNode
    }) : menuOptionsNode, this.showArrow ? renderArrow({
      clsPrefix,
      arrowStyle: this.arrowStyle,
      arrowClass: void 0,
      arrowWrapperClass: void 0,
      arrowWrapperStyle: void 0
    }) : null);
  }
});
const style$1 = cB("dropdown-menu", `
 transform-origin: var(--v-transform-origin);
 background-color: var(--n-color);
 border-radius: var(--n-border-radius);
 box-shadow: var(--n-box-shadow);
 position: relative;
 transition:
 background-color .3s var(--n-bezier),
 box-shadow .3s var(--n-bezier);
`, [fadeInScaleUpTransition(), cB("dropdown-option", `
 position: relative;
 `, [c$1("a", `
 text-decoration: none;
 color: inherit;
 outline: none;
 `, [c$1("&::before", `
 content: "";
 position: absolute;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 `)]), cB("dropdown-option-body", `
 display: flex;
 cursor: pointer;
 position: relative;
 height: var(--n-option-height);
 line-height: var(--n-option-height);
 font-size: var(--n-font-size);
 color: var(--n-option-text-color);
 transition: color .3s var(--n-bezier);
 `, [c$1("&::before", `
 content: "";
 position: absolute;
 top: 0;
 bottom: 0;
 left: 4px;
 right: 4px;
 transition: background-color .3s var(--n-bezier);
 border-radius: var(--n-border-radius);
 `), cNotM("disabled", [cM("pending", `
 color: var(--n-option-text-color-hover);
 `, [cE("prefix, suffix", `
 color: var(--n-option-text-color-hover);
 `), c$1("&::before", "background-color: var(--n-option-color-hover);")]), cM("active", `
 color: var(--n-option-text-color-active);
 `, [cE("prefix, suffix", `
 color: var(--n-option-text-color-active);
 `), c$1("&::before", "background-color: var(--n-option-color-active);")]), cM("child-active", `
 color: var(--n-option-text-color-child-active);
 `, [cE("prefix, suffix", `
 color: var(--n-option-text-color-child-active);
 `)])]), cM("disabled", `
 cursor: not-allowed;
 opacity: var(--n-option-opacity-disabled);
 `), cM("group", `
 font-size: calc(var(--n-font-size) - 1px);
 color: var(--n-group-header-text-color);
 `, [cE("prefix", `
 width: calc(var(--n-option-prefix-width) / 2);
 `, [cM("show-icon", `
 width: calc(var(--n-option-icon-prefix-width) / 2);
 `)])]), cE("prefix", `
 width: var(--n-option-prefix-width);
 display: flex;
 justify-content: center;
 align-items: center;
 color: var(--n-prefix-color);
 transition: color .3s var(--n-bezier);
 z-index: 1;
 `, [cM("show-icon", `
 width: var(--n-option-icon-prefix-width);
 `), cB("icon", `
 font-size: var(--n-option-icon-size);
 `)]), cE("label", `
 white-space: nowrap;
 flex: 1;
 z-index: 1;
 `), cE("suffix", `
 box-sizing: border-box;
 flex-grow: 0;
 flex-shrink: 0;
 display: flex;
 justify-content: flex-end;
 align-items: center;
 min-width: var(--n-option-suffix-width);
 padding: 0 8px;
 transition: color .3s var(--n-bezier);
 color: var(--n-suffix-color);
 z-index: 1;
 `, [cM("has-submenu", `
 width: var(--n-option-icon-suffix-width);
 `), cB("icon", `
 font-size: var(--n-option-icon-size);
 `)]), cB("dropdown-menu", "pointer-events: all;")]), cB("dropdown-offset-container", `
 pointer-events: none;
 position: absolute;
 left: 0;
 right: 0;
 top: -4px;
 bottom: -4px;
 `)]), cB("dropdown-divider", `
 transition: background-color .3s var(--n-bezier);
 background-color: var(--n-divider-color);
 height: 1px;
 margin: 4px 0;
 `), cB("dropdown-menu-wrapper", `
 transform-origin: var(--v-transform-origin);
 width: fit-content;
 `), c$1(">", [cB("scrollbar", `
 height: inherit;
 max-height: inherit;
 `)]), cNotM("scrollable", `
 padding: var(--n-padding);
 `), cM("scrollable", [cE("content", `
 padding: var(--n-padding);
 `)])]);
const dropdownBaseProps = {
  animated: {
    type: Boolean,
    default: true
  },
  keyboard: {
    type: Boolean,
    default: true
  },
  size: {
    type: String,
    default: "medium"
  },
  inverted: Boolean,
  placement: {
    type: String,
    default: "bottom"
  },
  onSelect: [Function, Array],
  options: {
    type: Array,
    default: () => []
  },
  menuProps: Function,
  showArrow: Boolean,
  renderLabel: Function,
  renderIcon: Function,
  renderOption: Function,
  nodeProps: Function,
  labelField: {
    type: String,
    default: "label"
  },
  keyField: {
    type: String,
    default: "key"
  },
  childrenField: {
    type: String,
    default: "children"
  },
  // for menu, not documented
  value: [String, Number]
};
const popoverPropKeys = Object.keys(popoverBaseProps);
const dropdownProps = Object.assign(Object.assign(Object.assign({}, popoverBaseProps), dropdownBaseProps), useTheme.props);
const NDropdown = defineComponent({
  name: "Dropdown",
  inheritAttrs: false,
  props: dropdownProps,
  setup(props) {
    const uncontrolledShowRef = ref(false);
    const mergedShowRef = useMergedState(toRef(props, "show"), uncontrolledShowRef);
    const treemateRef = computed(() => {
      const {
        keyField,
        childrenField
      } = props;
      return createTreeMate(props.options, {
        getKey(node) {
          return node[keyField];
        },
        getDisabled(node) {
          return node.disabled === true;
        },
        getIgnored(node) {
          return node.type === "divider" || node.type === "render";
        },
        getChildren(node) {
          return node[childrenField];
        }
      });
    });
    const tmNodesRef = computed(() => {
      return treemateRef.value.treeNodes;
    });
    const hoverKeyRef = ref(null);
    const keyboardKeyRef = ref(null);
    const lastToggledSubmenuKeyRef = ref(null);
    const pendingKeyRef = computed(() => {
      var _a, _b, _c;
      return (_c = (_b = (_a = hoverKeyRef.value) !== null && _a !== void 0 ? _a : keyboardKeyRef.value) !== null && _b !== void 0 ? _b : lastToggledSubmenuKeyRef.value) !== null && _c !== void 0 ? _c : null;
    });
    const pendingKeyPathRef = computed(() => treemateRef.value.getPath(pendingKeyRef.value).keyPath);
    const activeKeyPathRef = computed(() => treemateRef.value.getPath(props.value).keyPath);
    const keyboardEnabledRef = useMemo(() => {
      return props.keyboard && mergedShowRef.value;
    });
    useKeyboard({
      keydown: {
        ArrowUp: {
          prevent: true,
          handler: handleKeydownUp
        },
        ArrowRight: {
          prevent: true,
          handler: handleKeydownRight
        },
        ArrowDown: {
          prevent: true,
          handler: handleKeydownDown
        },
        ArrowLeft: {
          prevent: true,
          handler: handleKeydownLeft
        },
        Enter: {
          prevent: true,
          handler: handleKeydownEnter
        },
        Escape: handleKeydownEsc
      }
    }, keyboardEnabledRef);
    const {
      mergedClsPrefixRef,
      inlineThemeDisabled
    } = useConfig(props);
    const themeRef = useTheme("Dropdown", "-dropdown", style$1, dropdownLight, props, mergedClsPrefixRef);
    provide(dropdownInjectionKey, {
      labelFieldRef: toRef(props, "labelField"),
      childrenFieldRef: toRef(props, "childrenField"),
      renderLabelRef: toRef(props, "renderLabel"),
      renderIconRef: toRef(props, "renderIcon"),
      hoverKeyRef,
      keyboardKeyRef,
      lastToggledSubmenuKeyRef,
      pendingKeyPathRef,
      activeKeyPathRef,
      animatedRef: toRef(props, "animated"),
      mergedShowRef,
      nodePropsRef: toRef(props, "nodeProps"),
      renderOptionRef: toRef(props, "renderOption"),
      menuPropsRef: toRef(props, "menuProps"),
      doSelect,
      doUpdateShow
    });
    watch(mergedShowRef, (value) => {
      if (!props.animated && !value) {
        clearPendingState();
      }
    });
    function doSelect(key, node) {
      const {
        onSelect
      } = props;
      if (onSelect) call(onSelect, key, node);
    }
    function doUpdateShow(value) {
      const {
        "onUpdate:show": _onUpdateShow,
        onUpdateShow
      } = props;
      if (_onUpdateShow) call(_onUpdateShow, value);
      if (onUpdateShow) call(onUpdateShow, value);
      uncontrolledShowRef.value = value;
    }
    function clearPendingState() {
      hoverKeyRef.value = null;
      keyboardKeyRef.value = null;
      lastToggledSubmenuKeyRef.value = null;
    }
    function handleKeydownEsc() {
      doUpdateShow(false);
    }
    function handleKeydownLeft() {
      handleKeydown("left");
    }
    function handleKeydownRight() {
      handleKeydown("right");
    }
    function handleKeydownUp() {
      handleKeydown("up");
    }
    function handleKeydownDown() {
      handleKeydown("down");
    }
    function handleKeydownEnter() {
      const pendingNode = getPendingNode();
      if ((pendingNode === null || pendingNode === void 0 ? void 0 : pendingNode.isLeaf) && mergedShowRef.value) {
        doSelect(pendingNode.key, pendingNode.rawNode);
        doUpdateShow(false);
      }
    }
    function getPendingNode() {
      var _a;
      const {
        value: treeMate
      } = treemateRef;
      const {
        value: pendingKey
      } = pendingKeyRef;
      if (!treeMate || pendingKey === null) return null;
      return (_a = treeMate.getNode(pendingKey)) !== null && _a !== void 0 ? _a : null;
    }
    function handleKeydown(direction) {
      const {
        value: pendingKey
      } = pendingKeyRef;
      const {
        value: {
          getFirstAvailableNode: getFirstAvailableNode2
        }
      } = treemateRef;
      let nextKeyboardKey = null;
      if (pendingKey === null) {
        const firstNode = getFirstAvailableNode2();
        if (firstNode !== null) {
          nextKeyboardKey = firstNode.key;
        }
      } else {
        const currentNode = getPendingNode();
        if (currentNode) {
          let nextNode;
          switch (direction) {
            case "down":
              nextNode = currentNode.getNext();
              break;
            case "up":
              nextNode = currentNode.getPrev();
              break;
            case "right":
              nextNode = currentNode.getChild();
              break;
            case "left":
              nextNode = currentNode.getParent();
              break;
          }
          if (nextNode) nextKeyboardKey = nextNode.key;
        }
      }
      if (nextKeyboardKey !== null) {
        hoverKeyRef.value = null;
        keyboardKeyRef.value = nextKeyboardKey;
      }
    }
    const cssVarsRef = computed(() => {
      const {
        size: size2,
        inverted
      } = props;
      const {
        common: {
          cubicBezierEaseInOut: cubicBezierEaseInOut2
        },
        self: self2
      } = themeRef.value;
      const {
        padding,
        dividerColor,
        borderRadius,
        optionOpacityDisabled,
        [createKey("optionIconSuffixWidth", size2)]: optionIconSuffixWidth,
        [createKey("optionSuffixWidth", size2)]: optionSuffixWidth,
        [createKey("optionIconPrefixWidth", size2)]: optionIconPrefixWidth,
        [createKey("optionPrefixWidth", size2)]: optionPrefixWidth,
        [createKey("fontSize", size2)]: fontSize2,
        [createKey("optionHeight", size2)]: optionHeight,
        [createKey("optionIconSize", size2)]: optionIconSize
      } = self2;
      const vars = {
        "--n-bezier": cubicBezierEaseInOut2,
        "--n-font-size": fontSize2,
        "--n-padding": padding,
        "--n-border-radius": borderRadius,
        "--n-option-height": optionHeight,
        "--n-option-prefix-width": optionPrefixWidth,
        "--n-option-icon-prefix-width": optionIconPrefixWidth,
        "--n-option-suffix-width": optionSuffixWidth,
        "--n-option-icon-suffix-width": optionIconSuffixWidth,
        "--n-option-icon-size": optionIconSize,
        "--n-divider-color": dividerColor,
        "--n-option-opacity-disabled": optionOpacityDisabled
      };
      if (inverted) {
        vars["--n-color"] = self2.colorInverted;
        vars["--n-option-color-hover"] = self2.optionColorHoverInverted;
        vars["--n-option-color-active"] = self2.optionColorActiveInverted;
        vars["--n-option-text-color"] = self2.optionTextColorInverted;
        vars["--n-option-text-color-hover"] = self2.optionTextColorHoverInverted;
        vars["--n-option-text-color-active"] = self2.optionTextColorActiveInverted;
        vars["--n-option-text-color-child-active"] = self2.optionTextColorChildActiveInverted;
        vars["--n-prefix-color"] = self2.prefixColorInverted;
        vars["--n-suffix-color"] = self2.suffixColorInverted;
        vars["--n-group-header-text-color"] = self2.groupHeaderTextColorInverted;
      } else {
        vars["--n-color"] = self2.color;
        vars["--n-option-color-hover"] = self2.optionColorHover;
        vars["--n-option-color-active"] = self2.optionColorActive;
        vars["--n-option-text-color"] = self2.optionTextColor;
        vars["--n-option-text-color-hover"] = self2.optionTextColorHover;
        vars["--n-option-text-color-active"] = self2.optionTextColorActive;
        vars["--n-option-text-color-child-active"] = self2.optionTextColorChildActive;
        vars["--n-prefix-color"] = self2.prefixColor;
        vars["--n-suffix-color"] = self2.suffixColor;
        vars["--n-group-header-text-color"] = self2.groupHeaderTextColor;
      }
      return vars;
    });
    const themeClassHandle = inlineThemeDisabled ? useThemeClass("dropdown", computed(() => `${props.size[0]}${props.inverted ? "i" : ""}`), cssVarsRef, props) : void 0;
    return {
      mergedClsPrefix: mergedClsPrefixRef,
      mergedTheme: themeRef,
      // data
      tmNodes: tmNodesRef,
      // show
      mergedShow: mergedShowRef,
      // methods
      handleAfterLeave: () => {
        if (!props.animated) return;
        clearPendingState();
      },
      doUpdateShow,
      cssVars: inlineThemeDisabled ? void 0 : cssVarsRef,
      themeClass: themeClassHandle === null || themeClassHandle === void 0 ? void 0 : themeClassHandle.themeClass,
      onRender: themeClassHandle === null || themeClassHandle === void 0 ? void 0 : themeClassHandle.onRender
    };
  },
  render() {
    const renderPopoverBody = (className, ref2, style2, onMouseenter, onMouseleave) => {
      var _a;
      const {
        mergedClsPrefix,
        menuProps
      } = this;
      (_a = this.onRender) === null || _a === void 0 ? void 0 : _a.call(this);
      const menuNodeProps = (menuProps === null || menuProps === void 0 ? void 0 : menuProps(void 0, this.tmNodes.map((v) => v.rawNode))) || {};
      const dropdownProps2 = {
        ref: createRefSetter(ref2),
        class: [className, `${mergedClsPrefix}-dropdown`, this.themeClass],
        clsPrefix: mergedClsPrefix,
        tmNodes: this.tmNodes,
        style: [...style2, this.cssVars],
        showArrow: this.showArrow,
        arrowStyle: this.arrowStyle,
        scrollable: this.scrollable,
        onMouseenter,
        onMouseleave
      };
      return h(NDropdownMenu, mergeProps(this.$attrs, dropdownProps2, menuNodeProps));
    };
    const {
      mergedTheme
    } = this;
    const popoverProps2 = {
      show: this.mergedShow,
      theme: mergedTheme.peers.Popover,
      themeOverrides: mergedTheme.peerOverrides.Popover,
      internalOnAfterLeave: this.handleAfterLeave,
      internalRenderBody: renderPopoverBody,
      onUpdateShow: this.doUpdateShow,
      "onUpdate:show": void 0
    };
    return h(NPopover, Object.assign({}, keep(this.$props, popoverPropKeys), popoverProps2), {
      trigger: () => {
        var _a, _b;
        return (_b = (_a = this.$slots).default) === null || _b === void 0 ? void 0 : _b.call(_a);
      }
    });
  }
});
function self$1(vars) {
  const {
    heightSmall,
    heightMedium,
    heightLarge,
    borderRadius
  } = vars;
  return {
    color: "#eee",
    colorEnd: "#ddd",
    borderRadius,
    heightSmall,
    heightMedium,
    heightLarge
  };
}
const skeletonLight = {
  common: derived,
  self: self$1
};
const style = c$1([cB("skeleton", `
 height: 1em;
 width: 100%;
 transition:
 --n-color-start .3s var(--n-bezier),
 --n-color-end .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 animation: 2s skeleton-loading infinite cubic-bezier(0.36, 0, 0.64, 1);
 background-color: var(--n-color-start);
 `), c$1("@keyframes skeleton-loading", `
 0% {
 background: var(--n-color-start);
 }
 40% {
 background: var(--n-color-end);
 }
 80% {
 background: var(--n-color-start);
 }
 100% {
 background: var(--n-color-start);
 }
 `)]);
const skeletonProps = Object.assign(Object.assign({}, useTheme.props), {
  text: Boolean,
  round: Boolean,
  circle: Boolean,
  height: [String, Number],
  width: [String, Number],
  size: String,
  repeat: {
    type: Number,
    default: 1
  },
  animated: {
    type: Boolean,
    default: true
  },
  sharp: {
    type: Boolean,
    default: true
  }
});
const NSkeleton = defineComponent({
  name: "Skeleton",
  inheritAttrs: false,
  props: skeletonProps,
  setup(props) {
    useHoudini();
    const {
      mergedClsPrefixRef
    } = useConfig(props);
    const themeRef = useTheme("Skeleton", "-skeleton", style, skeletonLight, props, mergedClsPrefixRef);
    return {
      mergedClsPrefix: mergedClsPrefixRef,
      style: computed(() => {
        var _a, _b;
        const theme = themeRef.value;
        const {
          common: {
            cubicBezierEaseInOut: cubicBezierEaseInOut2
          }
        } = theme;
        const selfThemeVars = theme.self;
        const {
          color,
          colorEnd,
          borderRadius
        } = selfThemeVars;
        let sizeHeight;
        const {
          circle,
          sharp,
          round,
          width,
          height,
          size: size2,
          text,
          animated
        } = props;
        if (size2 !== void 0) {
          sizeHeight = selfThemeVars[createKey("height", size2)];
        }
        const mergedWidth = circle ? (_a = width !== null && width !== void 0 ? width : height) !== null && _a !== void 0 ? _a : sizeHeight : width;
        const mergedHeight = (_b = circle ? width !== null && width !== void 0 ? width : height : height) !== null && _b !== void 0 ? _b : sizeHeight;
        return {
          display: text ? "inline-block" : "",
          verticalAlign: text ? "-0.125em" : "",
          borderRadius: circle ? "50%" : round ? "4096px" : sharp ? "" : borderRadius,
          width: typeof mergedWidth === "number" ? pxfy(mergedWidth) : mergedWidth,
          height: typeof mergedHeight === "number" ? pxfy(mergedHeight) : mergedHeight,
          animation: !animated ? "none" : "",
          "--n-bezier": cubicBezierEaseInOut2,
          "--n-color-start": color,
          "--n-color-end": colorEnd
        };
      })
    };
  },
  render() {
    const {
      repeat: repeatProp,
      style: style2,
      mergedClsPrefix,
      $attrs
    } = this;
    const child = h("div", mergeProps({
      class: `${mergedClsPrefix}-skeleton`,
      style: style2
    }, $attrs));
    if (repeatProp > 1) {
      return h(Fragment, null, repeat(repeatProp, null).map((_) => [child, "\n"]));
    }
    return child;
  }
});
const _hoisted_1 = ["onKeydown", "tabindex"];
const _hoisted_2 = { key: 0 };
const _hoisted_3 = { key: 0 };
const _hoisted_4 = { key: 0 };
const _sfc_main$1 = {
  __name: "ButtonGroup",
  props: {
    toolbarItems: {
      type: Array,
      required: true
    },
    overflowItems: {
      type: Array,
      default: () => []
    },
    position: {
      type: String,
      default: "left"
    },
    fromOverflow: {
      type: Boolean,
      default: false
    }
  },
  emits: ["command"],
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    const toolbarItemRefs = ref([]);
    const props = __props;
    const currentItem = ref(null);
    const { isHighContrastMode } = useHighContrastMode();
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const styleMap = {
      left: {
        minWidth: "120px",
        justifyContent: "flex-start"
      },
      right: {
        minWidth: "120px",
        justifyContent: "flex-end"
      },
      default: {
        // Only grow if not on a mobile device
        flexGrow: isMobile ? 0 : 1,
        justifyContent: "center"
      }
    };
    const getPositionStyle = computed(() => {
      return styleMap[props.position] || styleMap.default;
    });
    const isButton = (item) => item.type === "button";
    const isDropdown = (item) => item.type === "dropdown";
    const isSeparator = (item) => item.type === "separator";
    const isOverflow = (item) => item.type === "overflow";
    const handleToolbarButtonClick = (item, argument = null) => {
      emit("item-clicked");
      currentItem.value = item;
      currentItem.value.expand = !currentItem.value.expand;
      if (item.disabled.value) return;
      emit("command", { item, argument });
    };
    const handleToolbarButtonTextSubmit = (item, argument) => {
      if (item.disabled.value) return;
      currentItem.value = null;
      emit("command", { item, argument });
    };
    const closeDropdowns = () => {
      if (!currentItem.value) return;
      currentItem.value.expand = false;
      currentItem.value = null;
    };
    const selectedOption = ref(null);
    const handleSelect = (item, option) => {
      closeDropdowns();
      const value = item.dropdownValueKey.value ? option[item.dropdownValueKey.value] : option.label;
      emit("command", { item, argument: value, option });
      selectedOption.value = option.key;
    };
    const dropdownOptions = (item) => {
      if (!item.nestedOptions?.value?.length) return [];
      return item.nestedOptions.value.map((option) => {
        return {
          ...option,
          props: {
            ...option.props,
            class: selectedOption.value === option.key ? "selected" : ""
          }
        };
      });
    };
    const getDropdownAttributes = (option, item) => {
      return {
        role: "menuitem",
        ariaLabel: `${item.attributes.value.ariaLabel} - ${option.label}`
      };
    };
    const handleClickOutside = (e) => {
      closeDropdowns();
    };
    const moveToNextButton = (e) => {
      const currentButton = e.target;
      const nextButton = e.target.closest(".toolbar-item-ctn").nextElementSibling;
      if (nextButton) {
        currentButton.setAttribute("tabindex", "-1");
        nextButton.setAttribute("tabindex", "0");
        nextButton.focus();
      }
    };
    const moveToPreviousButton = (e) => {
      const currentButton = e.target;
      const previousButton = e.target.closest(".toolbar-item-ctn").previousElementSibling;
      if (previousButton) {
        currentButton.setAttribute("tabindex", "-1");
        previousButton.setAttribute("tabindex", "0");
        previousButton.focus();
      }
    };
    const moveToNextButtonGroup = (e) => {
      const nextButtonGroup = e.target.closest(".button-group").nextElementSibling;
      if (nextButtonGroup) {
        nextButtonGroup.setAttribute("tabindex", "0");
        nextButtonGroup.focus();
      } else {
        const editor = document.querySelector(".ProseMirror");
        if (editor) {
          editor.focus();
        }
      }
    };
    const moveToPreviousButtonGroup = (e) => {
      const previousButtonGroup = e.target.closest(".button-group").previousElementSibling;
      if (previousButtonGroup) {
        previousButtonGroup.setAttribute("tabindex", "0");
        previousButtonGroup.focus();
      }
    };
    const handleKeyDown = (e, item) => {
      const isTypingField = e.target.nodeName === "INPUT" || e.target.nodeName === "TEXTAREA";
      const isTypingToolbarItem = item.name.value === "fontSize";
      if (isTypingField && isTypingToolbarItem) {
        return;
      }
      e.preventDefault();
      switch (e.key) {
        case "Enter":
          console.log("Enter");
          handleToolbarButtonClick(item, null);
          break;
        case "Escape":
          closeDropdowns();
          break;
        case "ArrowRight":
          closeDropdowns();
          moveToNextButton(e);
          break;
        case "ArrowLeft":
          closeDropdowns();
          moveToPreviousButton(e);
          break;
        case "Tab":
          if (e.shiftKey) {
            moveToPreviousButtonGroup(e);
          } else {
            moveToNextButtonGroup(e);
          }
          break;
      }
    };
    const handleFocus = (e) => {
      const firstButton = toolbarItemRefs.value.find((item) => !item.classList.contains("disabled"));
      if (firstButton) {
        firstButton.setAttribute("tabindex", "0");
        firstButton.focus();
      }
    };
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        style: normalizeStyle(getPositionStyle.value),
        class: "button-group",
        role: "group",
        onFocus: handleFocus
      }, [
        (openBlock(true), createElementBlock(Fragment, null, renderList(__props.toolbarItems, (item, index) => {
          return openBlock(), createElementBlock("div", {
            key: item.id.value,
            class: normalizeClass([{
              narrow: item.isNarrow.value,
              wide: item.isWide.value,
              disabled: item.disabled.value
            }, "toolbar-item-ctn"]),
            onKeydown: (e) => handleKeyDown(e, item),
            ref_for: true,
            ref_key: "toolbarItemRefs",
            ref: toolbarItemRefs,
            tabindex: index === 0 ? 0 : -1
          }, [
            isSeparator(item) ? (openBlock(), createBlock(ToolbarSeparator, {
              key: 0,
              style: { "width": "20px" }
            })) : createCommentVNode("", true),
            isDropdown(item) && item.nestedOptions?.value?.length ? (openBlock(), createBlock(unref(NDropdown), {
              key: 1,
              options: dropdownOptions(item),
              trigger: item.disabled.value ? null : "click",
              show: item.expand.value,
              size: "medium",
              placement: "bottom-start",
              class: normalizeClass(["toolbar-button toolbar-dropdown sd-editor-toolbar-dropdown", { "high-contrast": unref(isHighContrastMode) }]),
              onSelect: (key, option) => handleSelect(item, option),
              onClickoutside: handleClickOutside,
              style: normalizeStyle(item.dropdownStyles.value),
              "menu-props": () => ({
                role: "menu"
              }),
              "node-props": (option) => getDropdownAttributes(option, item)
            }, {
              default: withCtx(() => [
                createVNode(unref(NTooltip), {
                  trigger: "hover",
                  disabled: !item.tooltip?.value
                }, {
                  trigger: withCtx(() => [
                    createVNode(ToolbarButton, {
                      "toolbar-item": item,
                      disabled: item.disabled.value,
                      onTextSubmit: ($event) => handleToolbarButtonTextSubmit(item, $event),
                      onButtonClick: ($event) => handleToolbarButtonClick(item)
                    }, null, 8, ["toolbar-item", "disabled", "onTextSubmit", "onButtonClick"])
                  ]),
                  default: withCtx(() => [
                    createElementVNode("div", null, [
                      createTextVNode(toDisplayString(item.tooltip) + " ", 1),
                      item.disabled.value ? (openBlock(), createElementBlock("span", _hoisted_2, "(disabled)")) : createCommentVNode("", true)
                    ])
                  ]),
                  _: 2
                }, 1032, ["disabled"])
              ]),
              _: 2
            }, 1032, ["options", "trigger", "show", "class", "onSelect", "style", "node-props"])) : isButton(item) ? (openBlock(), createBlock(unref(NTooltip), {
              key: 2,
              trigger: "hover",
              class: "sd-editor-toolbar-tooltip"
            }, {
              trigger: withCtx(() => [
                createVNode(ToolbarButton, {
                  "toolbar-item": item,
                  "is-overflow-item": __props.fromOverflow,
                  onTextSubmit: ($event) => handleToolbarButtonTextSubmit(item, $event),
                  onButtonClick: ($event) => handleToolbarButtonClick(item)
                }, null, 8, ["toolbar-item", "is-overflow-item", "onTextSubmit", "onButtonClick"])
              ]),
              default: withCtx(() => [
                item.tooltip ? (openBlock(), createElementBlock("div", _hoisted_3, [
                  createTextVNode(toDisplayString(item.tooltip) + " ", 1),
                  item.disabled.value ? (openBlock(), createElementBlock("span", _hoisted_4, "(disabled)")) : createCommentVNode("", true)
                ])) : createCommentVNode("", true)
              ]),
              _: 2
            }, 1024)) : createCommentVNode("", true),
            isOverflow(item) && __props.overflowItems.length ? (openBlock(), createBlock(OverflowMenu, {
              key: 3,
              "toolbar-item": item,
              onButtonClick: ($event) => handleToolbarButtonClick(item),
              "overflow-items": __props.overflowItems
            }, null, 8, ["toolbar-item", "onButtonClick", "overflow-items"])) : createCommentVNode("", true)
          ], 42, _hoisted_1);
        }), 128))
      ], 36);
    };
  }
};
const ButtonGroup = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-4ccab1c9"]]);
const _sfc_main = {
  __name: "Toolbar",
  emits: ["command", "toggle", "select"],
  setup(__props, { emit: __emit }) {
    const { proxy } = getCurrentInstance();
    let toolbarKey = ref(1);
    const showLeftSide = proxy.$toolbar.config?.toolbarGroups?.includes("left");
    const showRightSide = proxy.$toolbar.config?.toolbarGroups?.includes("right");
    const excludeButtonsList = proxy.$toolbar.config?.toolbarButtonsExclude || [];
    const getFilteredItems = (position) => {
      return proxy.$toolbar.getToolbarItemByGroup(position).filter((item) => !excludeButtonsList.includes(item.name.value));
    };
    onMounted(() => {
      window.addEventListener("resize", onResizeThrottled);
      window.addEventListener("keydown", onKeyDown);
    });
    onDeactivated(() => {
      window.removeEventListener("resize", onResizeThrottled);
      window.removeEventListener("keydown", onKeyDown);
    });
    const onKeyDown = async (e) => {
      if (e.metaKey && e.key === "f") {
        const searchItem = proxy.$toolbar.getToolbarItemByName("search");
        if (searchItem) {
          e.preventDefault();
          searchItem.expand.value = true;
          await nextTick();
          if (searchItem.inputRef.value) {
            searchItem.inputRef.value.focus();
          }
        }
      }
    };
    const onWindowResized = async () => {
      await proxy.$toolbar.onToolbarResize();
      toolbarKey.value += 1;
    };
    const onResizeThrottled = throttle(onWindowResized, 300);
    const handleCommand = ({ item, argument, option }) => {
      proxy.$toolbar.emitCommand({ item, argument, option });
    };
    const restoreSelection = () => {
      proxy.$toolbar.activeEditor?.commands?.restoreSelection();
    };
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: "superdoc-toolbar",
        key: unref(toolbarKey),
        role: "toolbar",
        "aria-label": "Toolbar"
      }, [
        unref(showLeftSide) ? (openBlock(), createBlock(ButtonGroup, {
          key: 0,
          tabindex: "0",
          "toolbar-items": getFilteredItems("left"),
          position: "left",
          onCommand: handleCommand,
          onItemClicked: restoreSelection,
          class: "superdoc-toolbar-group-side"
        }, null, 8, ["toolbar-items"])) : createCommentVNode("", true),
        createVNode(ButtonGroup, {
          tabindex: "0",
          "toolbar-items": getFilteredItems("center"),
          "overflow-items": unref(proxy).$toolbar.overflowItems,
          position: "center",
          onCommand: handleCommand,
          onItemClicked: restoreSelection
        }, null, 8, ["toolbar-items", "overflow-items"]),
        unref(showRightSide) ? (openBlock(), createBlock(ButtonGroup, {
          key: 1,
          tabindex: "0",
          "toolbar-items": getFilteredItems("right"),
          position: "right",
          onCommand: handleCommand,
          onItemClicked: restoreSelection,
          class: "superdoc-toolbar-group-side"
        }, null, 8, ["toolbar-items"])) : createCommentVNode("", true)
      ]);
    };
  }
};
const Toolbar = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-639f50b4"]]);
export {
  NSkeleton as N,
  Toolbar as T,
  trashIconSvg as a,
  tableIconSvg as b,
  scissorsIconSvg as c,
  copyIconSvg as d,
  pasteIconSvg as e,
  borderNoneIconSvg as f,
  arrowsToDotIconSvg as g,
  arrowsLeftRightIconSvg as h,
  linkIconSvg as l,
  magicWandIcon as m,
  plusIconSvg as p,
  sanitizeNumber as s,
  toolbarIcons as t,
  wrenchIconSvg as w
};
