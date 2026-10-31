import { isDateKey } from './format';
import type { AppState } from './types';

const fail = (message: string): never => { throw new Error(message); };
const object = (value: unknown, label: string): Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object.`);
  return value as Record<string, unknown>;
};
const list = (value: unknown, label: string): unknown[] => {
  if (!Array.isArray(value)) fail(`${label} must be a list.`);
  return value as unknown[];
};
const text = (value: unknown, label: string, empty = false): string => {
  if (typeof value !== 'string' || (!empty && value.trim().length === 0)) fail(`${label} is required.`);
  return value as string;
};
const flag = (value: unknown, label: string) => {
  if (typeof value !== 'boolean') fail(`${label} must be true or false.`);
};
const number = (value: unknown, label: string, positive = false) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || (positive ? value <= 0 : value < 0)) {
    fail(`${label} must be a ${positive ? 'positive' : 'non-negative'} finite number.`);
  }
};
const oneOf = (value: unknown, options: string[], label: string) => {
  if (typeof value !== 'string' || !options.includes(value)) fail(`${label} is invalid.`);
};
const unique = (ids: string[], label: string) => {
  if (new Set(ids).size !== ids.length) fail(`${label} contains duplicate IDs.`);
};

/** Validate untrusted local snapshots without discarding or repairing user data. */
export function validateState(value: unknown): AppState {
  const state = object(value, 'Saved data');
  if (state.version !== 1) fail('This saved data version is unsupported.');
  flag(state.onboardingDone, 'Onboarding status');
  const staff = list(state.staff, 'Staff').map((entry) => {
    const member = object(entry, 'Staff member');
    return { id: text(member.id, 'Staff ID'), name: text(member.name, 'Staff name') };
  });
  unique(staff.map((member) => member.id), 'Staff');
  const staffIds = new Set(staff.map((member) => member.id));
  const facilities = list(state.facilities, 'Facilities').map((entry) => {
    const facility = object(entry, 'Facility');
    const areas = list(facility.areas, 'Areas').map((areaEntry) => {
      const area = object(areaEntry, 'Area');
      return { id: text(area.id, 'Area ID'), name: text(area.name, 'Area name') };
    });
    unique(areas.map((area) => area.id), 'Areas');
    return {
      id: text(facility.id, 'Facility ID'), name: text(facility.name, 'Facility name'),
      type: text(facility.type, 'Facility type'), address: text(facility.address, 'Facility address'), areas,
    };
  });
  unique(facilities.map((facility) => facility.id), 'Facilities');
  const tasks = list(state.tasks, 'Tasks').map((entry) => {
    const task = object(entry, 'Task');
    text(task.id, 'Task ID'); text(task.title, 'Task title'); text(task.notes, 'Task notes', true);
    text(task.facilityId, 'Task facility'); text(task.areaId, 'Task area'); text(task.assigneeId, 'Task assignee');
    if (!isDateKey(task.dueDate)) fail('Task due date must be a valid YYYY-MM-DD date.');
    oneOf(task.priority, ['low', 'medium', 'high'], 'Task priority');
    oneOf(task.status, ['pending', 'in_progress', 'completed'], 'Task status');
    const facility = facilities.find((item) => item.id === task.facilityId);
    if (!facility || !facility.areas.some((area) => area.id === task.areaId)) fail('Task must reference an existing facility and area.');
    if (!staffIds.has(task.assigneeId as string)) fail('Task must be assigned to an existing staff member.');
    const checklist = list(task.checklist, 'Checklist').map((itemEntry) => {
      const item = object(itemEntry, 'Checklist item');
      text(item.id, 'Checklist ID'); text(item.label, 'Checklist label'); flag(item.done, 'Checklist status');
      return item;
    });
    unique(checklist.map((item) => item.id as string), 'Checklist');
    if (task.status === 'completed' && checklist.some((item) => !item.done)) fail('Complete every checklist item before completing the task.');
    return task;
  });
  unique(tasks.map((task) => task.id as string), 'Tasks');
  const inventory = list(state.inventory, 'Inventory').map((entry) => {
    const item = object(entry, 'Inventory item');
    text(item.id, 'Inventory ID'); text(item.name, 'Product name'); text(item.category, 'Category'); text(item.unit, 'Unit');
    number(item.quantity, 'Stock quantity'); number(item.threshold, 'Low-stock threshold'); number(item.unitPrice, 'Unit price');
    return item;
  });
  unique(inventory.map((item) => item.id as string), 'Inventory');
  const inventoryIds = new Set(inventory.map((item) => item.id));
  const movements = list(state.movements, 'Stock movements').map((entry) => {
    const movement = object(entry, 'Stock movement');
    text(movement.id, 'Movement ID'); text(movement.itemId, 'Movement product'); text(movement.note, 'Movement note', true);
    oneOf(movement.type, ['in', 'out'], 'Stock movement type'); number(movement.quantity, 'Movement quantity', true);
    if (!inventoryIds.has(movement.itemId)) fail('Stock movement must reference an existing product.');
    const createdAt = text(movement.createdAt, 'Movement date');
    if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(createdAt) || !isDateKey(createdAt.slice(0, 10)) || !Number.isFinite(Date.parse(createdAt))) fail('Movement date must be an ISO timestamp with timezone.');
    return movement;
  });
  unique(movements.map((movement) => movement.id as string), 'Stock movements');
  if (state.session !== null) {
    const session = object(state.session, 'Session');
    oneOf(session.role, ['admin', 'supervisor', 'staff'], 'Demo role');
    if (!staffIds.has(text(session.staffId, 'Session staff member'))) fail('Session staff member does not exist.');
  }
  // Return a safe copy so caller mutations cannot change the validated snapshot.
  return JSON.parse(JSON.stringify(value)) as AppState;
}
