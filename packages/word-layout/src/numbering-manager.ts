type NumKey = string;
const RESERVED_NUM_ID_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const NO_ABSTRACT_ID_KEY = '__no_abstract__';

/**
 * Converts a string or number value into a normalized string key for internal storage.
 *
 * @param value - The string or number to convert to a key
 * @returns A string representation of the value
 *
 * @example
 * ```typescript
 * toKey('abc') // 'abc'
 * toKey(123) // '123'
 * ```
 */
const toKey = (value: string | number): NumKey => String(value);

/**
 * Validates that a numId value is valid (not empty string or NaN).
 *
 * @param numId - The numId value to validate
 * @throws {Error} If numId is an empty string or NaN
 */
const validateNumId = (numId: string | number): void => {
  if (typeof numId === 'string') {
    const trimmed = numId.trim();
    if (trimmed === '') {
      throw new Error('Invalid numId: empty string. NumId must be a non-empty string or number.');
    }
    if (RESERVED_NUM_ID_KEYS.has(trimmed)) {
      throw new Error(`Invalid numId: reserved property name "${trimmed}". NumId cannot be a prototype-polluting key.`);
    }
  }
  if (typeof numId === 'number' && !Number.isFinite(numId)) {
    throw new Error(`Invalid numId: ${numId}. NumId must be a finite number.`);
  }
};

type LevelCounters = Record<number, Record<number, number>>;
type CountersMap = Record<NumKey, LevelCounters>;
type StartSettings = { start?: number; restart?: number };
type StartsMap = Record<NumKey, Record<number, StartSettings>>;
type LastSeenEntry = { pos: number; count: number };
type LastSeenMap = Record<NumKey, Record<number, LastSeenEntry>>;
type PathCache = Record<NumKey, Record<number, Record<number, number[]>>>;
type AbstractCountersMap = Record<NumKey, Record<number, Record<number, number>>>;

export interface NumberingManager {
  setStartSettings: (numId: string | number, level: number, startValue: number, restartValue?: number) => void;
  setCounter: (numId: string | number, level: number, pos: number, value: number, abstractId?: string | number) => void;
  getCounter: (numId: string | number, level: number, pos: number) => number | null;
  calculateCounter: (numId: string | number, level: number, pos: number, abstractId?: string | number) => number;
  getAncestorsPath: (numId: string | number, level: number, pos: number) => number[];
  calculatePath: (numId: string | number, level: number, pos: number) => number[];
  getCountersMap: () => CountersMap;
  /**
   * WARNING: Clears ALL state including counters, caches, and abstract ID mappings.
   * This is a destructive operation that resets the entire numbering manager state.
   * Use with extreme caution - typically only needed when completely resetting document state.
   */
  clearAllState: () => void;
  enableCache: () => void;
  disableCache: () => void;
}

/**
 * Extracts and sorts all position keys from a position-to-value map.
 *
 * Converts string keys to integers, filters out non-finite values, and returns
 * positions in ascending order. This is used to find previous positions when
 * calculating counters.
 *
 * @param map - A map of position numbers to counter values
 * @returns An array of positions sorted in ascending order
 *
 * @example
 * ```typescript
 * getSortedPositions({ 10: 1, 5: 2, 15: 3 })
 * // Returns: [5, 10, 15]
 * ```
 */
const getSortedPositions = (map: Record<number, number>): number[] =>
  Object.keys(map)
    .map((p) => parseInt(p, 10))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

/**
 * Creates a numbering manager instance for tracking and calculating list counters across a document.
 *
 * The numbering manager maintains state for multi-level list numbering, handling counter
 * increments, restarts, and hierarchical relationships between list levels. It supports
 * both simple sequential numbering and complex restart behaviors based on level usage.
 *
 * @returns A numbering manager instance with methods for managing list counters
 *
 * @example
 * ```typescript
 * const manager = createNumberingManager();
 *
 * // Configure numbering settings
 * manager.setStartSettings('numId1', 0, 1); // Level 0 starts at 1
 * manager.setStartSettings('numId1', 1, 1); // Level 1 starts at 1
 *
 * // Calculate and set counters
 * const value1 = manager.calculateCounter('numId1', 0, 100, 'abs1');
 * manager.setCounter('numId1', 0, 100, value1, 'abs1');
 *
 * const value2 = manager.calculateCounter('numId1', 0, 200, 'abs1');
 * manager.setCounter('numId1', 0, 200, value2, 'abs1');
 *
 * console.log(value1); // 1
 * console.log(value2); // 2
 *
 * // Get complete numbering path for hierarchical display
 * const path = manager.calculatePath('numId1', 1, 150);
 * console.log(path); // [1, 1] (parent level 0, current level 1)
 * ```
 */
