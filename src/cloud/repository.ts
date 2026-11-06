import { validateState } from '../domain/validation';
import type { Facility, Role, StockMovement, Task, TaskStatus } from '../domain';
import type { ProductDraft, WorkspaceInvite, WorkspaceSnapshot, WorkspaceSummary } from './types';

interface RpcFailure { code?: string; message?: string; status?: number }
interface RpcResponse { data: unknown; error: RpcFailure | null }
/** Structural boundary permits transport tests without loading native auth storage. */
export interface CloudRpcClient {
  rpc(name: string, parameters?: Record<string, unknown>): PromiseLike<RpcResponse>;
}
export type CloudErrorKind = 'setup' | 'conflict' | 'access' | 'connection' | 'validation' | 'unknown';
export class CloudRepositoryError extends Error {
  constructor(message: string, public readonly kind: CloudErrorKind = 'unknown') {
    super(message);
    this.name = 'CloudRepositoryError';
  }
}

function friendlyError(value: unknown): CloudRepositoryError {
  if (value instanceof CloudRepositoryError) return value;
  const error = value && typeof value === 'object' ? value as RpcFailure : {};
  const code = error.code ?? '';
  const message = error.message ?? '';
  if (['PGRST202', 'PGRST205', '42P01', '42883'].includes(code)) {
    return new CloudRepositoryError('The CleanOS database setup is not complete. Ask your administrator to run the database setup script.', 'setup');
  }
  if (/confirm.*email|verify.*email|verified.*email|email.*verified/i.test(message)) {
    return new CloudRepositoryError('Confirm your email address before creating or joining a workspace.', 'access');
  }
  if (code === '40001' || /revision|stale|changed on another|conflict/i.test(message)) {
    return new CloudRepositoryError('This record changed on another phone. Refresh the workspace and review the latest values before saving again.', 'conflict');
  }
  if (['PGRST301', 'PGRST302', 'PGRST303'].includes(code) || /jwt.*expired|not authenticated|sign in required/i.test(message)) {
    return new CloudRepositoryError('Your session has expired. Please sign in again.', 'access');
  }
  if (/invite|invitation/i.test(message)) {
    if (/email|address/i.test(message)) return new CloudRepositoryError('This invitation belongs to another email address. Sign in with the invited address.', 'access');
    if (/already|used|consumed/i.test(message)) return new CloudRepositoryError('This invitation has already been used.', 'validation');
    return new CloudRepositoryError('This invitation is invalid or has expired. Ask an administrator for a new code.', 'validation');
  }
  if (/last.*admin|at least one.*admin|one active admin/i.test(message)) {
    return new CloudRepositoryError('Keep at least one active facility admin in the workspace.', 'validation');
  }
  if (/request.*(different|mismatch)|idempotency/i.test(message)) {
    return new CloudRepositoryError('This stock entry was already submitted with different details. Check the stock history before starting another entry.', 'conflict');
  }
  if (/insufficient|not enough.*stock|exceed.*(stock|available)|negative.*stock/i.test(message)) {
    return new CloudRepositoryError('Stock out exceeds the available quantity. Refresh the stock balance and try again.', 'validation');
  }
  if (/checklist|all steps/i.test(message)) {
    return new CloudRepositoryError('Complete every checklist step before completing the task.', 'validation');
  }
  if (/unit.*(change|immutable|history)|change.*unit/i.test(message)) {
    return new CloudRepositoryError('The product unit cannot change after stock has been recorded.', 'validation');
  }
  if (/archiv.*(stock|quantity)|stock.*archiv/i.test(message)) {
    return new CloudRepositoryError('Issue the remaining stock before archiving this product.', 'validation');
  }
  if (/open tasks/i.test(message)) {
    return new CloudRepositoryError('Complete or move the open tasks before archiving this facility or area.', 'validation');
  }
  if (code === '42501' || error.status === 403) {
    return new CloudRepositoryError('Your account does not have permission for this action. Ask a facility admin to check your membership.', 'access');
  }
  if (error.status === 429) return new CloudRepositoryError('Too many requests. Please wait a moment and try again.', 'connection');
  if (code === '23503') return new CloudRepositoryError('A selected facility, area, person or product is unavailable. Refresh the workspace and try again.', 'conflict');
  if (code === '23505') return new CloudRepositoryError('This entry already exists. Refresh the workspace before submitting another entry.', 'conflict');
  if (['22023', '22P02', '23514', '22003', '22007', '22008'].includes(code)) {
    return new CloudRepositoryError('Please check the entered values and try again.', 'validation');
  }
  if (value instanceof TypeError || /network|fetch|connection|timeout|timed out|offline/i.test(message)) {
    return new CloudRepositoryError('Could not reach the server. Check your internet connection and try again.', 'connection');
  }
  return new CloudRepositoryError('Could not complete this request. Refresh the workspace and try again.');
}

