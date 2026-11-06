import { dateKey } from './format';
import type { AppState, InventoryItem, Task } from './types';

export function getVisibleTasks(state: AppState): Task[] {
  if (!state.session) return [];
  return state.session.role === 'staff'
    ? state.tasks.filter((task) => task.assigneeId === state.session!.staffId)
    : state.tasks;
}

export function getLowStockItems(state: AppState): InventoryItem[] {
  return state.inventory.filter((item) => item.active !== false && item.quantity <= item.threshold);
}

export function dashboardMetrics(state: AppState, now: Date = new Date()) {
  const today = dateKey(now);
  const visible = getVisibleTasks(state);
  const todayTasks = visible.filter((task) => task.dueDate === today);
  const completedToday = todayTasks.filter((task) => task.status === 'completed').length;
  return {
    today,
    totalToday: todayTasks.length,
    completedToday,
    pendingToday: todayTasks.length - completedToday,
    inProgressToday: todayTasks.filter((task) => task.status === 'in_progress').length,
    completionPercent: todayTasks.length === 0 ? 0 : Math.round(completedToday / todayTasks.length * 100),
    lowStockCount: getLowStockItems(state).length,
    overdueCount: visible.filter((task) => task.dueDate < today && task.status !== 'completed').length,
  };
}
