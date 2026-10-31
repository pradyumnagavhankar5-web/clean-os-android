import { dateKey } from './format';
import type { AppState, ChecklistItem, Task } from './types';

/** Fresh demo data is relative to the current Indian working day. */
export function seedState(now: Date = new Date()): AppState {
  const today = dateKey(now);
  const yesterday = dateKey(new Date(now.getTime() - 86_400_000));
  const checklist = (prefix: string, labels: string[], done = false): ChecklistItem[] =>
    labels.map((label, index) => ({ id: `${prefix}-${index + 1}`, label, done }));
  const task = (
    id: string, title: string, facilityId: string, areaId: string, assigneeId: string,
    priority: Task['priority'], status: Task['status'], labels: string[],
  ): Task => ({
    id, title, facilityId, areaId, assigneeId, priority, status, dueDate: today,
    notes: '', checklist: checklist(id, labels, status === 'completed'),
  });

  return {
    version: 1,
    onboardingDone: false,
    session: null,
    staff: [
      { id: 'staff-asha', name: 'Asha Patil' },
      { id: 'staff-ravi', name: 'Ravi Kumar' },
      { id: 'staff-meena', name: 'Meena Shah' },
    ],
    facilities: [
      {
        id: 'facility-aura', name: 'Aura Business Centre', type: 'Office',
        address: 'Baner Road, Pune, Maharashtra',
        areas: [
          { id: 'area-lobby', name: 'Reception & lobby' },
          { id: 'area-office-washroom', name: 'Office washrooms' },
          { id: 'area-pantry', name: 'Staff pantry' },
        ],
      },
      {
        id: 'facility-lotus', name: 'Lotus Residency', type: 'Housing society',
        address: 'Wakad, Pune, Maharashtra',
        areas: [
          { id: 'area-tower', name: 'Tower A corridors' },
          { id: 'area-clubhouse', name: 'Clubhouse' },
        ],
      },
      {
        id: 'facility-sahyadri', name: 'Sahyadri Care Clinic', type: 'Healthcare',
        address: 'Aundh, Pune, Maharashtra',
        areas: [
          { id: 'area-waiting', name: 'Waiting area' },
          { id: 'area-clinic-washroom', name: 'Visitor washrooms' },
        ],
      },
    ],
    tasks: [
      task('task-lobby', 'Morning lobby cleaning', 'facility-aura', 'area-lobby', 'staff-asha', 'high', 'in_progress', ['Sweep and mop the floor', 'Wipe reception surfaces', 'Empty waste bins']),
      task('task-washroom', 'Washroom hygiene round', 'facility-aura', 'area-office-washroom', 'staff-ravi', 'high', 'pending', ['Clean fixtures and basins', 'Refill handwash and tissues', 'Record final inspection']),
      task('task-pantry', 'Pantry cleaning & restock', 'facility-aura', 'area-pantry', 'staff-meena', 'medium', 'completed', ['Wash sink and counter', 'Clean dining tables', 'Refill dishwash liquid']),
      task('task-corridors', 'Tower A floor care', 'facility-lotus', 'area-tower', 'staff-asha', 'medium', 'pending', ['Sweep all corridors', 'Mop using floor cleaner', 'Check lift landing']),
      task('task-clubhouse', 'Clubhouse morning round', 'facility-lotus', 'area-clubhouse', 'staff-meena', 'low', 'completed', ['Dust furniture', 'Mop activity room', 'Empty waste bins']),
      task('task-waiting', 'Waiting area upkeep', 'facility-sahyadri', 'area-waiting', 'staff-ravi', 'high', 'in_progress', ['Clean chairs and touch points', 'Mop floor as per site SOP', 'Segregate general waste']),
      task('task-clinic', 'Visitor washroom restock', 'facility-sahyadri', 'area-clinic-washroom', 'staff-meena', 'high', 'pending', ['Clean basins and fixtures', 'Refill tissues and handwash', 'Check floor is dry']),
      { ...task('task-inspection', 'Evening lobby inspection', 'facility-aura', 'area-lobby', 'staff-asha', 'low', 'pending', ['Check floor condition', 'Wipe door handles']), dueDate: yesterday },
    ],
    inventory: [
      { id: 'stock-tissue', name: 'Facial tissues', category: 'Tissues', unit: 'boxes', quantity: 8, threshold: 10, unitPrice: 75 },
      { id: 'stock-floor', name: 'Floor cleaner', category: 'Floor care', unit: 'litres', quantity: 24, threshold: 10, unitPrice: 125 },
      { id: 'stock-toilet', name: 'Toilet cleaner', category: 'Washroom care', unit: 'litres', quantity: 4, threshold: 5, unitPrice: 110 },
      { id: 'stock-handwash', name: 'Liquid handwash', category: 'Hand hygiene', unit: 'litres', quantity: 6, threshold: 8, unitPrice: 140 },
      { id: 'stock-dishwash', name: 'Dishwash liquid', category: 'Kitchen care', unit: 'litres', quantity: 12, threshold: 5, unitPrice: 95 },
      { id: 'stock-bags', name: 'Garbage bags — medium', category: 'Waste supplies', unit: 'rolls', quantity: 18, threshold: 8, unitPrice: 60 },
      { id: 'stock-gloves', name: 'Reusable cleaning gloves', category: 'Protective supplies', unit: 'pairs', quantity: 20, threshold: 10, unitPrice: 85 },
    ],
    movements: [],
  };
}
