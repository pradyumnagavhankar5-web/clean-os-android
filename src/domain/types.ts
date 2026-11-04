export type Role = 'admin' | 'supervisor' | 'staff';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type Priority = 'low' | 'medium' | 'high';

export interface Staff { id: string; name: string; role?: Role; active?: boolean; revision?: number }
export interface Area { id: string; name: string; active?: boolean }
export interface Facility { id: string; name: string; type: string; address: string; areas: Area[]; active?: boolean; revision?: number }
export interface ChecklistItem { id: string; label: string; done: boolean }
export interface Task {
  id: string;
  title: string;
  facilityId: string;
  areaId: string;
  assigneeId: string;
  dueDate: string;
  priority: Priority;
  status: TaskStatus;
  checklist: ChecklistItem[];
  notes: string;
  revision?: number;
}
export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  threshold: number;
  unitPrice: number;
  active?: boolean;
  revision?: number;
  balanceRevision?: number;
}
export interface StockMovement {
  id: string;
  itemId: string;
  type: 'in' | 'out';
  quantity: number;
  note: string;
  createdAt: string;
  locationId?: string;
}
export interface Session { role: Role; staffId: string }
export interface AppState {
  version: 1;
  onboardingDone: boolean;
  session: Session | null;
  facilities: Facility[];
  staff: Staff[];
  tasks: Task[];
  inventory: InventoryItem[];
  movements: StockMovement[];
}

export type Action =
  | { type: 'completeOnboarding' }
  | { type: 'login'; session: Session }
  | { type: 'logout' }
  | { type: 'saveTask'; task: Task }
  | { type: 'setTaskStatus'; taskId: string; status: TaskStatus; expectedRevision?: number }
  | { type: 'toggleChecklist'; taskId: string; itemId: string }
  | { type: 'setChecklistDone'; taskId: string; itemId: string; done: boolean; expectedRevision?: number }
  | { type: 'recordStock'; movement: StockMovement }
  | { type: 'setThreshold'; itemId: string; threshold: number; expectedRevision?: number };
