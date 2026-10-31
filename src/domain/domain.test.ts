import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyAction,
  canManageInventory,
  canManageTasks,
  canUpdateTask,
  dashboardMetrics,
  dateKey,
  formatDate,
  formatINR,
  getLowStockItems,
  getVisibleTasks,
  isDateKey,
  seedState,
  validateState,
} from './index';
import type { AppState, StockMovement, Task } from './types';

const NOW = new Date('2026-10-31T08:30:00.000Z');

function fixture(): AppState {
  const state = seedState(NOW);
  state.session = { role: 'admin', staffId: state.staff[0].id };
  state.tasks = [];
  state.movements = [];
  return state;
}

function taskFor(state: AppState, overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-test', title: 'Clean reception', facilityId: state.facilities[0].id,
    areaId: state.facilities[0].areas[0].id, assigneeId: state.staff[0].id,
    dueDate: dateKey(NOW), priority: 'medium', status: 'pending', notes: '',
    checklist: [
      { id: 'sweep', label: 'Sweep floor', done: false },
      { id: 'mop', label: 'Mop with floor cleaner', done: false },
    ],
    ...overrides,
  };
}

function movementFor(state: AppState, overrides: Partial<StockMovement> = {}): StockMovement {
  return {
    id: 'move-test', itemId: state.inventory[0].id, type: 'in', quantity: 2,
    note: 'Delivery received', createdAt: NOW.toISOString(), ...overrides,
  };
}

test('Kolkata calendar dates change at 18:30 UTC, including year boundaries', () => {
  assert.equal(dateKey(new Date('2026-12-31T18:29:59.999Z')), '2026-12-31');
  assert.equal(dateKey(new Date('2026-12-31T18:30:00.000Z')), '2027-01-01');
  assert.equal(dateKey(new Date('2026-10-30T18:30:00.000Z')), '2026-10-31');
  assert.throws(() => dateKey(new Date('invalid')));
});

test('date validation rejects impossible days and formatting uses Indian conventions', () => {
  assert.equal(isDateKey('2028-02-29'), true);
  for (const value of ['2026-02-29', '2026-04-31', '2026-13-01', '31/10/2026', '2026-1-01', null]) {
    assert.equal(isDateKey(value), false, String(value));
  }
  assert.match(formatDate('2026-10-31'), /31.*Oct.*2026/);
  assert.match(formatINR(123456.5), /₹.*1,23,456\.50/);
});

test('seed data is valid, unauthenticated and relative to the supplied Indian date', () => {
  const state = seedState(NOW);
  assert.deepEqual(validateState(state), state);
  assert.equal(state.session, null);
  assert.equal(state.tasks.length, 8);
  assert.ok(state.inventory.length >= 7);
  assert.ok(state.tasks.some((task) => task.dueDate === '2026-10-31'));
  assert.ok(state.tasks.some((task) => task.status === 'completed'));
  assert.ok(state.tasks.some((task) => task.status === 'pending'));
  assert.ok(state.tasks.some((task) => task.status === 'in_progress'));
  assert.equal(seedState(new Date('2026-10-31T18:30:00Z')).tasks.some((task) => task.dueDate === '2026-11-01'), true);
});

test('demo role selection validates staff membership and logout clears the session', () => {
  const state = seedState(NOW);
  const selected = applyAction(state, {
    type: 'login', session: { role: 'staff', staffId: state.staff[0].id },
  });
  assert.equal(selected.session?.role, 'staff');
  assert.equal(state.session, null);
  assert.equal(applyAction(selected, { type: 'logout' }).session, null);
  assert.throws(() => applyAction(state, { type: 'login', session: { role: 'staff', staffId: 'missing' } }));
});

test('admin can create, assign and edit a task without mutating the prior snapshot', () => {
  const before = fixture();
  const task = taskFor(before);
  const created = applyAction(before, { type: 'saveTask', task });
  const edited = applyAction(created, {
    type: 'saveTask', task: { ...task, title: 'Deep clean reception', assigneeId: before.staff[1].id, priority: 'high' },
  });
  assert.equal(before.tasks.length, 0);
  assert.equal(created.tasks[0].title, 'Clean reception');
  assert.equal(edited.tasks.length, 1);
  assert.equal(edited.tasks[0].title, 'Deep clean reception');
  assert.equal(edited.tasks[0].assigneeId, before.staff[1].id);
  assert.equal(edited.tasks[0].priority, 'high');
});

