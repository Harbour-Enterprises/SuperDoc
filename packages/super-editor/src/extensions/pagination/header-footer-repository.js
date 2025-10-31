/**
 * @typedef {'header' | 'footer'} HeaderFooterType
 */

/**
 * @typedef {'default' | 'first' | 'even' | 'odd' | 'last' | 'titlePg'} HeaderFooterVariant
 */

/**
 * @typedef {Object} HeaderFooterRecord
 * @property {string} id
 * @property {HeaderFooterType} type
 * @property {Record<string, any>} contentJson
 * @property {Record<string, any>} content
 * @property {Record<string, any>} meta
 * @property {number|null} heightPx
 * @property {boolean} dirty
 */

/**
 * @callback MeasureFn
 * @param {HeaderFooterRecord} record
 * @returns {number|Promise<number>}
 */

/**
 * @typedef {Object} HeaderFooterRepository
 * @property {(type?: HeaderFooterType) => HeaderFooterRecord[]} list
 * @property {(id: string) => HeaderFooterRecord|null} get
 * @property {(type: HeaderFooterType, variant: HeaderFooterVariant) => HeaderFooterRecord|null} getByVariant
 * @property {(id: string, changes?: { contentJson?: Record<string, any>, meta?: Record<string, any> }) => HeaderFooterRecord|null} update
 * @property {(id: string, heightPx: number) => HeaderFooterRecord|null} setHeight
 * @property {(id: string) => number|null} getHeight
 * @property {(id: string) => HeaderFooterRecord|null} markDirty
 * @property {(id: string) => boolean} isDirty
 * @property {(id: string, measureFn: MeasureFn) => Promise<number|null>} ensureMeasured
 * @property {(type: HeaderFooterType, variant: HeaderFooterVariant, id: string) => HeaderFooterRecord} assignVariant
 * @property {() => { headers: HeaderFooterRecord[], footers: HeaderFooterRecord[] }} toJSON
 * @property {(key: string) => any} getRuntime
 * @property {(key: string, value: any) => void} setRuntime
 * @property {() => void} clearRuntime
 * @property {(id: string, type?: HeaderFooterType) => boolean} has
 */

const HEADER_VARIANT_KEYS = ['default', 'first', 'even', 'odd', 'titlePg'];
const FOOTER_VARIANT_KEYS = ['default', 'first', 'even', 'odd', 'last'];

const LEGACY_VARIANT_ALIASES = {
  header: {
    default: ['default', 'body', 'normal'],
    first: ['first', 'firstpage', 'titlePg'],
    even: ['even', 'evenpage'],
    odd: ['odd', 'oddpage'],
  },
  footer: {
    default: ['default', 'body', 'normal'],
    first: ['first', 'firstpage', 'titlePg'],
    even: ['even', 'evenpage'],
    odd: ['odd', 'oddpage'],
    last: ['last'],
  },
};

const TYPE_KEYS = {
  header: HEADER_VARIANT_KEYS,
  footer: FOOTER_VARIANT_KEYS,
};

const TYPE_TO_COLLECTION = {
  header: 'headers',
  footer: 'footers',
};

const TYPE_TO_IDS = {
  header: 'headerIds',
  footer: 'footerIds',
};

/**
 * Coerces the supplied value into a plain object to simplify downstream lookups.
 * @param {unknown} value
 * @returns {Record<string, any>}
 */
const ensurePlainObject = (value) => {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
};

/**
 * Normalizes legacy property names into canonical variant keys.
 * @param {string|null|undefined} property
 * @returns {'default'|'first'|'even'|'odd'|'last'|null}
 */
const resolveVariantKeyFromProperty = (property) => {
  if (!property || typeof property !== 'string') return null;
  const normalized = property.toLowerCase();

  // Priority order matters: check specific patterns before generic ones
  const variantPatterns = [
    { test: (s) => s.includes('even'), variant: 'even' },
    { test: (s) => s.includes('odd'), variant: 'odd' },
    { test: (s) => s.includes('first') || s.includes('title'), variant: 'first' },
    { test: (s) => s.includes('last'), variant: 'last' },
    { test: (s) => s.includes('default') || s.includes('body') || s.includes('normal'), variant: 'default' },
    { test: (s) => s === 'header' || s === 'footer', variant: 'default' },
    { test: (s) => (s.includes('header') || s.includes('footer')) && s.includes('rid'), variant: 'default' },
  ];

  for (const { test, variant } of variantPatterns) {
    if (test(normalized)) return variant;
  }

  return null;
};

/**
 * Creates a repository for managing header and footer records backed by a converter instance.
 * @param {{ converter: Record<string, any>, logger?: Console }} [options={}]
 * @returns {HeaderFooterRepository}
 */
