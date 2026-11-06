import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, AppState as NativeAppState, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../auth/AuthProvider';
import type { Action } from '../domain';
import { AppContext } from '../state/AppContext';
import { Button, Card, Notice, Screen, colors } from '../ui';
import { BrandLogo } from '../ui/BrandLogo';
import { cloudRepository as repository } from './repository';
import { createCloudStore } from './store';
import AccessScreen from './screens/AccessScreen';
import WorkspaceAccessScreen from './screens/WorkspaceAccessScreen';
import type { CloudCommands } from './types';

export function CloudProvider({ children }: { children: ReactNode }) {
  return <AuthProvider><WorkspaceData>{children}</WorkspaceData></AuthProvider>;
}
function Waiting({ message }: { message: string }) {
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}><Screen><Card><BrandLogo /><Text style={{ color: colors.navy, fontSize: 22, fontWeight: '700' }}>CleanOS</Text><ActivityIndicator color={colors.teal} /><Text style={{ color: colors.muted }}>{message}</Text></Card></Screen></SafeAreaView>;
}
function WorkspaceData({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [store] = useState(() => createCloudStore(repository));
  const [view, setView] = useState(store.getState);
  useEffect(() => store.subscribe(setView), [store]);
  const userId = auth.user?.id ?? null;
  useEffect(() => { void store.setUser(userId).catch(() => undefined); }, [store, userId]);
  const snapshot = view.userId === userId ? view.snapshot : null;
  const workspaceId = snapshot?.workspace.id;
  const locationId = snapshot?.locationId;
  useEffect(() => {
    if (!workspaceId) return;
    const refresh = () => { if (NativeAppState.currentState === 'active') void store.refresh().catch(() => undefined); };
    const timer = setInterval(refresh, 60000);
    const subscription = NativeAppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [workspaceId, locationId, store]);
  if (auth.loading) return <Waiting message="Restoring your secure session…" />;
  if (!auth.user || auth.recovering) return <AccessScreen />;
  if (!snapshot) {
    if (view.loading && view.workspaces.length === 0) return <Waiting message="Opening your workspace…" />;
    return <WorkspaceAccessScreen
      workspaces={view.userId === userId ? view.workspaces : []}
      loading={view.loading || view.pending > 0}
      error={view.userId === userId ? view.error : ''}
      onRefresh={() => store.listWorkspaces()}
      onSelect={id => store.chooseWorkspace(id)}
      onCreate={(name, displayName, mode) => store.bootstrap(() => repository.createWorkspace(name, displayName, mode))}
      onJoin={(code, displayName) => store.bootstrap(() => repository.joinWorkspace(code, displayName))}
    />;
  }
  async function act(action: Action) {
    if (action.type === 'logout') { await auth.signOut(); return; }
    if (action.type === 'completeOnboarding') return;
    await store.run(async current => {
      const org = current.workspace.id;
      switch (action.type) {
        case 'saveTask': return repository.saveTask(org, action.task);
        case 'setTaskStatus': return repository.setTaskStatus(org, action.taskId, action.status, action.expectedRevision);
        case 'setChecklistDone': return repository.setChecklistDone(org, action.taskId, action.itemId, action.done, action.expectedRevision);
        case 'recordStock': return repository.recordStock(org, current.locationId, action.movement);
        case 'setThreshold': return repository.setThreshold(org, current.locationId, action.itemId, action.threshold, action.expectedRevision);
        default: throw new Error('Real accounts and permissions are managed by your facility admin.');
      }
    });
  }
  const cloud: CloudCommands = {
    workspace: snapshot.workspace, locations: snapshot.locations, locationId: snapshot.locationId,
    refreshing: view.refreshing, refresh: store.refresh,
    selectLocation: store.selectLocation,
    saveFacility: (facility, location) => store.run(current => repository.saveFacility(current.workspace.id, facility, location)),
    saveProduct: product => store.run(current => repository.saveProduct(current.workspace.id, current.locationId, product)),
    createLocation: async (name, facilityId) => { await store.run(current => repository.createLocation(current.workspace.id, name, facilityId)); },
    createInvite: (email, role) => store.run(current => repository.createInvite(current.workspace.id, email, role)),
    listInvites: () => repository.listInvites(snapshot.workspace.id),
    revokeInvite: id => store.run(current => repository.revokeInvite(current.workspace.id, id)),
    updateMember: (id, name, role, active, revision) => store.run(current => repository.updateMember(current.workspace.id, id, name, role, active, revision)),
    signOut: auth.signOut,
    changeWorkspace: () => { void store.changeWorkspace().catch(() => undefined); },
  };
  return <AppContext.Provider value={{ state: snapshot.state, act, busy: view.pending > 0 || view.loading, mode: 'cloud', cloud,
    resetDemo: () => Promise.reject(new Error('Sample data reset is available only in the demo.')) }}>
    <View style={{ flex: 1 }}>
      {view.error ? <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}><Notice message={view.error} tone="error" /><Button label="Refresh workspace" variant="ghost" onPress={() => { void store.refresh().catch(() => undefined); }} loading={view.refreshing} /></SafeAreaView> : null}
      {children}
    </View>
  </AppContext.Provider>;
}
