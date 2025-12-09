import type { Environment } from 'vitest/environments';
import { builtinEnvironments } from 'vitest/environments';
import { Blob, File, FileReader } from 'node:buffer';

export default <Environment>{
  ...builtinEnvironments.jsdom,
  name: 'custom',
  async setup(global, options) {
    const result = await builtinEnvironments.jsdom.setup(global, options);
    // https://github.com/jsdom/jsdom/issues/2555
    global.fetch = fetch;
    global.Blob = Blob;
    global.File = File;
    global.FileReader = FileReader;
    return result;
  },
};