export const createHeaderFooterRepository = ({ converter, logger = console } = {}) => {
  if (!converter) {
    throw new Error('createHeaderFooterRepository requires a converter instance');
  }

  const records = new Map();
  const variantLookup = {
    header: new Map(),
    footer: new Map(),
  };
  const runtimeCache = new Map();

  /**
   * Registers a resolved variant mapping with the repository data structures.
   * @param {HeaderFooterType} type
   * @param {HeaderFooterVariant} variantKey
   * @param {string} idForVariant
   */
  const assignVariantToRecord = (type, variantKey, idForVariant) => {
    if (!idForVariant || !records.has(idForVariant)) return;

    variantLookup[type].set(variantKey, idForVariant);
    const entry = records.get(idForVariant);
    entry.meta.variants = Array.isArray(entry.meta.variants)
      ? Array.from(new Set([...entry.meta.variants, variantKey]))
      : [variantKey];
  };

  /**
   * Seeds record data from converter for a specific type.
   * @param {HeaderFooterType} type
   * @param {Record<string, any>} idsContainer
   * @param {Record<string, any>} contentCollection
   */
  const seedRecordsFromConverter = (type, idsContainer, contentCollection) => {
    const ids = Array.isArray(idsContainer.ids) ? idsContainer.ids : [];

    ids.forEach((id) => {
      const contentJson = contentCollection[id];
      if (!contentJson) return;

      records.set(id, {
        id,
        type,
        contentJson,
        content: contentJson,
        meta: {},
        heightPx: null,
        dirty: false,
      });
    });
  };

  /**
   * Seeds canonical variant mappings using known aliases.
   * @param {HeaderFooterType} type
   * @param {Record<string, any>} idsContainer
   */
  const seedCanonicalVariants = (type, idsContainer) => {
    TYPE_KEYS[type].forEach((variantKey) => {
      const aliases = Array.isArray(LEGACY_VARIANT_ALIASES[type]?.[variantKey])
        ? LEGACY_VARIANT_ALIASES[type][variantKey]
        : [variantKey];

      for (const alias of aliases) {
        const idForVariant = idsContainer[alias];
        if (idForVariant && records.has(idForVariant)) {
          assignVariantToRecord(type, variantKey, idForVariant);
          break;
        }
      }
    });
  };

  /**
   * Seeds additional variant mappings by pattern-matching converter keys.
   * @param {HeaderFooterType} type
   * @param {Record<string, any>} idsContainer
   */
  const seedAdditionalVariants = (type, idsContainer) => {
    Object.keys(idsContainer).forEach((key) => {
      const canonical = resolveVariantKeyFromProperty(key);
      if (!canonical) return;
      if (variantLookup[type].has(canonical)) return;
      const candidateId = idsContainer[key];
      assignVariantToRecord(type, canonical, candidateId);
    });
  };

  /**
   * Seeds repository state from the converter for the specified type.
   * @param {HeaderFooterType} type
   */
  const seedType = (type) => {
    const idCollectionKey = TYPE_TO_IDS[type];
    const contentCollectionKey = TYPE_TO_COLLECTION[type];

    const idsContainer = ensurePlainObject(converter[idCollectionKey]);
    const contentCollection = ensurePlainObject(converter[contentCollectionKey]);

    seedRecordsFromConverter(type, idsContainer, contentCollection);
    seedCanonicalVariants(type, idsContainer);
    seedAdditionalVariants(type, idsContainer);
  };

  seedType('header');
  seedType('footer');

  /**
   * Retrieves an existing record if available, returning null for unknown ids.
   * @param {string} id
   * @returns {HeaderFooterRecord|null}
   */
  const getRecord = (id) => {
    if (!records.has(id)) {
      // Some documents refer to header/footer ids that were imported but contained no content.
      // These aren't actionable for the UI, so we return null without logging a console warning.
      return null;
    }
    return records.get(id);
  };

  /**
   * Persists updated content back onto the converter for downstream serialization.
   * @param {string} id
   * @param {HeaderFooterType} type
   * @param {Record<string, any>} contentJson
   * @returns {void}
   */
  const touchConverterContent = (id, type, contentJson) => {
    const collectionKey = TYPE_TO_COLLECTION[type];
    if (!converter[collectionKey]) {
      converter[collectionKey] = {};
    }
    converter[collectionKey][id] = contentJson;
  };

  return {
    /**
     * Lists header/footer records, optionally filtered by type.
     * @param {HeaderFooterType} [type]
     * @returns {HeaderFooterRecord[]}
     */
    list(type) {
      if (type && !TYPE_TO_COLLECTION[type]) {
        throw new Error(`Unknown type: ${type}`);
      }
      const entries = Array.from(records.values());
      return type ? entries.filter((record) => record.type === type) : entries;
    },

    /**
     * Retrieves a record by id.
     * @param {string} id
     * @returns {HeaderFooterRecord|null}
     */
    get(id) {
      return getRecord(id);
    },

    /**
     * Determines whether a record exists, optionally matching on type.
     * @param {string} id
     * @param {HeaderFooterType} [type]
     * @returns {boolean}
     */
    has(id, type) {
      const record = getRecord(id);
      if (!record) return false;
      if (type && record.type !== type) return false;
      return true;
    },

    /**
     * Retrieves a record via its canonical variant mapping.
     * @param {HeaderFooterType} type
     * @param {HeaderFooterVariant} variant
     * @returns {HeaderFooterRecord|null}
     */
    getByVariant(type, variant) {
      if (!TYPE_TO_COLLECTION[type]) {
        throw new Error(`Unknown type: ${type}`);
      }

      const id = variantLookup[type].get(variant);
      return records.get(id) ?? null;
    },

    /**
     * Applies content and/or metadata updates to a record.
     * @param {string} id
     * @param {{ contentJson?: Record<string, any>, meta?: Record<string, any> }} [changes={}]
     * @returns {HeaderFooterRecord|null}
     */
    update(id, { contentJson, meta } = {}) {
      const record = getRecord(id);
      if (!record) return null;

      if (contentJson) {
        record.contentJson = contentJson;
        record.content = contentJson;
        touchConverterContent(record.id, record.type, contentJson);
        record.dirty = true;
      }

      if (meta && typeof meta === 'object') {
        record.meta = {
          ...record.meta,
          ...meta,
        };
      }

      return record;
    },

    /**
     * Caches a measured height for the record and clears the dirty flag.
     * @param {string} id
     * @param {number} heightPx
     * @returns {HeaderFooterRecord|null}
     */
    setHeight(id, heightPx) {
      const record = getRecord(id);
      if (!record) return null;

      if (Number.isFinite(heightPx)) {
        record.heightPx = heightPx;
        record.dirty = false;
      } else {
        logger?.warn?.('[headerFooterRepository] setHeight received invalid value', { id, heightPx });
      }

      return record;
    },

    /**
     * Retrieves the cached height for the record, if present.
     * @param {string} id
     * @returns {number|null}
     */
    getHeight(id) {
      return getRecord(id)?.heightPx ?? null;
    },

    /**
     * Marks the record as requiring re-measurement and clears cached height.
     * @param {string} id
     * @returns {HeaderFooterRecord|null}
     */
    markDirty(id) {
      const record = getRecord(id);
      if (!record) return null;
      record.dirty = true;
      record.heightPx = null;
      return record;
    },

    /**
     * Indicates whether a record is currently dirty.
     * @param {string} id
     * @returns {boolean}
     */
    isDirty(id) {
      const record = getRecord(id);
      return record ? !!record.dirty : false;
    },

    /**
     * Ensures the record has a measured height by invoking the provided callback if needed.
     * @param {string} id
     * @param {MeasureFn} measureFn
     * @returns {Promise<number|null>}
     */
    async ensureMeasured(id, measureFn) {
      const record = getRecord(id);
      if (!record) return null;

      if (record.heightPx != null && !record.dirty) {
        return record.heightPx;
      }

      if (typeof measureFn !== 'function') {
        throw new Error('ensureMeasured requires a measureFn callback');
      }

      const nextHeight = await measureFn({ ...record });
      if (Number.isFinite(nextHeight)) {
        record.heightPx = nextHeight;
        record.dirty = false;
      } else {
        logger?.warn?.('[headerFooterRepository] measureFn returned non-finite value', {
          id,
          nextHeight,
        });
      }

      return record.heightPx;
    },

    /**
     * Assigns a canonical variant mapping to an existing record and mirrors it on the converter.
     * @param {HeaderFooterType} type
     * @param {HeaderFooterVariant} variant
     * @param {string} id
     * @returns {HeaderFooterRecord}
     */
    assignVariant(type, variant, id) {
      if (!TYPE_TO_COLLECTION[type]) {
        throw new Error(`Unknown type: ${type}`);
      }

      if (!records.has(id)) {
        throw new Error(`Cannot assign variant to unknown id: ${id}`);
      }

      variantLookup[type].set(variant, id);
      const record = records.get(id);
      const variants = Array.isArray(record.meta.variants) ? record.meta.variants : [];
      if (!variants.includes(variant)) {
        record.meta.variants = [...variants, variant];
      }

      const idsContainer = ensurePlainObject(converter[TYPE_TO_IDS[type]]);
      idsContainer[variant] = id;
      converter[TYPE_TO_IDS[type]] = idsContainer;
      return record;
    },

    /**
     * Serializes repository state for headers and footers.
     * @returns {{ headers: HeaderFooterRecord[], footers: HeaderFooterRecord[] }}
     */
    toJSON() {
      return {
        headers: this.list('header'),
        footers: this.list('footer'),
      };
    },

    /**
     * Retrieves a value from the runtime cache.
     * @param {string} key
     * @returns {any}
     */
    getRuntime(key) {
      return runtimeCache.get(key);
    },

    /**
     * Sets or clears a value in the runtime cache.
     * @param {string} key
     * @param {any} value
     * @returns {void}
     */
    setRuntime(key, value) {
      if (value == null) {
        runtimeCache.delete(key);
      } else {
        runtimeCache.set(key, value);
      }
    },

    /**
     * Clears all runtime cache entries.
     * @returns {void}
     */
    clearRuntime() {
      runtimeCache.clear();
    },
  };
};

export default createHeaderFooterRepository;
