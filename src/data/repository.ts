import { validateState } from '../domain/validation';
import type { AppState } from '../domain/types';

export const STORAGE_KEY = '@cleanos/demo-state/v1';

/** Future data adapters should expose this boundary without coupling screens to a vendor. */
export interface StateRepository {
  load(): Promise<AppState | null>;
  save(state: AppState): Promise<void>;
}

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export function createStorageRepository(storage: KeyValueStorage): StateRepository {
  let writeQueue: Promise<void> = Promise.resolve();
  return {
    async load() {
      await writeQueue;
      const raw = await storage.getItem(STORAGE_KEY);
      if (raw === null) return null;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error('Saved demo data could not be read. Retry or explicitly reset the demo in recovery.');
      }
      try {
        return validateState(parsed);
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Invalid data.';
        throw new Error(`Saved demo data is invalid. ${reason} Retry or explicitly reset the demo in recovery.`);
      }
    },
    save(state) {
      // Snapshot before queuing: later caller mutations must not alter this write.
      let serialized: string;
      try {
        serialized = JSON.stringify(validateState(state));
      } catch (error) {
        return Promise.reject(error);
      }
      const write = writeQueue.then(() => storage.setItem(STORAGE_KEY, serialized));
      // Keep subsequent writes usable after a storage failure while rejecting this caller.
      writeQueue = write.catch(() => undefined);
      return write;
    },
  };
}
