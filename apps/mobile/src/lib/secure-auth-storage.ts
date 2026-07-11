import * as SecureStore from 'expo-secure-store';

interface AuthStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

interface StorageManifest {
  version: 1;
  storageId: string;
  chunkCount: number;
}

const CHUNK_SIZE = 1_800;
const PREFIX = 'velunee.auth';

const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

function normalizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function getBaseKey(key: string): string {
  return `${PREFIX}.${normalizeKey(key)}`;
}

function getManifestKey(key: string): string {
  return `${getBaseKey(key)}.manifest`;
}

function getChunkKey(key: string, storageId: string, index: number): string {
  return `${getBaseKey(key)}.${storageId}.${index}`;
}

function createStorageId(): string {
  return `${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

async function readManifest(
  key: string,
): Promise<StorageManifest | null> {
  const storedManifest = await SecureStore.getItemAsync(
    getManifestKey(key),
  );

  if (!storedManifest) return null;

  try {
    const parsed = JSON.parse(storedManifest) as StorageManifest;

    if (
      parsed.version !== 1 ||
      typeof parsed.storageId !== 'string' ||
      !Number.isInteger(parsed.chunkCount) ||
      parsed.chunkCount < 1
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

async function removeChunks(
  key: string,
  manifest: StorageManifest,
): Promise<void> {
  await Promise.all(
    Array.from({ length: manifest.chunkCount }, (_, index) =>
      SecureStore.deleteItemAsync(
        getChunkKey(key, manifest.storageId, index),
      ),
    ),
  );
}

export const secureAuthStorage: AuthStorage = {
  async getItem(key): Promise<string | null> {
    const manifest = await readManifest(key);

    if (!manifest) return null;

    const chunks = await Promise.all(
      Array.from({ length: manifest.chunkCount }, (_, index) =>
        SecureStore.getItemAsync(
          getChunkKey(key, manifest.storageId, index),
        ),
      ),
    );

    if (chunks.some((chunk) => chunk === null)) {
      await this.removeItem(key);
      return null;
    }

    return chunks.join('');
  },

  async setItem(key, value): Promise<void> {
    const previousManifest = await readManifest(key);
    const storageId = createStorageId();

    const chunks =
      value.length > 0
        ? value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'gs')) ?? ['']
        : [''];

    const nextManifest: StorageManifest = {
      version: 1,
      storageId,
      chunkCount: chunks.length,
    };

    try {
      for (let index = 0; index < chunks.length; index += 1) {
        await SecureStore.setItemAsync(
          getChunkKey(key, storageId, index),
          chunks[index],
          secureStoreOptions,
        );
      }

      // Write the manifest last so partially written sessions are ignored.
      await SecureStore.setItemAsync(
        getManifestKey(key),
        JSON.stringify(nextManifest),
        secureStoreOptions,
      );
    } catch (error) {
      await removeChunks(key, nextManifest).catch(() => undefined);
      throw error;
    }

    if (previousManifest) {
      await removeChunks(key, previousManifest).catch(() => undefined);
    }
  },

  async removeItem(key): Promise<void> {
    const manifest = await readManifest(key);

    if (manifest) {
      await removeChunks(key, manifest).catch(() => undefined);
    }

    await SecureStore.deleteItemAsync(getManifestKey(key));
  },
};
