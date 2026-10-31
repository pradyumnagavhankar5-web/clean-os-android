import type { Action, AppState, Session, Task } from './types';
import { validateState } from './validation';

export function canManageTasks(session: Session | null): boolean {
  return session?.role === 'admin' || session?.role === 'supervisor';
}

export const canManageInventory = canManageTasks;

export function canUpdateTask(session: Session | null, task: Task): boolean {
  return canManageTasks(session) || (session?.role === 'staff' && task.assigneeId === session.staffId);
}

function requireAccess(allowed: boolean, message: string): void {
  if (!allowed) throw new Error(message);
}

/** Pure state transitions. Demo role checks are UI behavior, not authentication. */
export function applyAction(state: AppState, action: Action): AppState {
  let next: AppState;
  switch (action.type) {
    case 'completeOnboarding':
      next = { ...state, onboardingDone: true };
      break;
    case 'login':
      next = { ...state, onboardingDone: true, session: action.session };
      break;
    case 'logout':
      next = { ...state, session: null };
      break;
    case 'saveTask': {
      requireAccess(canManageTasks(state.session), 'Only admins and supervisors can create or edit tasks.');
      const exists = state.tasks.some((task) => task.id === action.task.id);
      next = {
        ...state,
        tasks: exists
          ? state.tasks.map((task) => task.id === action.task.id ? action.task : task)
          : [...state.tasks, action.task],
      };
      break;
    }
    case 'setTaskStatus': {
      const task = state.tasks.find((item) => item.id === action.taskId);
      if (!task) throw new Error('This task no longer exists.');
      requireAccess(canUpdateTask(state.session, task), 'You can only update tasks assigned to you.');
      if (action.status === 'completed' && task.checklist.some((item) => !item.done)) {
        throw new Error('Complete every checklist item before completing the task.');
      }
      next = {
        ...state,
        tasks: state.tasks.map((item) => item.id === task.id ? { ...item, status: action.status } : item),
      };
      break;
    }
    case 'toggleChecklist': {
      const task = state.tasks.find((item) => item.id === action.taskId);
      if (!task) throw new Error('This task no longer exists.');
      requireAccess(canUpdateTask(state.session, task), 'You can only update tasks assigned to you.');
      if (!task.checklist.some((item) => item.id === action.itemId)) throw new Error('This checklist item no longer exists.');
      const checklist = task.checklist.map((item) => item.id === action.itemId ? { ...item, done: !item.done } : item);
      const status = task.status === 'completed' && checklist.some((item) => !item.done) ? 'in_progress' : task.status;
      next = {
        ...state,
        tasks: state.tasks.map((item) => item.id === task.id ? { ...item, checklist, status } : item),
      };
      break;
    }
    case 'recordStock': {
      requireAccess(canManageInventory(state.session), 'Only admins and supervisors can record stock movements.');
      const movement = action.movement;
      const item = state.inventory.find((product) => product.id === movement.itemId);
      if (!item) throw new Error('This product no longer exists.');
      if (typeof movement.quantity !== 'number' || !Number.isFinite(movement.quantity) || movement.quantity <= 0) {
        throw new Error('Enter a positive stock quantity.');
      }
      if (movement.type !== 'in' && movement.type !== 'out') throw new Error('Choose stock in or stock out.');
      if (movement.type === 'out' && movement.quantity > item.quantity) throw new Error('Stock out cannot exceed the available quantity.');
      const quantity = item.quantity + (movement.type === 'in' ? movement.quantity : -movement.quantity);
      if (!Number.isFinite(quantity)) throw new Error('The resulting stock quantity is too large.');
      if (quantity === item.quantity) throw new Error('The stock quantity is too small to record accurately.');
      next = {
        ...state,
        inventory: state.inventory.map((product) => product.id === item.id ? { ...product, quantity } : product),
        movements: [...state.movements, movement],
      };
      break;
    }
    case 'setThreshold':
      requireAccess(canManageInventory(state.session), 'Only admins and supervisors can edit stock thresholds.');
      if (!state.inventory.some((item) => item.id === action.itemId)) throw new Error('This product no longer exists.');
      if (typeof action.threshold !== 'number' || !Number.isFinite(action.threshold) || action.threshold < 0) {
        throw new Error('Enter a non-negative low-stock threshold.');
      }
      next = {
        ...state,
        inventory: state.inventory.map((item) => item.id === action.itemId ? { ...item, threshold: action.threshold } : item),
      };
      break;
    default:
      throw new Error('Unsupported app action.');
  }
  return validateState(next);
}