export const createNumberingManager = (): NumberingManager => {
  let countersMap: CountersMap = {};
  let abstractCountersMap: AbstractCountersMap = {};
  const startsMap: StartsMap = {};
  let abstractIdMap: Record<NumKey, NumKey> = {};
  let lastSeenMap: LastSeenMap = {};
  let pathCache: PathCache = {};
  let cacheEnabled = false;

  /**
   * Configures the starting value and restart behavior for a specific numbering level.
   *
   * The start value determines the initial counter for a level. The restart value controls
   * when counters reset based on parent level usage:
   * - undefined: Restart whenever any parent level is used between siblings
   * - 0: Never restart (simple sequential increment)
   * - N: Restart only if a parent level <= N is used between siblings
   *
   * @param numId - The numbering ID (string or number)
   * @param level - The level to configure (0-based, must be non-negative)
   * @param startValue - The initial counter value (typically 1)
   * @param restartValue - Optional restart threshold level
   * @throws {Error} If numId is invalid (empty string or NaN)
   * @throws {Error} If level is negative or not finite
   * @throws {Error} If startValue is not finite
   * @throws {Error} If restartValue is provided but not finite
   *
   * @example
   * ```typescript
   * manager.setStartSettings('list1', 0, 1); // Level 0 starts at 1, restarts on any parent
   * manager.setStartSettings('list1', 1, 1, 0); // Level 1 starts at 1, never restarts
   * ```
   */
  const setStartSettings = (
    numId: string | number,
    level: number,
    startValue: number,
    restartValue?: number | null,
  ) => {
    const normalizedRestart = restartValue == null ? undefined : restartValue;
    validateNumId(numId);
    if (level < 0 || !Number.isFinite(level)) {
      throw new Error(`Invalid level: ${level}. Level must be a non-negative finite number.`);
    }
    if (!Number.isFinite(startValue)) {
      throw new Error(`Invalid startValue: ${startValue}. Start value must be a finite number.`);
    }
    if (normalizedRestart !== undefined && !Number.isFinite(normalizedRestart)) {
      throw new Error(`Invalid restartValue: ${restartValue}. Restart value must be a finite number.`);
    }

    const key = toKey(numId);
    if (!startsMap[key]) {
      startsMap[key] = {};
    }
    if (!startsMap[key][level]) {
      startsMap[key][level] = {};
    }
    startsMap[key][level].start = startValue;
    startsMap[key][level].restart = normalizedRestart;
  };

  /**
   * Ensures that the nested structure exists in a counters map for a given numId and level.
   *
   * Creates the necessary intermediate objects if they don't exist, avoiding null reference errors
   * when setting or accessing counter values.
   *
   * @param map - The counters map to ensure structure in
   * @param numId - The normalized key for the numbering ID
   * @param level - The level to ensure exists in the map
   */
  const ensureCounters = (map: CountersMap, numId: NumKey, level: number) => {
    if (!map[numId]) {
      map[numId] = {};
    }
    if (!map[numId][level]) {
      map[numId][level] = {};
    }
  };

  /**
   * Records a counter value at a specific position for a given numbering level.
   *
   * This stores both the concrete counter in the main counters map and, if an abstract ID
   * is provided or previously set, also stores it in the abstract counters map for restart
   * logic. When caching is enabled, also updates the last-seen position cache for optimization.
   *
   * @param numId - The numbering ID (string or number)
   * @param level - The level (0-based, must be non-negative)
   * @param pos - The document position (must be non-negative)
   * @param value - The counter value to store (must be finite)
   * @param abstractId - Optional abstract numbering ID for linking related numbering instances
   * @throws {Error} If numId is invalid (empty string or NaN)
   * @throws {Error} If level is negative or not finite
   * @throws {Error} If position is negative or not finite
   * @throws {Error} If value is not finite
   *
   * @example
   * ```typescript
   * const value = manager.calculateCounter('list1', 0, 100, 'abstract1');
   * manager.setCounter('list1', 0, 100, value, 'abstract1');
   * ```
   */
  const setCounter = (
    numId: string | number,
    level: number,
    pos: number,
    value: number,
    abstractId?: string | number,
  ) => {
    validateNumId(numId);
    if (level < 0 || !Number.isFinite(level)) {
      throw new Error(`Invalid level: ${level}. Level must be a non-negative finite number.`);
    }
    if (pos < 0 || !Number.isFinite(pos)) {
      throw new Error(`Invalid position: ${pos}. Position must be a non-negative finite number.`);
    }
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid value: ${value}. Value must be a finite number.`);
    }

    const numKey = toKey(numId);
    const resolvedAbstractId = abstractId != null ? toKey(abstractId) : NO_ABSTRACT_ID_KEY;
    ensureCounters(countersMap, numKey, level);
    countersMap[numKey][level][pos] = value;

    abstractIdMap[numKey] = resolvedAbstractId;
    ensureCounters(abstractCountersMap, resolvedAbstractId, level);
    abstractCountersMap[resolvedAbstractId][level][pos] = value;

    if (!cacheEnabled) {
      return;
    }
    if (!lastSeenMap[numKey]) {
      lastSeenMap[numKey] = {};
    }
    const lastEntry = lastSeenMap[numKey][level];
    if (!lastEntry || pos > lastEntry.pos) {
      lastSeenMap[numKey][level] = { pos, count: value };
    }
  };

  /**
   * Retrieves a previously stored counter value at a specific position.
   *
   * Returns null if no counter has been set at the specified position. This is distinct
   * from calculateCounter, which computes what the counter should be based on restart logic.
   *
   * @param numId - The numbering ID (string or number)
   * @param level - The level (0-based, must be non-negative)
   * @param pos - The document position (must be non-negative)
   * @returns The counter value if found, null otherwise
   * @throws {Error} If numId is invalid (empty string or NaN)
   * @throws {Error} If level is negative or not finite
   * @throws {Error} If position is negative or not finite
   *
   * @example
   * ```typescript
   * manager.setCounter('list1', 0, 100, 5);
   * const value = manager.getCounter('list1', 0, 100); // Returns 5
   * const missing = manager.getCounter('list1', 0, 200); // Returns null
   * ```
   */
  const getCounter = (numId: string | number, level: number, pos: number): number | null => {
    validateNumId(numId);
    if (level < 0 || !Number.isFinite(level)) {
      throw new Error(`Invalid level: ${level}. Level must be a non-negative finite number.`);
    }
    if (pos < 0 || !Number.isFinite(pos)) {
      throw new Error(`Invalid position: ${pos}. Position must be a non-negative finite number.`);
    }

    const numKey = toKey(numId);
    const numIdData = countersMap[numKey];
    if (numIdData == null) {
      return null;
    }
    const levelMap = numIdData[level];
    if (levelMap == null) {
      return null;
    }
    const value = levelMap[pos];
    if (value == null) {
      return null;
    }
    return value;
  };

  /**
   * Finds the most recent position before the given position that has a counter value.
   *
   * Uses caching when enabled for performance, otherwise scans all positions. Returns
   * the previous position, its counter value, and the configured start value for the level.
   * If no previous position exists, returns null for position and startValue-1 for count.
   *
   * @param levelData - The map of positions to counter values for this level
   * @param pos - The current position to find a previous position for
   * @param numKey - The normalized numbering key
   * @param level - The level being queried
   * @returns Object containing previous position (or null), its count, and the start value
   *
   * @example
   * ```typescript
   * // With counters at positions 10, 20, 30, finding previous for position 25:
   * findPreviousPosition(levelData, 25, 'num1', 0)
   * // Returns: { pos: 20, count: 2, startValue: 1 }
   * ```
   */
  const findPreviousPosition = (
    levelData: Record<number, number>,
    pos: number,
    numKey: NumKey,
    level: number,
  ): { pos: number | null; count: number; startValue: number } => {
    const startValue = startsMap?.[numKey]?.[level]?.start ?? 1;
    let previousPos: number | null = null;
    let previousCount = startValue - 1;

    if (cacheEnabled) {
      const cachedLast = lastSeenMap?.[numKey]?.[level];
      if (cachedLast && cachedLast.pos < pos) {
        previousPos = cachedLast.pos;
        previousCount = cachedLast.count;
      }
    }

    if (previousPos == null) {
      const candidates = getSortedPositions(levelData).filter((p) => p < pos);
      const fallbackPos = candidates[candidates.length - 1];
      if (fallbackPos != null) {
        previousPos = fallbackPos;
        previousCount = levelData[fallbackPos];
      }
    }

    return { pos: previousPos, count: previousCount, startValue };
  };

  /**
   * Determines whether a counter should restart based on parent level usage.
   *
   * Analyzes whether any parent levels (levels < current level) were used between
   * the previous position and the current position. The restart behavior depends on
   * the restartSetting:
   * - undefined: Restart if any parent level was used
   * - 0: Never restart (always increment)
   * - N: Restart if any parent level <= N was used
   *
   * @param abstractIdKey - The normalized abstract ID key (may be null/undefined)
   * @param level - The current level being calculated
   * @param previousPos - The position of the previous counter at this level
   * @param pos - The current position
   * @param restartSetting - The restart threshold configuration
   * @returns True if the counter should restart to the start value, false to increment
   *
   * @example
   * ```typescript
   * // Level 1 counter, parent level 0 was used between positions
   * shouldRestartCounter('abs1', 1, 100, 200, undefined) // true - restart
   * shouldRestartCounter('abs1', 1, 100, 200, 0) // false - never restart
   * ```
   */
  const shouldRestartCounter = (
    abstractIdKey: NumKey,
    level: number,
    previousPos: number,
    pos: number,
    restartSetting?: number,
  ): boolean => {
    const usedLevels: number[] = [];
    for (let lvl = 0; lvl < level; lvl++) {
      const levelDataMap = abstractCountersMap?.[abstractIdKey]?.[lvl] || {};
      const hasUsed = getSortedPositions(levelDataMap).some((p) => p > previousPos && p < pos);
      if (hasUsed) {
        usedLevels.push(lvl);
      }
    }

    if (usedLevels.length === 0) {
      return false;
    }
    if (restartSetting == null) {
      return true;
    }
    return usedLevels.some((lvl) => lvl <= restartSetting);
  };

  /**
   * Calculates the appropriate counter value for a position based on restart logic.
   *
   * This is the core numbering algorithm that determines counter values by:
   * 1. Finding the previous counter at this level (if any)
   * 2. Checking if any parent levels were used between positions
   * 3. Deciding whether to restart or increment based on restart settings
   *
   * The calculated value should be passed to setCounter to persist it.
   *
   * @param numId - The numbering ID (string or number)
   * @param level - The level (0-based, must be non-negative)
   * @param pos - The document position (must be non-negative)
   * @param abstractId - Optional abstract numbering ID for restart logic
   * @returns The calculated counter value
   * @throws {Error} If numId is invalid (empty string or NaN)
   * @throws {Error} If level is negative or not finite
   * @throws {Error} If position is negative or not finite
   * @throws {Error} If the calculated counter value would overflow (exceeds Number.MAX_SAFE_INTEGER)
   *
   * @example
   * ```typescript
   * manager.setStartSettings('list1', 0, 1);
   * const value1 = manager.calculateCounter('list1', 0, 100, 'abs1');
   * manager.setCounter('list1', 0, 100, value1, 'abs1'); // value1 = 1
   *
   * const value2 = manager.calculateCounter('list1', 0, 200, 'abs1');
   * manager.setCounter('list1', 0, 200, value2, 'abs1'); // value2 = 2
   * ```
   */
  const calculateCounter = (
    numId: string | number,
    level: number,
    pos: number,
    abstractId?: string | number,
  ): number => {
    validateNumId(numId);
    if (level < 0 || !Number.isFinite(level)) {
      throw new Error(`Invalid level: ${level}. Level must be a non-negative finite number.`);
    }
    if (pos < 0 || !Number.isFinite(pos)) {
      throw new Error(`Invalid position: ${pos}. Position must be a non-negative finite number.`);
    }

    const numKey = toKey(numId);
    const resolvedAbstractId = abstractId != null ? toKey(abstractId) : NO_ABSTRACT_ID_KEY;
    abstractIdMap[numKey] = resolvedAbstractId;

    const restartSetting = startsMap?.[numKey]?.[level]?.restart;
    const levelData = countersMap?.[numKey]?.[level] || {};
    const { pos: previousPos, count: previousCount, startValue } = findPreviousPosition(levelData, pos, numKey, level);

    // Validate startValue is finite
    if (!Number.isFinite(startValue)) {
      throw new Error(`Invalid startValue: ${startValue}. Start value must be a finite number.`);
    }

    let calculatedValue: number;

    if (restartSetting === 0) {
      calculatedValue = previousCount + 1;
    } else if (previousPos == null) {
      calculatedValue = startValue;
    } else {
      const abstractIdKey = abstractIdMap[numKey];
      if (shouldRestartCounter(abstractIdKey, level, previousPos, pos, restartSetting)) {
        calculatedValue = startValue;
      } else {
        calculatedValue = previousCount + 1;
      }
    }

    // Validate the calculated value is finite and within safe integer range
    if (!Number.isFinite(calculatedValue)) {
      throw new Error(`Calculated counter value is not finite: ${calculatedValue}`);
    }
    if (calculatedValue > Number.MAX_SAFE_INTEGER) {
      throw new Error(
        `Counter overflow: calculated value ${calculatedValue} exceeds maximum safe integer ${Number.MAX_SAFE_INTEGER}`,
      );
    }

    return calculatedValue;
  };

  /**
   * Retrieves the counter values for all ancestor levels (parent levels) at a position.
   *
   * Returns an array of counter values for levels 0 through level-1. For each ancestor level,
   * finds the most recent counter value before the given position. If no counter exists for
   * an ancestor level, uses the start value. This is used to build hierarchical numbering
   * like "1.2.3" where [1, 2] are ancestors and 3 is the current level.
   *
   * Results are cached when caching is enabled for performance.
   *
   * @param numId - The numbering ID (string or number)
   * @param level - The current level (ancestors are levels 0 through level-1)
   * @param pos - The document position
   * @returns Array of counter values for ancestor levels (empty array if level is 0)
   * @throws {Error} If numId is invalid (empty string or NaN)
   * @throws {Error} If level is negative or not finite
   * @throws {Error} If position is negative or not finite
   *
   * @example
   * ```typescript
   * // For level 2 at position 150, with ancestors at levels 0 and 1:
   * manager.getAncestorsPath('list1', 2, 150)
   * // Returns: [1, 2] (actual counter values, not just start values)
   * ```
   */
  const getAncestorsPath = (numId: string | number, level: number, pos: number): number[] => {
    validateNumId(numId);
    if (level < 0 || !Number.isFinite(level)) {
      throw new Error(`Invalid level: ${level}. Level must be a non-negative finite number.`);
    }
    if (pos < 0 || !Number.isFinite(pos)) {
      throw new Error(`Invalid position: ${pos}. Position must be a non-negative finite number.`);
    }

    const numKey = toKey(numId);
    if (cacheEnabled && pathCache?.[numKey]?.[level]?.[pos]) {
      return pathCache[numKey][level][pos];
    }
    const path: number[] = [];
    const abstractId = abstractIdMap[numKey] ?? NO_ABSTRACT_ID_KEY;
    for (let lvl = 0; lvl < level; lvl++) {
      const startCount = startsMap?.[numKey]?.[lvl]?.start ?? 1;
      const levelData = abstractCountersMap?.[abstractId]?.[lvl] || {};
      const previousPos = getSortedPositions(levelData)
        .filter((p) => p < pos)
        .pop();
      if (previousPos == null) {
        path.push(startCount);
      } else {
        path.push(levelData[previousPos]);
      }
    }
    if (cacheEnabled) {
      if (!pathCache[numKey]) {
        pathCache[numKey] = {};
      }
      if (!pathCache[numKey][level]) {
        pathCache[numKey][level] = {};
      }
      pathCache[numKey][level][pos] = path;
    }
    return path;
  };

  /**
   * Calculates the complete numbering path including ancestors and the current level.
   *
   * Combines ancestor counter values with the current level's counter (if set) to produce
   * a complete hierarchical path. For example, in "1.2.3" numbering, this returns [1, 2, 3].
   * If the current level's counter hasn't been set, only ancestor values are returned.
   *
   * @param numId - The numbering ID (string or number)
   * @param level - The current level
   * @param pos - The document position
   * @returns Array of counter values from level 0 through current level (if counter is set)
   * @throws {Error} If numId is invalid (empty string or NaN)
   * @throws {Error} If level is negative or not finite
   * @throws {Error} If position is negative or not finite
   *
   * @example
   * ```typescript
   * // After setting counters for levels 0, 1, and 2:
   * manager.calculatePath('list1', 2, 150)
   * // Returns: [1, 2, 3] (complete path including current level)
   * ```
   */
  const calculatePath = (numId: string | number, level: number, pos: number): number[] => {
    validateNumId(numId);
    if (level < 0 || !Number.isFinite(level)) {
      throw new Error(`Invalid level: ${level}. Level must be a non-negative finite number.`);
    }
    if (pos < 0 || !Number.isFinite(pos)) {
      throw new Error(`Invalid position: ${pos}. Position must be a non-negative finite number.`);
    }

    const path = getAncestorsPath(numId, level, pos);
    const myCount = getCounter(numId, level, pos);
    if (myCount != null) {
      path.push(myCount);
    }
    return path;
  };

  /**
   * WARNING: Clears ALL state including counters, caches, and abstract ID mappings.
   *
   * This is a destructive operation that resets the entire numbering manager to its initial state.
   * All counter values, abstract ID mappings, and cache data will be lost. Use with extreme caution -
   * typically only needed when completely resetting document state or during testing.
   *
   * @example
   * ```typescript
   * // Only use when you need to completely reset all numbering state
   * manager.clearAllState();
   * ```
   */
  const clearAllState = () => {
    lastSeenMap = {};
    pathCache = {};
    countersMap = {};
    abstractCountersMap = {};
    abstractIdMap = {};
  };

  /**
   * Returns the internal counters map for inspection or debugging.
   *
   * The returned object maps numbering IDs to levels to positions to counter values.
   * This is primarily useful for testing, debugging, or advanced introspection.
   * Do not modify the returned object directly.
   *
   * @returns The counters map structure
   *
   * @example
   * ```typescript
   * const counters = manager.getCountersMap();
   * console.log(counters); // { "list1": { "0": { "100": 1, "200": 2 } } }
   * ```
   */
  const getCountersMap = () => countersMap;

  /**
   * Enables caching for performance optimization.
   *
   * When caching is enabled, the manager maintains:
   * - Last-seen position cache for faster previous position lookups
   * - Ancestor path cache for hierarchical numbering
   *
   * WARNING: Enabling cache clears all existing state (counters, caches, abstract IDs).
   * Only enable caching at initialization or when you intend to reset all state.
   *
   * @example
   * ```typescript
   * const manager = createNumberingManager();
   * manager.enableCache(); // WARNING: clears all state
   * ```
   */
  const enableCache = () => {
    cacheEnabled = true;
    clearAllState();
  };

  /**
   * Disables caching and operates in uncached mode.
   *
   * When caching is disabled, the manager scans all positions for each operation,
   * which is slower but may be more appropriate for certain use cases.
   *
   * WARNING: Disabling cache clears all existing state (counters, caches, abstract IDs).
   *
   * @example
   * ```typescript
   * manager.disableCache(); // WARNING: clears all state
   * ```
   */
  const disableCache = () => {
    cacheEnabled = false;
    clearAllState();
  };

  return {
    setStartSettings,
    setCounter,
    getCounter,
    calculateCounter,
    getAncestorsPath,
    calculatePath,
    getCountersMap,
    clearAllState,
    enableCache,
    disableCache,
  };
};
