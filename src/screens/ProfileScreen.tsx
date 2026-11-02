import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useApp } from '../state/AppProvider';
import { Button, Card, Chip, colors, Header, IconBadge, Notice, Screen, SectionTitle } from '../ui';
import { BrandLogo } from '../ui/BrandLogo';

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
      <Header eyebrow="YOUR WORKSPACE" title="Profile & settings" subtitle="Your role, workspace preferences and app information." />
      <Card style={styles.identityCard}><View style={styles.profile}><View style={styles.avatar}><Text style={styles.initials}>{(name ?? 'Demo').split(' ').slice(0, 2).map(word => word[0]).join('')}</Text></View><View style={styles.grow}><Text style={styles.identityEyebrow}>CURRENT WORKSPACE</Text><Text style={styles.name}>{name}</Text><Text style={styles.caption}>{state.session?.role === 'staff' ? role.label : 'Aura Tradings · India'}</Text></View></View><View style={styles.divider} /><View style={styles.sessionInfo}><Chip label="DEMO SESSION" tone="warning" /><Text style={styles.description}>{role.description}</Text></View><Button label="Switch demo role" icon="swap-horizontal-outline" variant="secondary" onPress={() => { void switchRole(); }} loading={busy} /></Card>
      {error ? <Notice message={error} tone="error" /> : null}
      <SectionTitle title="Workspace preferences" />
      <Card>
        <View style={styles.setting}><IconBadge name="globe-outline" /><View style={styles.grow}><Text style={styles.settingTitle}>Region & currency</Text><Text style={styles.caption}>India · Indian Rupees (₹)</Text></View></View>
        <View style={styles.divider} />
        <View style={styles.setting}><IconBadge name="time-outline" /><View style={styles.grow}><Text style={styles.settingTitle}>Dates & timezone</Text><Text style={styles.caption}>Indian date format · Asia/Kolkata</Text></View></View>
        <View style={styles.divider} />
        <View style={styles.setting}><IconBadge name="phone-portrait-outline" /><View style={styles.grow}><Text style={styles.settingTitle}>Saved on this device</Text><Text style={styles.caption}>Tasks, checklists, stock and your selected role are saved locally after each change.</Text></View></View>
      </Card>
      <SectionTitle title="About CleanOS" />
      <Card><View style={styles.setting}><BrandLogo size={52} decorative /><View style={styles.grow}><Text style={styles.appName}>CleanOS</Text><Text style={styles.description}>Smart Housekeeping Management</Text></View></View><View style={styles.divider} /><View style={styles.appInfo}><Text style={styles.infoLabel}>BUSINESS</Text><Text style={styles.infoValue}>Aura Tradings, India</Text></View><View style={styles.developerCredit}><Text style={styles.developer}>Developed by Aura Builds</Text><Text style={styles.caption}>Version {Constants.expoConfig?.version ?? '1.0.1'} · Android demo</Text></View><Notice message="Demo data is stored locally without encryption. Use sample information only. No real sign-in or cloud database is connected." /></Card>
      <SectionTitle title="Demo data" />
      <Card style={styles.resetCard}><View style={styles.setting}><IconBadge name="refresh-outline" color={colors.danger} background={colors.dangerLight} /><View style={styles.grow}><Text style={styles.settingTitle}>Start fresh</Text><Text style={styles.caption}>Restore the sample tasks, inventory and settings. Your saved demo changes will be removed.</Text></View></View><Button label="Reset demo data" variant="danger" icon="refresh-outline" onPress={confirmReset} disabled={busy} /></Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  identityCard: { borderTopWidth: 3, borderTopColor: colors.teal },
  avatar: { width: 58, minHeight: 58, borderRadius: 18, padding: 8, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.teal, fontSize: 20, fontWeight: '700' },
  grow: { flex: 1, minWidth: 0, gap: 3 },
  identityEyebrow: { color: colors.muted, fontSize: 10, lineHeight: 16, fontWeight: '700', letterSpacing: 1 },
  name: { color: colors.navy, fontSize: 20, fontWeight: '700', lineHeight: 28 },
  sessionInfo: { gap: 10, alignItems: 'flex-start' },
  caption: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  description: { color: colors.muted, fontSize: 14, lineHeight: 23 },
  setting: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  settingTitle: { color: colors.navy, fontSize: 15, fontWeight: '700', lineHeight: 22 },
  appName: { color: colors.navy, fontSize: 22, fontWeight: '800', lineHeight: 30, letterSpacing: -0.4 },
  appInfo: { gap: 3 },
  infoLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', lineHeight: 17, letterSpacing: 1 },
  infoValue: { color: colors.navy, fontSize: 14, lineHeight: 22, fontWeight: '500' },
  developerCredit: { gap: 3 },
  developer: { color: colors.navy, fontSize: 14, lineHeight: 22, fontWeight: '600' },
  resetCard: { borderColor: '#EDD8DC' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
});
