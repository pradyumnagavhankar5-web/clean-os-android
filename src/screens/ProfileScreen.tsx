import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../state/AppProvider';
import { Button, Card, Chip, colors, Header, IconBadge, Notice, Screen, SectionTitle } from '../ui';

const roles = {
  admin: { label: 'Facility Admin', description: 'View all facilities, assign tasks and manage inventory.' },
  supervisor: { label: 'Housekeeping Supervisor', description: 'Assign and track team tasks, follow checklists and record stock.' },
  staff: { label: 'Cleaning Staff', description: 'Update your assigned tasks and checklists. Inventory is view only.' },
};

export default function ProfileScreen() {
  const { state, act, busy, resetDemo } = useApp();
  const [error, setError] = useState('');
  const role = roles[state.session?.role ?? 'admin'];
  const name = state.session?.role === 'staff' ? state.staff.find(member => member.id === state.session?.staffId)?.name : role.label;
  async function switchRole() {
    setError('');
    try { await act({ type: 'logout' }); router.replace('/login'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not switch roles. Please try again.'); }
  }
  async function reset() {
    setError('');
    try { await resetDemo(); router.replace('/welcome'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not reset. Please try again.'); }
  }
  function confirmReset() {
    Alert.alert('Reset demo data?', 'This deletes tasks, stock changes and settings saved on this device, then restores the sample data.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset demo', style: 'destructive', onPress: () => { void reset(); } },
    ]);
  }
  return (
    <Screen>
      <Header eyebrow="YOUR WORKSPACE" title="Profile & settings" subtitle="Manage your demo session and local app data." />
      <Card><View style={styles.profile}><View style={styles.avatar}><Text style={styles.initials}>{(name ?? 'Demo').split(' ').slice(0, 2).map(word => word[0]).join('')}</Text></View><View style={styles.grow}><Text style={styles.name}>{name}</Text><Text style={styles.caption}>{role.label}</Text></View></View><Chip label="DEMO SESSION" tone="warning" /><Text style={styles.description}>{role.description}</Text><Button label="Switch demo role" icon="swap-horizontal-outline" variant="secondary" onPress={() => { void switchRole(); }} loading={busy} /></Card>
      {error ? <Notice message={error} tone="error" /> : null}
      <SectionTitle title="Workspace preferences" />
      <Card>
        <View style={styles.setting}><IconBadge name="globe-outline" /><View style={styles.grow}><Text style={styles.settingTitle}>Region & currency</Text><Text style={styles.caption}>India · Indian Rupees (₹)</Text></View></View>
        <View style={styles.divider} />
        <View style={styles.setting}><IconBadge name="time-outline" /><View style={styles.grow}><Text style={styles.settingTitle}>Dates & timezone</Text><Text style={styles.caption}>Indian date format · Asia/Kolkata</Text></View></View>
        <View style={styles.divider} />
        <View style={styles.setting}><IconBadge name="phone-portrait-outline" /><View style={styles.grow}><Text style={styles.settingTitle}>Saved on this device</Text><Text style={styles.caption}>Tasks, checklists, stock and your selected role are saved locally after each change.</Text></View></View>
      </Card>
      <SectionTitle title="About this prototype" />
      <Card><Text style={styles.settingTitle}>CleanOS</Text><Text style={styles.description}>Smart Housekeeping Management{ '\n' }Aura Tradings, India</Text><Text style={styles.caption}>Version 1.0.0 · Android demo</Text><Notice message="Demo data is stored locally without encryption. Use sample information only. No real sign-in or cloud database is connected." /></Card>
      <Card><View style={styles.setting}><IconBadge name="refresh-outline" color={colors.danger} background={colors.dangerLight} /><View style={styles.grow}><Text style={styles.settingTitle}>Start fresh</Text><Text style={styles.caption}>Restore the original demo data on this device.</Text></View></View><Button label="Reset demo data" variant="danger" icon="refresh-outline" onPress={confirmReset} disabled={busy} /></Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  avatar: { width: 62, height: 62, borderRadius: 21, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.teal, fontSize: 22, fontWeight: '800' },
  grow: { flex: 1, gap: 3 },
  name: { color: colors.navy, fontSize: 21, fontWeight: '700', lineHeight: 29 },
  caption: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  description: { color: colors.muted, fontSize: 14, lineHeight: 23 },
  setting: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  settingTitle: { color: colors.navy, fontSize: 15, fontWeight: '700', lineHeight: 22 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 3 },
});
