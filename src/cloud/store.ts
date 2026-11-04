import { CloudRepositoryError, type CloudRepository } from './repository';
import type { WorkspaceSnapshot, WorkspaceSummary } from './types';

export interface CloudView {
  userId: string | null;
  workspaces: WorkspaceSummary[];
  snapshot: WorkspaceSnapshot | null;
  loading: boolean;
  refreshing: boolean;
  pending: number;
  error: string;
}
const empty = (): CloudView => ({ userId: null, workspaces: [], snapshot: null, loading: false, refreshing: false, pending: 0, error: '' });
const message = (error: unknown) => error instanceof Error ? error.message : 'Could not reach your workspace. Please try again.';

/** A session-scoped read model. The database is the only source of truth. */
export function createCloudStore(repository: CloudRepository) {
  let view = empty();
  let generation = 0;
  let readNumber = 0;
  let writeQueue: Promise<unknown> = Promise.resolve();
  const listeners = new Set<(value: CloudView) => void>();
  const publish = (patch: Partial<CloudView>) => {
    view = { ...view, ...patch };
    listeners.forEach(listener => listener(view));
  };
  const fail = (error: unknown, ticket: number) => {
    if (ticket === generation) publish({ error: message(error), loading: false, refreshing: false,
      ...(error instanceof CloudRepositoryError && error.kind === 'access' ? { snapshot: null } : {}) });
  };
  async function chooseWorkspace(id: string, locationId?: string) {
    if (!view.userId) throw new Error('Sign in before opening a workspace.');
    const userId = view.userId;
    const ticket = ++generation;
    ++readNumber;
    writeQueue = Promise.resolve();
    publish({ snapshot: null, loading: true, refreshing: false, pending: 0, error: '' });
    try {
      const snapshot = await repository.loadWorkspace(id, locationId);
      if (ticket !== generation || view.userId !== userId) return;
      if (snapshot.workspace.memberId !== userId) throw new CloudRepositoryError('The workspace does not belong to the signed-in account.', 'access');
      publish({ snapshot, loading: false });
    } catch (error) { fail(error, ticket); throw error; }
  }
  async function listWorkspaces(autoChoose = true) {
    if (!view.userId) return;
    const ticket = generation;
    publish({ loading: !view.snapshot, error: '' });
    try {
      await repository.checkSchema();
      const workspaces = await repository.listWorkspaces();
      if (ticket !== generation) return;
      publish({ workspaces, loading: false });
      if (autoChoose && !view.snapshot && workspaces.length === 1) await chooseWorkspace(workspaces[0].id);
    } catch (error) { fail(error, ticket); throw error; }
  }
  async function setUser(userId: string | null) {
    ++generation;
    ++readNumber;
    writeQueue = Promise.resolve();
    view = { ...empty(), userId };
    publish({});
    if (userId) await listWorkspaces();
  }
  async function refresh() {
    if (view.loading) return;
    const current = view.snapshot;
    if (!current || !view.userId) return listWorkspaces();
    const ticket = generation;
    const read = ++readNumber;
    const userId = view.userId;
    publish({ refreshing: true });
    try {
      const snapshot = await repository.loadWorkspace(current.workspace.id, current.locationId);
      if (ticket !== generation || read !== readNumber || view.userId !== userId) return;
      if (snapshot.workspace.memberId !== userId) throw new CloudRepositoryError('Your workspace access changed. Sign in again.', 'access');
      publish({ snapshot, refreshing: false, error: '' });
    } catch (error) { if (read === readNumber) fail(error, ticket); throw error; }
  }
  async function selectLocation(locationId: string) {
    const current = view.snapshot;
    if (!current || !view.userId) throw new Error('Open your workspace before choosing a stock room.');
    const userId = view.userId;
    const ticket = ++generation;
    ++readNumber;
    writeQueue = Promise.resolve();
    publish({ loading: true, refreshing: true, pending: 0, error: '' });
    try {
      const snapshot = await repository.loadWorkspace(current.workspace.id, locationId);
      if (ticket !== generation || view.userId !== userId) return;
      if (snapshot.workspace.memberId !== userId) throw new CloudRepositoryError('Your workspace access changed. Sign in again.', 'access');
      publish({ snapshot, loading: false, refreshing: false });
    } catch (error) { fail(error, ticket); throw error; }
  }
  function run<T>(operation: (snapshot: WorkspaceSnapshot) => Promise<T>): Promise<T> {
    const snapshot = view.snapshot;
    if (!snapshot || !view.userId) return Promise.reject(new Error('Open your workspace before making changes.'));
    if (view.loading) return Promise.reject(new Error('Wait until the selected stock room has loaded.'));
    const ticket = generation;
    publish({ pending: view.pending + 1 });
    const task = writeQueue.then(async () => {
      if (ticket !== generation) throw new Error('The account or workspace changed before this action was sent.');
      const result = await operation(snapshot);
      if (ticket === generation) {
        try { await refresh(); }
        catch { if (ticket === generation) publish({ error: 'Your change was saved, but the latest view could not be loaded. Refresh before continuing.' }); }
      }
      return result;
    });
    writeQueue = task.catch(() => undefined);
    return task.catch(async error => {
      if (ticket === generation) {
        try { await refresh(); } catch { /* Keep the original save error. */ }
      }
      throw error;
    }).finally(() => {
      if (ticket === generation) publish({ pending: Math.max(0, view.pending - 1) });
    });
  }
  async function bootstrap(operation: () => Promise<string>) {
    if (!view.userId) throw new Error('Sign in before creating or joining a workspace.');
    const ticket = generation;
    publish({ pending: view.pending + 1, error: '' });
    try {
      const id = await operation();
      if (ticket !== generation) return;
      await listWorkspaces(false);
      if (ticket === generation) await chooseWorkspace(id);
    } catch (error) { fail(error, ticket); throw error; }
    finally { if (ticket === generation) publish({ pending: Math.max(0, view.pending - 1) }); }
  }
  return {
    getState: () => view,
    subscribe(listener: (value: CloudView) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    setUser, listWorkspaces, chooseWorkspace, refresh, selectLocation, run, bootstrap,
    async changeWorkspace() {
      ++generation; ++readNumber; writeQueue = Promise.resolve();
      publish({ snapshot: null, pending: 0, refreshing: false, error: '' });
      await listWorkspaces(false);
    },
  };
}
