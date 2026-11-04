import type { AppState, Facility, InventoryItem, Role } from '../domain';

export interface WorkspaceSummary { id: string; name: string; role: Role }
export interface Workspace extends WorkspaceSummary { memberId: string; inventoryMode: 'shared' | 'facility' }
export interface StockLocation { id: string; name: string; facilityId: string | null; active: boolean }
export interface WorkspaceSnapshot {
  workspace: Workspace;
  locations: StockLocation[];
  locationId: string;
  state: AppState;
}
export interface WorkspaceInvite { id: string; email: string; role: Role; expiresAt: string; usedAt: string | null }
export interface ProductDraft extends Omit<InventoryItem, 'quantity' | 'balanceRevision'> { openingQuantity?: number }
export interface CloudCommands {
  workspace: Workspace;
  locations: StockLocation[];
  locationId: string;
  refreshing: boolean;
  refresh: () => Promise<void>;
  selectLocation: (id: string) => Promise<void>;
  saveFacility: (facility: Facility, createLocation?: boolean) => Promise<void>;
  saveProduct: (product: ProductDraft) => Promise<void>;
  createLocation: (name: string, facilityId?: string) => Promise<void>;
  createInvite: (email: string, role: Role) => Promise<string>;
  listInvites: () => Promise<WorkspaceInvite[]>;
  revokeInvite: (id: string) => Promise<void>;
  updateMember: (id: string, name: string, role: Role, active: boolean, revision?: number) => Promise<void>;
  signOut: () => Promise<void>;
  changeWorkspace: () => void;
}
