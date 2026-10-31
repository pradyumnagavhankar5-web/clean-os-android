import assert from 'node:assert/strict';
import test from 'node:test';
import { seedState } from '../domain';
import { createStorageRepository, STORAGE_KEY } from './repository';

const NOW = new Date('2026-10-31T08:30:00.000Z');

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    async getItem(key: string) { return values.get(key) ?? null; },
    async setItem(key: string, value: string) { values.set(key, value); },
  };
}

test('local storage returns no data initially and round-trips a valid snapshot', async () => {
  const storage = memoryStorage();
  const repository = createStorageRepository(storage);
  assert.equal(await repository.load(), null);
  const state = seedState(NOW);
  await repository.save(state);
  assert.ok(storage.values.has(STORAGE_KEY));
  assert.deepEqual(await repository.load(), state);
});

test('malformed or invalid persisted JSON rejects without silently deleting demo work', async () => {
  for (const raw of ['not json', '{"version":2}', 'null']) {
    const storage = memoryStorage();
    storage.values.set(STORAGE_KEY, raw);
    await assert.rejects(createStorageRepository(storage).load());
    assert.equal(storage.values.get(STORAGE_KEY), raw);
  }
});

test('invalid snapshots are rejected before a storage write', async () => {
  const storage = memoryStorage();
  const repository = createStorageRepository(storage);
  const state = seedState(NOW);
  state.inventory[0].quantity = -5;
  await assert.rejects(async () => repository.save(state));
  assert.equal(storage.values.size, 0);
});

test('storage read failures are surfaced for the UI to offer retry', async () => {
  const repository = createStorageRepository({
    async getItem() { throw new Error('Storage unavailable'); },
    async setItem() {},
  });
  await assert.rejects(repository.load());
});

test('queued saves preserve call order and snapshot the state at save time', async () => {
  const values = new Map<string, string>();
  let unblock!: () => void;
  let resolveStarted!: () => void;
  let firstWrite = true;
  const started = new Promise<void>((resolve) => { resolveStarted = resolve; });
  const storage = {
    async getItem(key: string) { return values.get(key) ?? null; },
    async setItem(key: string, value: string) {
      if (firstWrite) {
        firstWrite = false;
        resolveStarted();
        await new Promise<void>((resolve) => { unblock = resolve; });
      }
      values.set(key, value);
    },
  };
  const repository = createStorageRepository(storage);
  const first = seedState(NOW);
  const firstSave = repository.save(first);
  const second = structuredClone(first);
  second.onboardingDone = true;
  const secondSave = repository.save(second);
  second.onboardingDone = false;
  await started;
  unblock();
  await Promise.all([firstSave, secondSave]);
  assert.equal(JSON.parse(values.get(STORAGE_KEY)!).onboardingDone, true);
});

test('a failed write rejects to its caller and does not poison subsequent saves', async () => {
  const storage = memoryStorage();
  let fail = true;
  const repository = createStorageRepository({
    getItem: storage.getItem,
    async setItem(key: string, value: string) {
      if (fail) { fail = false; throw new Error('Disk full'); }
      await storage.setItem(key, value);
    },
  });
  await assert.rejects(repository.save(seedState(NOW)));
  const next = seedState(NOW);
  next.onboardingDone = true;
  await repository.save(next);
  assert.equal((await repository.load())?.onboardingDone, true);
});