const malformed = (): never => { throw new CloudRepositoryError('The server returned an invalid workspace. Refresh or ask your administrator to check the database setup.', 'setup'); };
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return malformed();
  return value as Record<string, unknown>;
}
function nonempty(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return malformed();
  return value;
}
function list(value: unknown): unknown[] { return Array.isArray(value) ? value : malformed(); }
function role(value: unknown): Role {
  if (value !== 'admin' && value !== 'supervisor' && value !== 'staff') return malformed();
  return value;
}
function revision(value: unknown): void {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) malformed();
}
function optionalActive(value: unknown): void { if (value !== undefined && typeof value !== 'boolean') malformed(); }
function summary(value: unknown): WorkspaceSummary {
  const item = record(value);
  return { id: nonempty(item.id), name: nonempty(item.name), role: role(item.role) };
}
function timestamp(value: unknown): string {
  const string = nonempty(value);
  if (!Number.isFinite(Date.parse(string))) return malformed();
  return string;
}

export function decodeWorkspace(value: unknown, organizationId: string, locationId?: string): WorkspaceSnapshot {
  const source = record(value);
  const workspace = record(source.workspace);
  const base = summary(workspace);
  if (base.id !== organizationId || (workspace.inventoryMode !== 'shared' && workspace.inventoryMode !== 'facility')) return malformed();
  const memberId = nonempty(workspace.memberId);
  const selectedLocation = nonempty(source.locationId);
  if (locationId !== undefined && selectedLocation !== locationId) return malformed();
  const locations = list(source.locations).map((value) => {
    const item = record(value);
    if (typeof item.active !== 'boolean' || (item.facilityId !== null && typeof item.facilityId !== 'string')) return malformed();
    return { id: nonempty(item.id), name: nonempty(item.name), facilityId: item.facilityId as string | null, active: item.active };
  });
  if (new Set(locations.map(item => item.id)).size !== locations.length || !locations.some(item => item.id === selectedLocation && item.active)) return malformed();
  let state;
  try { state = validateState(source.state); } catch { return malformed(); }
  if (!state.onboardingDone || !state.session || state.session.staffId !== memberId || state.session.role !== base.role) return malformed();
  const member = state.staff.find(item => item.id === memberId);
  if (!member || member.active === false || (member.role !== undefined && member.role !== base.role)) return malformed();
  for (const item of state.staff) { revision(item.revision); optionalActive(item.active); if (item.role !== undefined) role(item.role); }
  for (const item of state.facilities) {
    revision(item.revision); optionalActive(item.active);
    for (const area of item.areas) optionalActive(area.active);
  }
  for (const item of state.tasks) revision(item.revision);
  for (const item of state.inventory) { revision(item.revision); revision(item.balanceRevision); optionalActive(item.active); }
  if (base.role === 'staff' && state.tasks.some(item => item.assigneeId !== memberId)) return malformed();
  if (state.movements.some(item => item.locationId !== undefined && item.locationId !== selectedLocation)) return malformed();
  return { workspace: { ...base, memberId, inventoryMode: workspace.inventoryMode }, locations, locationId: selectedLocation, state };
}

