import assert from 'node:assert/strict';
import test from 'node:test';
import type { StockMovement, Task } from '../domain';
import { CloudRepositoryError, createCloudRepository, decodeWorkspace, type CloudRpcClient } from './repository';
import type { ProductDraft, WorkspaceSnapshot } from './types';

const ORG = 'org-a';
const MEMBER = 'member-admin';
function snapshot(): WorkspaceSnapshot {
  return {
    workspace: { id: ORG, name: 'Aura', memberId: MEMBER, role: 'admin', inventoryMode: 'shared' },
    locations: [{ id: 'main', name: 'Main store', facilityId: null, active: true }],
    locationId: 'main',
    state: {
      version: 1, onboardingDone: true, session: { role: 'admin', staffId: MEMBER },
      staff: [
        { id: MEMBER, name: 'Admin', role: 'admin', active: true, revision: 2 },
        { id: 'former-staff', name: 'Former member', role: 'staff', active: false, revision: 4 },
      ],
      facilities: [{ id: 'facility-a', name: 'Office', type: 'Office', address: 'Pune', active: true, revision: 3,
        areas: [{ id: 'area-a', name: 'Lobby', active: true }, { id: 'old-area', name: 'Old pantry', active: false }] }],
      tasks: [{ id: 'task-a', title: 'Clean lobby', facilityId: 'facility-a', areaId: 'area-a', assigneeId: MEMBER,
        dueDate: '2026-11-04', priority: 'medium', status: 'pending', checklist: [{ id: 'step-a', label: 'Mop floor', done: false }], notes: '', revision: 7 }],
      inventory: [{ id: 'product-a', name: 'Tissues', category: 'Paper', unit: 'rolls', quantity: 0, threshold: 2, unitPrice: 10,
        active: false, revision: 5, balanceRevision: 6 }],
      movements: [{ id: 'movement-a', itemId: 'product-a', type: 'out', quantity: 1, note: '', createdAt: '2026-11-04T01:00:00Z', locationId: 'main' }],
    },
  };
}
function transport(responses: { data: unknown; error: { code?: string; message?: string; status?: number } | null }[] = []) {
  const calls: { name: string; parameters: Record<string, unknown> | undefined }[] = [];
  const client: CloudRpcClient = {
    async rpc(name, parameters) {
      calls.push({ name, parameters: structuredClone(parameters) });
      return responses.shift() ?? { data: null, error: null };
    },
  };
  return { client, calls, repository: createCloudRepository(client) };
}

test('workspace reads are tenant/location scoped and preserve canonical revision and inactive history metadata', async () => {
  const source = snapshot();
  const { repository, calls } = transport([{ data: source, error: null }]);
  const result = await repository.loadWorkspace(ORG, 'main');
  assert.deepEqual(calls, [{ name: 'cleanos_workspace', parameters: { p_org_id: ORG, p_location_id: 'main' } }]);
  assert.equal(result.state.tasks[0].revision, 7);
  assert.equal(result.state.inventory[0].balanceRevision, 6);
  assert.equal(result.state.staff[1].active, false);
  assert.equal(result.state.facilities[0].areas[1].active, false);
  source.state.tasks[0].title = 'Mutation after response';
  assert.equal(result.state.tasks[0].title, 'Clean lobby');
});

test('decoder rejects cross-tenant, mismatched identity, stale schema and mixed-location snapshots', () => {
  const modifications: ((value: WorkspaceSnapshot) => void)[] = [
    value => { value.workspace.id = 'org-b'; },
    value => { value.state.session!.role = 'staff'; },
    value => { value.state.session!.staffId = 'former-staff'; },
    value => { value.state.staff[0].active = false; },
    value => { value.state.onboardingDone = false; },
    value => { value.state.tasks[0].revision = undefined; },
    value => { value.state.inventory[0].balanceRevision = -1; },
    value => { value.state.movements[0].locationId = 'other-store'; },
    value => { value.locations[0].active = false; },
    value => { value.locations.push({ ...value.locations[0] }); },
  ];
  for (const mutate of modifications) {
    const value = snapshot(); mutate(value);
    assert.throws(() => decodeWorkspace(value, ORG, 'main'), (error: unknown) => error instanceof CloudRepositoryError && error.kind === 'setup');
  }
  assert.throws(() => decodeWorkspace(snapshot(), ORG, 'another-location'));
});

test('staff read models reject another member’s task even if the rest of the snapshot is valid', () => {
  const value = snapshot();
  value.workspace.role = 'staff'; value.state.session!.role = 'staff'; value.state.staff[0].role = 'staff';
  value.state.tasks[0].assigneeId = 'former-staff';
  assert.throws(() => decodeWorkspace(value, ORG));
  value.state.tasks[0].assigneeId = MEMBER;
  assert.equal(decodeWorkspace(value, ORG).state.tasks.length, 1);
});

test('stock retry preserves its idempotency ID and excludes client timestamps and replacement balances', async () => {
  const { repository, calls } = transport();
  const movement: StockMovement = { id: 'stable-request-a', itemId: 'product-a', type: 'out', quantity: 2.5, note: 'Lobby issue', createdAt: '1999-01-01T00:00:00Z' };
  await repository.recordStock(ORG, 'main', movement);
  await repository.recordStock(ORG, 'main', movement);
  assert.deepEqual(calls[0], calls[1]);
  assert.deepEqual(calls[0], { name: 'cleanos_record_stock', parameters: {
    p_org_id: ORG, p_location_id: 'main', p_product_id: 'product-a', p_direction: 'out', p_quantity: 2.5, p_note: 'Lobby issue', p_request_id: 'stable-request-a',
  } });
});

