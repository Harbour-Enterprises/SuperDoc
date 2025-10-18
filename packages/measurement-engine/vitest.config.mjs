import { mergeConfig } from 'vitest/config';
import engineConfig from './engine/vitest.config.mjs';

const includeFromRoot = (engineConfig.test?.include ?? []).map((pattern) => {
  if (pattern.startsWith('../')) {
    return pattern.replace(/^\.\.\//, '');
  }
  return `engine/${pattern}`;
});

// Extend the engine Vitest config so the project root becomes packages/measurement-engine
// while still running the same suites.
export default mergeConfig(engineConfig, {
  test: {
    include: includeFromRoot,
  },
});
