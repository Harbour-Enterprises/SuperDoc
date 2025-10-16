// @ts-check
import { RELATIONSHIP_TYPES } from '@core/super-converter/docx-helpers/docx-constants.js';
import {
  findRelationshipIdFromTarget,
  getDocumentRelationshipElements,
  getMaxRelationshipIdInt,
} from '@core/super-converter/docx-helpers/document-rels.js';

/**
 * Cache for relationship lookups and insertions while validating a document.
 */
export class RelationshipCache {
  /**
   * @param {import('../types.js').Editor} editor
   */
  constructor(editor) {
    this.editor = editor;

    /** @type {Map<string, string>} */
    this.cache = new Map();

    /** @type {import('@core/super-converter/types.js').XmlRelationshipElement[]} */
    this.relationships = getDocumentRelationshipElements(editor);

    this.maxId = getMaxRelationshipIdInt(this.relationships);

    this.relationships.forEach((rel) => {
      if (!rel?.attributes?.Id || !rel?.attributes?.Target) return;
      const normalizedTarget = this.#normalizeTarget(rel.attributes.Target);
      if (normalizedTarget) this.cache.set(normalizedTarget, rel.attributes.Id);
    });
  }

  /**
   * Find an existing relationship id for the provided target.
   * @param {string} target
   * @returns {string|null}
   */
  find(target) {
    const normalizedTarget = this.#normalizeTarget(target);
    if (!normalizedTarget) return null;

    const cached = this.cache.get(normalizedTarget);
    if (cached) return cached;

    const found = findRelationshipIdFromTarget(target, this.editor);
    if (found) this.cache.set(normalizedTarget, found);
    return found ?? null;
  }

  /**
   * Get or create a relationship id for the provided target and type.
   * @param {string} target
   * @param {import('@core/super-converter/docx-helpers/docx-constants.js').RelationshipType} type
   * @returns {string|null}
   */
  getOrCreate(target, type) {
    const normalizedTarget = this.#normalizeTarget(target);
    if (!normalizedTarget) return null;

    const cached = this.cache.get(normalizedTarget);
    if (cached) return cached;

    const mappedType = RELATIONSHIP_TYPES[type];
    if (!mappedType) return null;

    const newId = this.#getNextId();

    const newRelationship = {
      type: 'element',
      name: 'Relationship',
      attributes: {
        Id: newId,
        Type: mappedType,
        Target: this.#formatTarget(target),
      },
    };

    if (type === 'hyperlink') {
      newRelationship.attributes.TargetMode = 'External';
    }

    this.relationships.push(newRelationship);
    this.cache.set(normalizedTarget, newId);
    return newId;
  }

  /**
   * @returns {string}
   */
  #getNextId() {
    this.maxId += 1;
    return `rId${this.maxId}`;
  }

  /**
   * Normalize a target for cache keys.
   * @param {string} target
   * @returns {string|null}
   */
  #normalizeTarget(target) {
    if (!target || typeof target !== 'string') return null;
    return target.startsWith('word/') ? target.slice(5) : target;
  }

  /**
   * Format the stored target string.
   * @param {string} target
   * @returns {string}
   */
  #formatTarget(target) {
    const normalized = this.#normalizeTarget(target);
    return normalized ?? target;
  }
}
