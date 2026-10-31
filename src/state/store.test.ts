import assert from 'node:assert/strict';
import test from 'node:test';
import { seedState, type AppState, type StockMovement } from '../domain';
import { createStorageRepository, STORAGE_KEY, type StateRepository } from '../data/repository';
import { createAppStore } from './store';

const NOW = new Date('2026-10-31T08:30:00.000Z');

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

function signedInState() {
  const state = seedState(NOW);
  state.onboardingDone = true;
  state.session = { role: 'admin', staffId: state.staff[0].id };
  return state;
}

function movement(state: AppState, id: string, quantity: number, type: 'in' | 'out' = 'in'): StockMovement {
  return {
    id, itemId: state.inventory[0].id, type, quantity,
    note: 'Store concurrency test', createdAt: NOW.toISOString(),
  };
}

test('overlapping mutations wait for persistence and use the last committed stock quantity', async () => {
  const initial = signedInState();
  let persisted = structuredClone(initial);
  const firstWriteStarted = deferred();
  const releaseFirstWrite = deferred();
  const snapshots: AppState[] = [];
  const repository: StateRepository = {
    async load() { return structuredClone(persisted); },
    async save(state) {
      snapshots.push(structuredClone(state));
      if (snapshots.length === 1) {
        firstWriteStarted.resolve();
        await releaseFirstWrite.promise;
      }
      persisted = structuredClone(state);
    },
  };
  const store = createAppStore(repository);
  await store.load();
  const committedBeforeWrite = store.getState();
  const first = store.act({ type: 'recordStock', movement: movement(initial, 'overlap-in', 3) });
  await firstWriteStarted.promise;
  const second = store.act({ type: 'recordStock', movement: movement(initial, 'overlap-out', 2, 'out') });

  assert.strictEqual(store.getState(), committedBeforeWrite, 'uncommitted quantities must stay hidden');
  assert.equal(snapshots.length, 1, 'the second save must wait for the first');
  releaseFirstWrite.resolve();
  await Promise.all([first, second]);

  assert.equal(store.getState()!.inventory[0].quantity, initial.inventory[0].quantity + 1);
  assert.equal(persisted.inventory[0].quantity, initial.inventory[0].quantity + 1);
  assert.equal(snapshots[1].inventory[0].quantity, initial.inventory[0].quantity + 1);
  assert.deepEqual(persisted.movements.slice(-2).map((entry) => entry.id), ['overlap-in', 'overlap-out']);
});

test('failed saves leave published state unchanged and a later retry succeeds', async () => {
  const initial = signedInState();
  let persisted = structuredClone(initial);
  let failNextSave = true;
  const repository: StateRepository = {
    async load() { return structuredClone(persisted); },
    async save(state) {
      if (failNextSave) { failNextSave = false; throw new Error('Disk full'); }
      persisted = structuredClone(state);
    },
  };
  const store = createAppStore(repository);
  await store.load();
  const published: AppState[] = [];
  const unsubscribe = store.subscribe((state) => published.push(state));
  const before = store.getState();
  const action = { type: 'recordStock' as const, movement: movement(initial, 'retry-stock', 4) };

  await assert.rejects(store.act(action), /Disk full/);
  assert.strictEqual(store.getState(), before);
  assert.deepEqual(persisted, initial);
  assert.equal(published.length, 0, 'subscribers must not receive a rejected write');

  await store.act(action);
  assert.equal(store.getState()!.inventory[0].quantity, initial.inventory[0].quantity + 4);
  assert.equal(persisted.movements.filter((entry) => entry.id === 'retry-stock').length, 1);
  assert.equal(published.length, 1);
  unsubscribe();
  await store.act({ type: 'logout' });
  assert.equal(published.length, 1, 'unsubscribed listeners must stop receiving state');
});

test('corrupt saved data is preserved until an explicit reset is requested', async () => {
  const corrupt = '{broken saved work';
  let raw: string | null = corrupt;
  let writes = 0;
  const repository = createStorageRepository({
    async getItem(key) { assert.equal(key, STORAGE_KEY); return raw; },
    async setItem(key, value) { assert.equal(key, STORAGE_KEY); writes++; raw = value; },
  });
  const store = createAppStore(repository);

  await assert.rejects(store.load(), /Saved demo data could not be read/);
  assert.equal(store.getState(), null);
  assert.equal(raw, corrupt);
  assert.equal(writes, 0);
  await assert.rejects(store.act({ type: 'completeOnboarding' }), /still loading/);
  assert.equal(raw, corrupt);
  assert.equal(writes, 0);

  await store.reset();
  assert.equal(writes, 1);
  assert.equal(store.getState()!.version, 1);
  assert.equal(store.getState()!.onboardingDone, false);
  assert.equal(store.getState()!.session, null);
  assert.deepEqual(await repository.load(), store.getState());
});

test('an empty installation persists its seed before publishing it', async () => {
  const saveStarted = deferred();
  const releaseSave = deferred();
  let saved: AppState | null = null;
  let writes = 0;
  const store = createAppStore({
    async load() { return null; },
    async save(state) {
      writes++;
      saveStarted.resolve();
      await releaseSave.promise;
      saved = structuredClone(state);
    },
  });
  const loading = store.load();
  await saveStarted.promise;
  assert.equal(store.getState(), null);
  assert.equal(writes, 1);
  releaseSave.resolve();
  await loading;

  const state = store.getState()!;
  assert.equal(state.version, 1);
  assert.equal(state.onboardingDone, false);
  assert.equal(state.session, null);
  assert.ok(state.tasks.length > 0);
  assert.ok(state.inventory.length > 0);
  assert.deepEqual(saved, state);
});

test('loading existing work does not reseed or write, while explicit reset replaces it', async () => {
  const existing = signedInState();
  existing.inventory[0].threshold = 91;
  let persisted = structuredClone(existing);
  let writes = 0;
  const store = createAppStore({
    async load() { return structuredClone(persisted); },
    async save(state) { writes++; persisted = structuredClone(state); },
  });
  await store.load();
  assert.equal(writes, 0);
  assert.deepEqual(store.getState(), existing);
  assert.equal(store.getState()!.inventory[0].threshold, 91);

  await store.reset();
  assert.equal(writes, 1);
  assert.equal(persisted.onboardingDone, false);
  assert.equal(persisted.session, null);
  assert.notEqual(persisted.inventory[0].threshold, 91);
  assert.deepEqual(store.getState(), persisted);
});
