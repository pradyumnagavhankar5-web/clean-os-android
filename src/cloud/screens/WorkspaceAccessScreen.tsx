import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { WorkspaceSummary } from '../types';
import { useAuth } from '../../auth/AuthProvider';
import { Button, Card, Chip, Field, Header, Notice, Screen, SectionTitle, colors } from '../../ui';
import { BrandLogo } from '../../ui/BrandLogo';

interface Props {
  workspaces: WorkspaceSummary[];
  loading: boolean;
  error?: string;
  onSelect: (id: string) => Promise<void>;
  onCreate: (name: string, displayName: string, inventoryMode: 'shared' | 'facility') => Promise<void>;
  onJoin: (code: string, displayName: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const roleLabels = { admin: 'Facility Admin', supervisor: 'Housekeeping Supervisor', staff: 'Cleaning Staff' };

export default function WorkspaceAccessScreen({ workspaces, loading, error, onSelect, onCreate, onJoin, onRefresh }: Props) {
  const auth = useAuth();
  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [inventoryMode, setInventoryMode] = useState<'shared' | 'facility'>('shared');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');

  async function run(operation: () => Promise<void>) {
    setBusy(true); setLocalError('');
    try { await operation(); }
    catch (cause) { setLocalError(cause instanceof Error ? cause.message : 'Could not open the workspace. Please try again.'); }
    finally { setBusy(false); }
  }

  async function submit() {
    if (!displayName.trim() || displayName.trim().length > 100) throw new Error('Enter your name, using up to 100 characters.');
    if (mode === 'join') {
      if (!code.trim()) throw new Error('Enter the invite code from your workspace administrator.');
      await onJoin(code.trim(), displayName.trim());
    } else {
      if (!name.trim() || name.trim().length > 120) throw new Error('Enter a workspace name, using up to 120 characters.');
      await onCreate(name.trim(), displayName.trim(), inventoryMode);
    }
  }

  return <SafeAreaView style={styles.safeArea}>
    <Screen style={styles.content}>
      <View style={styles.brand}><BrandLogo decorative /><View style={styles.grow}><Text style={styles.appName}>CleanOS</Text><Text style={styles.email}>{auth.user?.email}</Text></View></View>
      <Header eyebrow="TEAM ACCESS" title="Choose your workspace" subtitle="Open a workspace, join your team or create a workspace for your organisation." />
      {localError || error ? <Notice message={localError || error || ''} tone="error" /> : null}
      {workspaces.length ? <View style={styles.section}>
        <SectionTitle title="Your workspaces" />
        {workspaces.map((workspace) => <Card key={workspace.id}><View style={styles.workspaceHeading}><View style={styles.grow}><Text style={styles.workspaceName}>{workspace.name}</Text><Text style={styles.caption}>{roleLabels[workspace.role]}</Text></View></View><Button label="Open workspace" icon="arrow-forward" onPress={() => void run(() => onSelect(workspace.id))} disabled={busy || loading} /></Card>)}
      </View> : null}
      <View style={styles.tabs}><Chip label="Join with invite code" selected={mode === 'join'} onPress={() => { if (!busy) { setMode('join'); setLocalError(''); } }} /><Chip label="Create workspace" selected={mode === 'create'} onPress={() => { if (!busy) { setMode('create'); setLocalError(''); } }} /></View>
      <Card>
        <SectionTitle title={mode === 'join' ? 'Join your team' : 'Set up your organisation'} />
        <Field label="Your name" value={displayName} onChangeText={setDisplayName} placeholder="How your team knows you" editable={!busy && !loading} />
        {mode === 'join' ? <>
          <Field label="Invite code" value={code} onChangeText={setCode} autoCapitalize="none" autoCorrect={false} editable={!busy && !loading} />
          <Text style={styles.caption}>The invitation must match your verified email address. Your administrator sets your role.</Text>
        </> : <>
          <Field label="Workspace name" value={name} onChangeText={setName} placeholder="e.g. Aura Tradings" editable={!busy && !loading} />
          <Text style={styles.fieldLabel}>How will you track stock?</Text>
          <View style={styles.tabs}><Chip label="One shared stock room" selected={inventoryMode === 'shared'} onPress={() => { if (!busy) setInventoryMode('shared'); }} /><Chip label="Separate facility stock" selected={inventoryMode === 'facility'} onPress={() => { if (!busy) setInventoryMode('facility'); }} /></View>
          <Text style={styles.caption}>You will become this workspace’s Facility Admin. Add facilities, invite your team and enter your real supplies after setup.</Text>
        </>}
        <Button label={mode === 'join' ? 'Join workspace' : 'Create workspace'} icon={mode === 'join' ? 'people-outline' : 'business-outline'} loading={busy} disabled={loading} onPress={() => void run(submit)} />
      </Card>
      <Button label="Refresh workspaces" icon="refresh-outline" variant="secondary" loading={loading} disabled={busy} onPress={() => void run(onRefresh)} />
      <Button label="Sign out" variant="ghost" disabled={busy || loading} onPress={() => void run(auth.signOut)} />
      <Text style={styles.footer}>Developed by Aura Builds</Text>
    </Screen>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { maxWidth: 720 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  grow: { flex: 1, gap: 4 },
  appName: { color: colors.navy, fontSize: 25, fontWeight: '800' },
  email: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  section: { gap: 12 },
  workspaceHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  workspaceName: { color: colors.navy, fontSize: 19, lineHeight: 27, fontWeight: '700' },
  caption: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fieldLabel: { color: colors.navy, fontSize: 13, fontWeight: '600', lineHeight: 20 },
  footer: { color: colors.muted, fontSize: 12, lineHeight: 19, textAlign: 'center', paddingVertical: 10 },
});
