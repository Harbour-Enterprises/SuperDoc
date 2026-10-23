/** @module utils */

import * as React from 'react';

type ReactWithUseId = typeof React & {
  useId?: () => string;
};

/**
 * Polyfill for React.useId() for React versions < 18.
 * Uses useRef to generate a stable random ID once per component instance.
 */
function useIdPolyfill(): string {
  const ref = React.useRef<string | null>(null);
  if (ref.current === null) {
    ref.current = `-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
  return ref.current;
}

/**
 * Hook that returns a stable unique ID for the component instance.
 * Uses React.useId() when available (React 18+), falls back to
 * useRef-based polyfill for React 16.8+/17.
 *
 * The returned value is used as: `superdoc${useStableId()}`
 * - React 18+: useId() returns ":r0:" → "superdoc:r0:"
 * - Polyfill: returns "-1707345123456-abc1d2e" → "superdoc-1707345123456-abc1d2e"
 */
const reactUseId = (React as ReactWithUseId).useId;
export const useStableId: () => string = typeof reactUseId === 'function' ? reactUseId : useIdPolyfill;

/**
 * Returns a reference-stable version of `value` — identity only changes
 * when the serialized content changes.
 *
 * Use for plain-data object/array props that feed into `useEffect` /
 * `useMemo` dependency arrays when the consumer is likely to pass inline
 * literals. Without this, every parent re-render produces a fresh
 * reference and causes the effect to re-run even when the content is
 * identical.
 *
 * Not suitable for values containing functions, class instances (Yjs
 * Doc, Maps, Sets, Dates), or circular references — JSON.stringify
 * drops or collapses those. The compare only runs when the incoming
 * reference differs, so the steady-state cost is a single pointer check.
 */
export function useMemoByValue<T>(value: T): T {
  const lastRawRef = React.useRef<T>(value);
  const stableRef = React.useRef<T>(value);

  if (lastRawRef.current !== value) {
    if (!shallowJsonEqual(stableRef.current, value)) {
      stableRef.current = value;
    }
    lastRawRef.current = value;
  }

  return stableRef.current;
}

export function useMemoByContent<T>(value: T): T {
  const [stable, setStable] = React.useState(value);
  const next = stable === value || contentEqual(stable, value) ? stable : value;
  if (next !== stable) setStable(next);
  return next;
}

function contentEqual(a: unknown, b: unknown, ancestors: readonly unknown[] = []): boolean {
  if (a === b) return true;
  if (!isPlainData(a) || !isPlainData(b)) return false;
  const isCycle = ancestors.includes(a) || ancestors.includes(b);
  if (isCycle) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  const path = [...ancestors, a, b];
  return keys.every((key) => Object.prototype.hasOwnProperty.call(b, key) && contentEqual(a[key], b[key], path));
}

function isPlainData(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return Array.isArray(value) || prototype === Object.prototype || prototype === null;
}

function shallowJsonEqual<T>(a: T, b: T): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}