test('task writes carry the editor revision and checklist writes express a desired state, never a toggle', async () => {
  const { repository, calls } = transport();
  const task = snapshot().state.tasks[0] as Task;
  await repository.saveTask(ORG, task);
  await repository.setChecklistDone(ORG, task.id, 'step-a', true, task.revision);
  await repository.setTaskStatus(ORG, task.id, 'completed', task.revision);
  assert.equal(calls[0].parameters?.p_expected_revision, 7);
  assert.equal(Object.hasOwn(calls[0].parameters!.p_task as object, 'revision'), false);
  assert.deepEqual(calls[1], { name: 'cleanos_set_checklist_done', parameters: {
    p_org_id: ORG, p_task_id: task.id, p_item_id: 'step-a', p_done: true, p_expected_revision: 7,
  } });
  assert.equal(calls[2].parameters?.p_expected_revision, 7);
  const newTask = { ...task, id: 'new-stable-id', revision: undefined };
  await repository.saveTask(ORG, newTask);
  assert.equal(calls[3].parameters?.p_expected_revision, null);
});

test('catalogue updates send metadata and opening stock separately instead of trusting a client balance', async () => {
  const { repository, calls } = transport();
  const product: ProductDraft & { quantity: number } = { ...snapshot().state.inventory[0], quantity: 999, openingQuantity: 4 };
  await repository.saveProduct(ORG, 'main', product);
  await repository.setThreshold(ORG, 'main', product.id, 3, 6);
  const parameters = calls[0].parameters!;
  assert.equal(parameters.p_expected_revision, 5);
  assert.equal(parameters.p_opening_quantity, 4);
  assert.equal(Object.hasOwn(parameters.p_product as object, 'quantity'), false);
  assert.equal(Object.hasOwn(parameters.p_product as object, 'balanceRevision'), false);
  assert.equal(calls[1].parameters?.p_expected_revision, 6);
  assert.equal(calls[1].parameters?.p_location_id, 'main');
});

test('membership and invitation commands remain organization scoped and normalize only user-entered labels', async () => {
  const { repository, calls } = transport([{ data: 'invite-secret-once', error: null }]);
  assert.equal(await repository.createInvite(ORG, ' Worker@Example.com ', 'staff'), 'invite-secret-once');
  await repository.updateMember(ORG, 'staff-a', ' Worker ', 'supervisor', false, 4);
  await repository.revokeInvite(ORG, 'invite-a');
  await repository.saveFacility(ORG, snapshot().state.facilities[0], true);
  assert.deepEqual(calls[0].parameters, { p_org_id: ORG, p_email: 'worker@example.com', p_role: 'staff' });
  assert.deepEqual(calls[1].parameters, { p_org_id: ORG, p_user_id: 'staff-a', p_name: 'Worker', p_role: 'supervisor', p_active: false, p_expected_revision: 4 });
  assert.equal(calls[2].parameters?.p_org_id, ORG);
  assert.equal(calls[3].parameters?.p_expected_revision, 3);
  assert.equal(calls[3].parameters?.p_create_location, true);
});

test('initial setup reads validate schema version and invitation/workspace response shapes', async () => {
  const { repository } = transport([
    { data: 2, error: null },
    { data: [{ id: ORG, name: 'Aura', role: 'admin' }], error: null },
    { data: [{ id: 'invite-a', email: 'worker@example.com', role: 'staff', expiresAt: '2026-11-05T01:00:00Z', usedAt: null }], error: null },
    { data: 99, error: null },
    { data: [{ id: ORG, name: 'Aura', role: 'owner' }], error: null },
  ]);
  await repository.checkSchema();
  assert.equal((await repository.listWorkspaces())[0].role, 'admin');
  assert.equal((await repository.listInvites(ORG))[0].usedAt, null);
  await assert.rejects(() => repository.checkSchema(), (error: unknown) => error instanceof CloudRepositoryError && error.kind === 'setup');
  await assert.rejects(() => repository.listWorkspaces(), CloudRepositoryError);
});

test('database failures become bounded user messages without exposing SQL details', async () => {
  const cases = [
    { code: 'PGRST202', message: 'Function not in schema cache', kind: 'setup', contains: /setup/ },
    { code: '40001', message: 'revision mismatch', kind: 'conflict', contains: /another phone/ },
    { code: '42501', message: 'not allowed', kind: 'access', contains: /permission/ },
    { code: '42501', message: 'Sign in with a verified email address.', kind: 'access', contains: /Confirm your email/ },
    { code: '22023', message: 'Stock out cannot exceed available quantity', kind: 'validation', contains: /available quantity/ },
    { code: 'P0001', message: 'last active admin', kind: 'validation', contains: /one active/ },
    { code: 'P0001', message: 'request payload mismatch', kind: 'conflict', contains: /stock history/ },
    { code: 'XX000', message: 'private internal SQL secret value', kind: 'unknown', contains: /Could not complete/ },
  ];
  for (const item of cases) {
    const { repository } = transport([{ data: null, error: item }]);
    await assert.rejects(() => repository.setThreshold(ORG, 'main', 'product-a', 3), (error: unknown) => {
      assert.ok(error instanceof CloudRepositoryError);
      assert.equal(error.kind, item.kind); assert.match(error.message, item.contains);
      assert.doesNotMatch(error.message, /private internal|SQL secret/);
      return true;
    });
  }
});

test('network exceptions retain a retryable connection category', async () => {
  const repository = createCloudRepository({ rpc() { throw new TypeError('fetch failed: internal socket details'); } });
  await assert.rejects(() => repository.listWorkspaces(), (error: unknown) => {
    assert.ok(error instanceof CloudRepositoryError);
    assert.equal(error.kind, 'connection');
    assert.match(error.message, /internet connection/);
    assert.doesNotMatch(error.message, /socket details/);
    return true;
  });
});
