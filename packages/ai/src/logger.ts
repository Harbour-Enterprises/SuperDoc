import packageJson from '../package.json';

const LOG_PREFIX = '🦋 🦸‍♀️ [superdoc-ai]';
const PACKAGE_NAME = '@superdoc-dev/ai';
const PACKAGE_VERSION = packageJson.version ?? '0.0.0';

let hasLoggedVersion = false;

export const log = (...args: unknown[]) => {
    (console.debug ? console.debug : console.log)(LOG_PREFIX, ...args);
};

export const logPackageVersion = (): void => {
    if (hasLoggedVersion) {
        return;
    }

    hasLoggedVersion = true;
    log(`Using ${PACKAGE_NAME} version:`, PACKAGE_VERSION);
};
