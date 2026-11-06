/** All values, including chunks and their index, belong in the native secure store. */
export interface SecureKeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const CHUNK_BYTES = 1800;
const MAX_BYTES = 256 * 1024;
const MAX_CHUNKS = 256;
interface Manifest { version: 1; generation: string; count: number; bytes: number }

function validKey(key: string) {
  if (!/^[A-Za-z0-9._-]{1,200}$/.test(key)) throw new Error('The secure sign-in storage key is invalid.');
}

function utf8Bytes(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const code = character.codePointAt(0)!;
    if (code >= 0xd800 && code <= 0xdfff) throw new Error('Sign-in data contains invalid text.');
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function split(value: string): { chunks: string[]; bytes: number } {
  const chunks: string[] = [];
  let current = '', currentBytes = 0, bytes = 0;
  for (const character of value) {
    const size = utf8Bytes(character);
    if (currentBytes + size > CHUNK_BYTES) {
      chunks.push(current); current = ''; currentBytes = 0;
    }
    current += character; currentBytes += size; bytes += size;
    if (bytes > MAX_BYTES) throw new Error('Sign-in data is too large to save securely.');
  }
  chunks.push(current);
  return { chunks, bytes };
}

function parse(raw: string): Manifest {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('Saved sign-in data could not be read. Clear the saved sign-in and sign in again.'); }
  const m = value as Partial<Manifest> | null;
  if (!m || m.version !== 1 || typeof m.generation !== 'string' || !/^[a-z0-9-]{1,80}$/.test(m.generation) ||
      !Number.isInteger(m.count) || m.count! < 1 || m.count! > MAX_CHUNKS ||
      !Number.isInteger(m.bytes) || m.bytes! < 0 || m.bytes! > MAX_BYTES) {
    throw new Error('Saved sign-in data is invalid. Clear the saved sign-in and sign in again.');
  }
  return m as Manifest;
}

/** Stage new encrypted chunks, then switch one index; a failed write retains the previous session. */
export function createChunkedStorage(storage: SecureKeyValueStorage): SecureKeyValueStorage {
  let queue: Promise<void> = Promise.resolve();
  let sequence = 0;
  const indexKey = (key: string) => `cleanos.auth.${key}.index`;
  const chunkKey = (key: string, generation: string, index: number) => `cleanos.auth.${key}.${generation}.${index}`;
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation);
    queue = result.then(() => undefined, () => undefined);
    return result;
  }
  async function clean(key: string, manifest: Manifest) {
    await Promise.allSettled(Array.from({ length: manifest.count }, (_, i) => storage.removeItem(chunkKey(key, manifest.generation, i))));
  }
  return {
    getItem(key) {
      return enqueue(async () => {
        validKey(key);
        const raw = await storage.getItem(indexKey(key));
        if (raw === null) return null;
        const manifest = parse(raw);
        let value = '';
        for (let index = 0; index < manifest.count; index++) {
          const chunk = await storage.getItem(chunkKey(key, manifest.generation, index));
          if (chunk === null || utf8Bytes(chunk) > CHUNK_BYTES) throw new Error('Saved sign-in data is incomplete. Clear the saved sign-in and sign in again.');
          value += chunk;
        }
        if (utf8Bytes(value) !== manifest.bytes) throw new Error('Saved sign-in data is incomplete. Clear the saved sign-in and sign in again.');
        return value;
      });
    },
    setItem(key, value) {
      return enqueue(async () => {
        validKey(key);
        const { chunks, bytes } = split(value);
        const oldRaw = await storage.getItem(indexKey(key));
        const oldManifest = oldRaw === null ? null : parse(oldRaw);
        // This ID separates staged values; it is not an encryption key or credential.
        const generation = `${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
        const manifest: Manifest = { version: 1, generation, count: chunks.length, bytes };
        try {
          for (let index = 0; index < chunks.length; index++) await storage.setItem(chunkKey(key, generation, index), chunks[index]);
          await storage.setItem(indexKey(key), JSON.stringify(manifest));
        } catch (error) {
          await clean(key, manifest);
          throw error;
        }
        if (oldManifest) await clean(key, oldManifest);
      });
    },
    removeItem(key) {
      return enqueue(async () => {
        validKey(key);
        const raw = await storage.getItem(indexKey(key));
        let manifest: Manifest | null = null;
        if (raw !== null) {
          try { manifest = parse(raw); } catch { /* Explicit sign-out can clear a corrupt index. */ }
        }
        await storage.removeItem(indexKey(key));
        if (manifest) await clean(key, manifest);
      });
    },
  };
}
