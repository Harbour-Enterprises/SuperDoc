/// <reference types="vite/client" />

import schemaManifest from '@packages/schema-management/versions/schemas.json';

type SchemaModule = Record<string, unknown>;

export type FrozenSchemaEntry = {
  version: string;
  entry: string;
  builtAt: string;
  sourceCommit?: string | null;
  hash?: string;
  path: string;
};

export type FrozenSchemaManifest = {
  versions: Record<string, FrozenSchemaEntry>;
};

const schemaModules = import.meta.glob<SchemaModule>('@packages/schema-management/versions/*/schema.js');
const metadataModules = import.meta.glob('@packages/schema-management/versions/*/metadata.json', { import: 'default' });
const rawSchemaModules = import.meta.glob<string>('@packages/schema-management/versions/*/schema.js', {
  query: '?raw',
  import: 'default',
});

const metadataByVersion: Record<string, () => Promise<FrozenSchemaEntry>> = Object.entries(metadataModules).reduce(
  (acc, [key, loader]) => {
    const match = key.match(/versions\/([^/]+)\/metadata\.json$/);
    if (match?.[1]) acc[match[1]] = loader as () => Promise<FrozenSchemaEntry>;
    return acc;
  },
  {} as Record<string, () => Promise<FrozenSchemaEntry>>,
);

const loadersByVersion: Record<string, () => Promise<SchemaModule>> = Object.entries(schemaModules).reduce(
  (acc, [key, loader]) => {
    const match = key.match(/versions\/([^/]+)\/schema\.js$/);
    if (match?.[1]) acc[match[1]] = loader as () => Promise<SchemaModule>;
    return acc;
  },
  {} as Record<string, () => Promise<SchemaModule>>,
);

const rawSchemaByVersion: Record<string, () => Promise<string>> = Object.entries(rawSchemaModules).reduce(
  (acc, [key, loader]) => {
    const match = key.match(/versions\/([^/]+)\/schema\.js$/);
    if (match?.[1]) acc[match[1]] = loader;
    return acc;
  },
  {} as Record<string, () => Promise<string>>,
);

export const frozenSchemasManifest: FrozenSchemaManifest['versions'] = schemaManifest.versions || {};

export const listFrozenSchemaVersions = (): string[] => Object.keys(frozenSchemasManifest);

export const getFrozenSchemaMetadata = (version: string): FrozenSchemaEntry | null =>
  frozenSchemasManifest[version] || null;

export const hasFrozenSchema = (version: string): boolean =>
  Boolean(loadersByVersion[version] && frozenSchemasManifest[version]);

export const getLatestFrozenSchemaVersion = (): string | null => {
  const versions = listFrozenSchemaVersions();
  if (!versions.length) return null;
  return versions.sort(compareSemverDescending)[0];
};

export const loadFrozenSchema = async (version?: string): Promise<SchemaModule> => {
  const targetVersion = version || getLatestFrozenSchemaVersion();
  if (!targetVersion) {
    throw new Error('No frozen schemas are available.');
  }

  const loader = loadersByVersion[targetVersion];
  if (!loader) {
    const known = listFrozenSchemaVersions();
    const knownLabel = known.length ? known.join(', ') : 'none';
    if (version) {
      console.warn(`Requested schema version "${version}" is not available. Known versions: ${knownLabel}`);
    }
    throw new Error(`Schema version "${targetVersion}" is not available. Known versions: ${knownLabel}`);
  }

  await verifyHash(targetVersion);

  try {
    return await loader();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load frozen schema version "${targetVersion}": ${detail}`);
  }
};

const compareSemverDescending = (a: string, b: string) => {
  const pa = parseSemverSafe(a);
  const pb = parseSemverSafe(b);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pb[i] - pa[i];
  }
  return a.localeCompare(b);
};

// Basic semver parser without prerelease ordering; treats missing pieces as 0.
function parseSemverSafe(v: string): number[] {
  try {
    const parts = v.split('.', 3).map((n) => Number.parseInt(n, 10));
    while (parts.length < 3) parts.push(0);
    return parts.map((n) => (Number.isFinite(n) ? n : 0));
  } catch {
    return [0, 0, 0];
  }
}

async function verifyHash(version: string) {
  const metaLoader = metadataByVersion[version];
  if (!metaLoader) return;

  try {
    const metadata = await metaLoader();
    const manifestHash = frozenSchemasManifest[version]?.hash;
    const expectedHash = manifestHash || metadata.hash;
    // Validate manifest vs metadata consistency first
    if (manifestHash && metadata.hash && manifestHash !== metadata.hash) {
      throw new Error(`Hash mismatch for version ${version} (manifest vs metadata).`);
    }

    if (!expectedHash) {
      throw new Error(`Missing schema hash for version ${version}; refusing to load unverifiable schema.`);
    }

    const actual = await computeSchemaHash(version);
    if (actual !== expectedHash) {
      throw new Error(`Hash mismatch for version ${version} (expected ${expectedHash}, got ${actual}).`);
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed integrity checks for schema version "${version}": ${detail}`);
  }
}

async function computeSchemaHash(version: string): Promise<string> {
  const rawLoader = rawSchemaByVersion[version];
  if (!rawLoader) {
    throw new Error(`Raw schema content not available for version ${version}.`);
  }

  const content = await rawLoader();
  const data = new TextEncoder().encode(typeof content === 'string' ? content : String(content));
  const subtle = getSubtleCrypto();
  const hashBuffer = await subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getSubtleCrypto(): SubtleCrypto {
  if (typeof crypto !== 'undefined' && crypto.subtle) return crypto.subtle;
  const globalCrypto = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (globalCrypto?.subtle) return globalCrypto.subtle;
  throw new Error('WebCrypto subtle API is not available to compute schema hash.');
}