test('completion requires every checklist item, and undoing a completed item reopens the task', () => {
  let state = fixture();
  const task = taskFor(state);
  state = applyAction(state, { type: 'saveTask', task });
  assert.throws(() => applyAction(state, { type: 'setTaskStatus', taskId: task.id, status: 'completed' }));
  state = applyAction(state, { type: 'toggleChecklist', taskId: task.id, itemId: 'sweep' });
  assert.throws(() => applyAction(state, { type: 'setTaskStatus', taskId: task.id, status: 'completed' }));
  state = applyAction(state, { type: 'toggleChecklist', taskId: task.id, itemId: 'mop' });
  const completed = applyAction(state, { type: 'setTaskStatus', taskId: task.id, status: 'completed' });
  assert.equal(completed.tasks[0].status, 'completed');
  const reopened = applyAction(completed, { type: 'toggleChecklist', taskId: task.id, itemId: 'mop' });
  assert.equal(reopened.tasks[0].status, 'in_progress');
  assert.equal(reopened.tasks[0].checklist[1].done, false);
  assert.equal(completed.tasks[0].checklist[1].done, true);
});

test('staff can update only their assigned checklist and status', () => {
  const state = fixture();
  const own = taskFor(state);
  const another = taskFor(state, { id: 'another', assigneeId: state.staff[1].id });
  state.tasks = [own, another];
  state.session = { role: 'staff', staffId: own.assigneeId };
  assert.equal(canManageTasks(state.session), false);
  assert.equal(canManageInventory(state.session), false);
  assert.equal(canUpdateTask(state.session, own), true);
  assert.equal(canUpdateTask(state.session, another), false);
  assert.deepEqual(getVisibleTasks(state).map((task) => task.id), [own.id]);
  assert.equal(applyAction(state, { type: 'setTaskStatus', taskId: own.id, status: 'in_progress' }).tasks[0].status, 'in_progress');
  assert.equal(applyAction(state, { type: 'toggleChecklist', taskId: own.id, itemId: 'sweep' }).tasks[0].checklist[0].done, true);
  assert.throws(() => applyAction(state, { type: 'setTaskStatus', taskId: another.id, status: 'in_progress' }));
  assert.throws(() => applyAction(state, { type: 'toggleChecklist', taskId: another.id, itemId: 'sweep' }));
  assert.throws(() => applyAction(state, { type: 'saveTask', task: { ...own, title: 'Changed' } }));
  assert.throws(() => applyAction(state, { type: 'recordStock', movement: movementFor(state) }));
  assert.throws(() => applyAction(state, { type: 'setThreshold', itemId: state.inventory[0].id, threshold: 5 }));
});

test('supervisors manage operations while signed-out users cannot mutate operations', () => {
  const state = fixture();
  state.session = { role: 'supervisor', staffId: state.staff[0].id };
  assert.equal(canManageTasks(state.session), true);
  assert.equal(canManageInventory(state.session), true);
  assert.equal(applyAction(state, { type: 'saveTask', task: taskFor(state) }).tasks.length, 1);
  const signedOut = { ...state, session: null };
  assert.equal(canManageTasks(null), false);
  assert.equal(canManageInventory(null), false);
  assert.throws(() => applyAction(signedOut, { type: 'saveTask', task: taskFor(state) }));
  assert.throws(() => applyAction(signedOut, { type: 'recordStock', movement: movementFor(state) }));
});

test('stock-in and stock-out atomically change quantity and append an audit record', () => {
  const before = fixture();
  before.inventory[0].quantity = 10;
  const received = applyAction(before, { type: 'recordStock', movement: movementFor(before, { quantity: 2.5 }) });
  const issued = applyAction(received, {
    type: 'recordStock', movement: movementFor(received, { id: 'issue', type: 'out', quantity: 1.25, note: 'Lobby cleaning' }),
  });
  assert.equal(before.inventory[0].quantity, 10);
  assert.equal(before.movements.length, 0);
  assert.equal(received.inventory[0].quantity, 12.5);
  assert.equal(issued.inventory[0].quantity, 11.25);
  assert.deepEqual(issued.movements.map((movement) => movement.id).sort(), ['issue', 'move-test']);
  assert.equal(issued.movements.find((movement) => movement.id === 'issue')?.note, 'Lobby cleaning');
});

test('invalid quantities and overdrafts fail without altering inventory or ledger', () => {
  const state = fixture();
  state.inventory[0].quantity = 3;
  const snapshot = JSON.stringify(state);
  for (const quantity of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => applyAction(state, { type: 'recordStock', movement: movementFor(state, { quantity }) }));
  }
  assert.throws(() => applyAction(state, { type: 'recordStock', movement: movementFor(state, { type: 'out', quantity: 3.1 }) }));
  assert.throws(() => applyAction(state, { type: 'recordStock', movement: movementFor(state, { itemId: 'missing' }) }));
  assert.equal(JSON.stringify(state), snapshot);
  const emptied = applyAction(state, { type: 'recordStock', movement: movementFor(state, { type: 'out', quantity: 3 }) });
  assert.equal(emptied.inventory[0].quantity, 0);
});

test('duplicate stock IDs cannot apply the same movement twice', () => {
  const state = fixture();
  const movement = movementFor(state);
  const received = applyAction(state, { type: 'recordStock', movement });
  assert.throws(() => applyAction(received, { type: 'recordStock', movement }));
});

