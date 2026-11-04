import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAction } from './actions';
import { seedState } from './seed';
import { getLowStockItems } from './selectors';
test('desired checklist writes remain idempotent in the isolated demo', () => {
  let state = seedState(new Date('2026-11-04T06:00:00Z'));
  state = applyAction(state, { type: 'login', session: { role: 'admin', staffId: state.staff[0].id } });
  const task = state.tasks[0], item = task.checklist[0];
  const action = { type: 'setChecklistDone' as const, taskId: task.id, itemId: item.id, done: true };
  const once = applyAction(state, action), twice = applyAction(once, action);
  assert.equal(twice.tasks[0].checklist[0].done, true);
  assert.deepEqual(twice, once);
});
test('archived products do not trigger replenishment alerts', () => {
  const state = seedState(new Date('2026-11-04T06:00:00Z'));
  state.inventory = state.inventory.map((item, index) => ({ ...item, quantity: 0, threshold: 1, active: index !== 0 }));
  assert.equal(getLowStockItems(state).length, state.inventory.length - 1);
  assert.ok(!getLowStockItems(state).some(item => item.id === state.inventory[0].id));
});
