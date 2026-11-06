import test from 'node:test';
import assert from 'node:assert/strict';
import { createCloudStore } from './store';
import type { CloudRepository } from './repository';
import type { WorkspaceSnapshot } from './types';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function snapshot(org: string, user: string, revision = 1): WorkspaceSnapshot {
  return { workspace: { id: org, name: org, role: 'admin', memberId: user, inventoryMode: 'shared' }, locations: [{ id: 'main', name: 'Main store', facilityId: null, active: true }], locationId: 'main',
    state: { version: 1, onboardingDone: true, session: { role: 'admin', staffId: user }, facilities: [], tasks: [], movements: [],
      staff: [{ id: user, name: user, role: 'admin', active: true, revision }], inventory: [] } };
}
function repository(load: (org: string) => Promise<WorkspaceSnapshot>) {
  return { checkSchema: async () => undefined, listWorkspaces: async () => [], loadWorkspace: load } as unknown as CloudRepository;
}
test('a late workspace response cannot publish another account’s records after sign-out', async () => {
  const old = deferred<WorkspaceSnapshot>();
  const store = createCloudStore(repository(org => org === 'a' ? old.promise : Promise.resolve(snapshot('b', 'user-b'))));
  await store.setUser('user-a');
  const opening = store.chooseWorkspace('a');
  await store.setUser('user-b');
  await store.chooseWorkspace('b');
  old.resolve(snapshot('a', 'user-a'));
  await opening;
  assert.equal(store.getState().snapshot?.workspace.id, 'b');
  assert.equal(store.getState().snapshot?.workspace.memberId, 'user-b');
});
test('sign-out discards queued writes before they can reach the previous workspace', async () => {
  const store = createCloudStore(repository(async org => snapshot(org, 'user-a')));
  await store.setUser('user-a'); await store.chooseWorkspace('a');
  const inFlight = deferred<void>();
  let sent = 0;
  const first = store.run(async () => { sent++; await inFlight.promise; });
  await Promise.resolve();
  const second = store.run(async () => { sent++; });
  const rejected = assert.rejects(second, /account or workspace changed/);
  await store.setUser(null);
  inFlight.resolve(); await first; await rejected;
  assert.equal(sent, 1); assert.equal(store.getState().snapshot, null); assert.equal(store.getState().pending, 0);
});
test('overlapping refreshes publish only the most recent requested server view', async () => {
  const one = deferred<WorkspaceSnapshot>(), two = deferred<WorkspaceSnapshot>();
  let reads = 0;
  const store = createCloudStore(repository(async org => ++reads === 1 ? snapshot(org, 'user-a') : reads === 2 ? one.promise : two.promise));
  await store.setUser('user-a'); await store.chooseWorkspace('a');
  const first = store.refresh(), second = store.refresh();
  two.resolve(snapshot('a', 'user-a', 3)); await second;
  one.resolve(snapshot('a', 'user-a', 2)); await first;
  assert.equal(store.getState().snapshot?.state.staff[0].revision, 3);
});
test('an unconfirmed save refreshes canonical server state without optimistic local mutation', async () => {
  let revision = 1;
  const store = createCloudStore(repository(async org => snapshot(org, 'user-a', revision)));
  await store.setUser('user-a'); await store.chooseWorkspace('a');
  await assert.rejects(store.run(async () => { revision = 2; throw new Error('Response lost after server commit'); }), /Response lost/);
  assert.equal(store.getState().snapshot?.state.staff[0].revision, 2);
  assert.equal(store.getState().pending, 0);
});
test('switching stock rooms keeps navigation data mounted until the new balance is confirmed', { timeout: 1000 }, async () => {
  const next = deferred<WorkspaceSnapshot>();
  let reads = 0;
  const store = createCloudStore(repository(async org => ++reads === 1 ? snapshot(org, 'user-a') : next.promise));
  await store.setUser('user-a'); await store.chooseWorkspace('a');
  const loading = store.selectLocation('site');
  assert.equal(store.getState().snapshot?.locationId, 'main');
  assert.equal(store.getState().loading, true);
  await store.refresh();
  assert.equal(reads, 2, 'background refresh must not reload the old room during a switch');
  await assert.rejects(store.run(async () => undefined), /Wait until/);
  const updated = snapshot('a', 'user-a');
  updated.locationId = 'site';
  updated.locations.push({ id: 'site', name: 'Facility stock', facilityId: null, active: true });
  next.resolve(updated); await loading;
  assert.equal(store.getState().snapshot?.locationId, 'site');
  assert.equal(store.getState().loading, false);
});