test('stock movements preserve small quantities and reject amounts below representable precision', () => {
  const state = fixture();
  state.inventory[0].quantity = 1;
  const small = movementFor(state, { quantity: 0.0000001 });
  const received = applyAction(state, { type: 'recordStock', movement: small });
  assert.equal(received.inventory[0].quantity, 1.0000001);
  assert.equal(received.movements[0].quantity, 0.0000001);
  assert.throws(() => applyAction(state, {
    type: 'recordStock', movement: movementFor(state, { quantity: Number.MIN_VALUE }),
  }));
  assert.equal(state.inventory[0].quantity, 1);
  assert.equal(state.movements.length, 0);
});

test('thresholds are configurable and equality triggers a low stock warning', () => {
  const state = fixture();
  state.inventory = state.inventory.slice(0, 1);
  state.inventory[0].quantity = 5;
  const atThreshold = applyAction(state, { type: 'setThreshold', itemId: state.inventory[0].id, threshold: 5 });
  assert.equal(getLowStockItems(atThreshold).length, 1);
  const belowThreshold = applyAction(atThreshold, { type: 'setThreshold', itemId: state.inventory[0].id, threshold: 4 });
  assert.equal(getLowStockItems(belowThreshold).length, 0);
  for (const threshold of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => applyAction(state, { type: 'setThreshold', itemId: state.inventory[0].id, threshold }));
  }
});

test('dashboard metrics use current tasks, Indian today, and role visibility', () => {
  const state = fixture();
  state.tasks = [
    taskFor(state),
    taskFor(state, { id: 'done', status: 'completed', checklist: [{ id: 'done-step', label: 'Done', done: true }] }),
    taskFor(state, { id: 'started', status: 'in_progress' }),
    taskFor(state, { id: 'old', dueDate: '2026-10-30' }),
    taskFor(state, { id: 'future', dueDate: '2026-11-01' }),
    taskFor(state, { id: 'other', assigneeId: state.staff[1].id }),
  ];
  state.inventory = state.inventory.slice(0, 2).map((item, index) => ({ ...item, quantity: index === 0 ? 0 : 10, threshold: 1 }));
  const metrics = dashboardMetrics(state, NOW);
  assert.equal(metrics.today, '2026-10-31');
  assert.equal(metrics.totalToday, 4);
  assert.equal(metrics.completedToday, 1);
  assert.equal(metrics.pendingToday, 3);
  assert.equal(metrics.completionPercent, 25);
  assert.equal(metrics.lowStockCount, 1);
  state.session = { role: 'staff', staffId: state.staff[0].id };
  const scoped = dashboardMetrics(state, NOW);
  assert.equal(scoped.totalToday, 3);
  assert.equal(scoped.completedToday, 1);
  assert.equal(scoped.pendingToday, 2);
});

test('an empty dashboard reports zero completion without NaN', () => {
  const state = fixture();
  state.inventory = [];
  const metrics = dashboardMetrics(state, NOW);
  assert.equal(metrics.totalToday, 0);
  assert.equal(metrics.completionPercent, 0);
  assert.equal(metrics.lowStockCount, 0);
});

test('persisted-state validation rejects corruption and broken references', () => {
  const state = seedState(NOW);
  const corruptions: ((copy: AppState) => void)[] = [
    (copy) => { copy.version = 2 as 1; },
    (copy) => { copy.tasks[0].assigneeId = 'missing'; },
    (copy) => { copy.tasks[0].facilityId = 'missing'; },
    (copy) => { copy.tasks[0].areaId = 'missing'; },
    (copy) => { copy.tasks[0].dueDate = '2026-02-30'; },
    (copy) => { copy.tasks[0].priority = 'urgent' as Task['priority']; },
    (copy) => { copy.inventory[0].quantity = -1; },
    (copy) => { copy.staff.push({ ...copy.staff[0] }); },
    (copy) => { copy.session = { role: 'staff', staffId: 'missing' }; },
    (copy) => { copy.movements = [movementFor(copy, { itemId: 'missing' })]; },
    (copy) => { copy.tasks[0].status = 'completed'; copy.tasks[0].checklist[0].done = false; },
  ];
  for (const corrupt of corruptions) {
    const copy = structuredClone(state);
    corrupt(copy);
    assert.throws(() => validateState(copy));
  }
  for (const input of [null, [], {}, { version: 1 }, 'not an object']) {
    assert.throws(() => validateState(input));
  }
});

test('task edits reject foreign areas and invalid calendar dates', () => {
  const state = fixture();
  assert.throws(() => applyAction(state, { type: 'saveTask', task: taskFor(state, { areaId: 'missing' }) }));
  assert.throws(() => applyAction(state, { type: 'saveTask', task: taskFor(state, { dueDate: '2026-02-30' }) }));
  assert.throws(() => applyAction(state, { type: 'saveTask', task: taskFor(state, { title: '   ' }) }));
  assert.throws(() => applyAction(state, { type: 'setTaskStatus', taskId: 'missing', status: 'in_progress' }));
});
