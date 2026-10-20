/**
 * Deterministically serializes authored measurement inputs while excluding
 * positional/provenance fields that measuring/dom does not read for geometry.
 *
 * Absolute PM/source positions shift after edits earlier in a document. They
 * must not invalidate a geometry cache. A tab run's `width` is also excluded:
 * paragraph measurement stamps it as an output and reconstructs it from the
 * authored tab stops on a cache miss. Inline-box ids remain included because
 * they are copied into measured output and used as painter identity.
 */
const serializeMeasurementInputValue = (
  value: unknown,
  options: { omitObjectIds?: boolean },
  preserveObjectIds: boolean,
): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'undefined';
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => serializeMeasurementInputValue(item, options, preserveObjectIds)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const entries = Object.entries(record)
    .filter(([key]) => key !== 'pmStart' && key !== 'pmEnd' && key !== 'sourceAnchor')
    .filter(([key]) => !(options.omitObjectIds === true && key === 'id' && !preserveObjectIds))
    .filter(([key]) => !(record.kind === 'tab' && key === 'width'))
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries
    .map(
      ([key, entry]) =>
        `${JSON.stringify(key)}:${serializeMeasurementInputValue(
          entry,
          options,
          preserveObjectIds || key === 'inlineBoxes',
        )}`,
    )
    .join(',')}}`;
};

export function serializeMeasurementInput(value: unknown, options: { omitObjectIds?: boolean } = {}): string {
  return serializeMeasurementInputValue(value, options, false);
}

// Authored measurement inputs are deep-frozen plain data in the exact owner's
// projection planes, and unchanged cells keep one object across edits. Their
// serialized keys therefore only need to be computed once per object.

const certifiedImmutableInputs = new WeakSet<object>();
const memoizedKeys = new WeakMap<object, Map<string, string>>();
const memoStats = { hits: 0, misses: 0, uncertified: 0 };

function isPlainData(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  return Array.isArray(value) ? prototype === Array.prototype : prototype === Object.prototype || prototype === null;
}

/**
 * True when everything `serializeMeasurementInput` would read from `value`
 * (string-keyed enumerable own properties, recursively) is frozen plain data.
 * Certification is cached per object; a certified object can never serialize
 * differently later.
 */
export function isImmutableMeasurementInput(value: unknown, visiting = new Set<object>()): boolean {
  if (typeof value === 'function') return false;
  if (value === null || typeof value !== 'object') return true;
  if (certifiedImmutableInputs.has(value)) return true;
  if (!Object.isFrozen(value) || !isPlainData(value) || visiting.has(value)) return false;
  if (
    Array.isArray(value) &&
    (Object.prototype.hasOwnProperty.call(value, 'map') || Object.prototype.hasOwnProperty.call(value, 'constructor'))
  )
    return false;
  visiting.add(value);
  // Freezing an accessor does not freeze its result. Inspect descriptors without
  // invoking user code, including non-enumerable array indices read by map().
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const descriptor of Object.values(descriptors)) {
    if (!('value' in descriptor) || !isImmutableMeasurementInput(descriptor.value, visiting)) {
      visiting.delete(value);
      return false;
    }
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      if (!Object.prototype.hasOwnProperty.call(descriptors, index)) {
        visiting.delete(value);
        return false;
      }
    }
  }
  visiting.delete(value);
  certifiedImmutableInputs.add(value);
  return true;
}

/**
 * Memoize a serialized key derived only from `owner`'s authored content and
 * `variant` (the non-content inputs folded into the key). Mutable owners are
 * serialized on every call.
 */
export function memoizedMeasurementInputKey(owner: object, variant: string, build: () => string): string {
  if (!isImmutableMeasurementInput(owner)) {
    memoStats.uncertified += 1;
    return build();
  }
  let variants = memoizedKeys.get(owner);
  if (!variants) {
    variants = new Map();
    memoizedKeys.set(owner, variants);
  }
  const cached = variants.get(variant);
  if (cached !== undefined) {
    memoStats.hits += 1;
    return cached;
  }
  memoStats.misses += 1;
  const key = build();
  variants.set(variant, key);
  return key;
}

export function readMeasurementInputKeyMemoStats(): { hits: number; misses: number; uncertified: number } {
  return { ...memoStats };
}

export function resetMeasurementInputKeyMemoStats(): void {
  memoStats.hits = 0;
  memoStats.misses = 0;
  memoStats.uncertified = 0;
}