export function createCloudRepository(client: CloudRpcClient) {
  async function call(name: string, parameters?: Record<string, unknown>): Promise<unknown> {
    try {
      const result = await client.rpc(`cleanos_${name}`, parameters);
      if (result.error) throw result.error;
      return result.data;
    } catch (error) { throw friendlyError(error); }
  }
  const write = async (name: string, parameters: Record<string, unknown>): Promise<void> => { await call(name, parameters); };
  return {
    async checkSchema(): Promise<void> {
      if (await call('schema_version') !== 2) throw new CloudRepositoryError('This app needs a compatible CleanOS database setup. Ask your administrator to update the database.', 'setup');
    },
    async listWorkspaces(): Promise<WorkspaceSummary[]> {
      const workspaces = list(await call('my_workspaces')).map(summary);
      if (new Set(workspaces.map(item => item.id)).size !== workspaces.length) return malformed();
      return workspaces;
    },
    async createWorkspace(name: string, displayName: string, inventoryMode: 'shared' | 'facility' = 'shared'): Promise<string> {
      return nonempty(await call('create_workspace', { p_name: name.trim(), p_display_name: displayName.trim(), p_inventory_mode: inventoryMode }));
    },
    async joinWorkspace(code: string, displayName: string): Promise<string> {
      return nonempty(await call('join_workspace', { p_code: code.trim(), p_display_name: displayName.trim() }));
    },
    async loadWorkspace(organizationId: string, locationId?: string): Promise<WorkspaceSnapshot> {
      return decodeWorkspace(await call('workspace', { p_org_id: organizationId, p_location_id: locationId ?? null }), organizationId, locationId);
    },
    saveTask(organizationId: string, task: Task): Promise<void> {
      return write('save_task', { p_org_id: organizationId, p_task: {
        id: task.id, title: task.title, facilityId: task.facilityId, areaId: task.areaId,
        assigneeId: task.assigneeId, dueDate: task.dueDate, priority: task.priority, status: task.status,
        checklist: task.checklist.map(({ id, label, done }) => ({ id, label, done })), notes: task.notes,
      }, p_expected_revision: task.revision ?? null });
    },
    setTaskStatus(organizationId: string, taskId: string, status: TaskStatus, expectedRevision?: number): Promise<void> {
      return write('set_task_status', { p_org_id: organizationId, p_task_id: taskId, p_status: status, p_expected_revision: expectedRevision ?? null });
    },
    setChecklistDone(organizationId: string, taskId: string, itemId: string, done: boolean, expectedRevision?: number): Promise<void> {
      return write('set_checklist_done', { p_org_id: organizationId, p_task_id: taskId, p_item_id: itemId, p_done: done, p_expected_revision: expectedRevision ?? null });
    },
    recordStock(organizationId: string, locationId: string, movement: StockMovement): Promise<void> {
      return write('record_stock', { p_org_id: organizationId, p_location_id: locationId, p_product_id: movement.itemId,
        p_direction: movement.type, p_quantity: movement.quantity, p_note: movement.note, p_request_id: movement.id });
    },
    setThreshold(organizationId: string, locationId: string, itemId: string, threshold: number, expectedRevision?: number): Promise<void> {
      return write('set_threshold', { p_org_id: organizationId, p_location_id: locationId, p_product_id: itemId, p_threshold: threshold, p_expected_revision: expectedRevision ?? null });
    },
    saveFacility(organizationId: string, facility: Facility, createLocation = false): Promise<void> {
      return write('save_facility', { p_org_id: organizationId, p_facility: {
        id: facility.id, name: facility.name, type: facility.type, address: facility.address,
        active: facility.active ?? true, areas: facility.areas.map(({ id, name, active }) => ({ id, name, active: active ?? true })),
      }, p_expected_revision: facility.revision ?? null, p_create_location: createLocation });
    },
    saveProduct(organizationId: string, locationId: string, product: ProductDraft): Promise<void> {
      return write('save_product', { p_org_id: organizationId, p_product: {
        id: product.id, name: product.name, category: product.category, unit: product.unit,
        unitPrice: product.unitPrice, threshold: product.threshold, active: product.active ?? true,
      }, p_expected_revision: product.revision ?? null, p_location_id: locationId, p_opening_quantity: product.openingQuantity ?? 0 });
    },
    async createLocation(organizationId: string, name: string, facilityId?: string): Promise<string> {
      return nonempty(await call('create_location', { p_org_id: organizationId, p_name: name.trim(), p_facility_id: facilityId ?? null }));
    },
    async createInvite(organizationId: string, email: string, invitedRole: Role): Promise<string> {
      return nonempty(await call('create_invite', { p_org_id: organizationId, p_email: email.trim().toLowerCase(), p_role: invitedRole }));
    },
    async listInvites(organizationId: string): Promise<WorkspaceInvite[]> {
      return list(await call('list_invites', { p_org_id: organizationId })).map((value) => {
        const item = record(value);
        return { id: nonempty(item.id), email: nonempty(item.email), role: role(item.role), expiresAt: timestamp(item.expiresAt), usedAt: item.usedAt === null ? null : timestamp(item.usedAt) };
      });
    },
    revokeInvite(organizationId: string, invitationId: string): Promise<void> {
      return write('revoke_invite', { p_org_id: organizationId, p_invite_id: invitationId });
    },
    updateMember(organizationId: string, userId: string, name: string, memberRole: Role, active: boolean, expectedRevision?: number): Promise<void> {
      return write('update_member', { p_org_id: organizationId, p_user_id: userId, p_name: name.trim(), p_role: memberRole, p_active: active, p_expected_revision: expectedRevision ?? null });
    },
  };
}

// Native storage is loaded only when the live repository is used. Pure tests
// inject their transport and never initialise a real session or contact a server.
export const cloudRepository = createCloudRepository({
  async rpc(name, parameters) {
    const { supabase } = await import('../auth/supabase');
    const result = await supabase.rpc(name, parameters);
    return { data: result.data as unknown, error: result.error };
  },
});
export type CloudRepository = ReturnType<typeof createCloudRepository>;
