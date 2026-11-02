import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { Role } from '../domain/types';
import { useApp } from '../state/AppProvider';
import { Button, Card, Chip, colors, Header, IconBadge, Notice, Screen, SectionTitle } from '../ui';
import { BrandLogo } from '../ui/BrandLogo';

const roles = [
  { id: 'admin' as const, title: 'Facility Admin', description: 'An overview of every facility, task and supply.', icon: 'business-outline' as const },
  { id: 'supervisor' as const, title: 'Housekeeping Supervisor', description: 'Plan the day, assign work and manage stock.', icon: 'people-outline' as const },
  { id: 'staff' as const, title: 'Cleaning Staff', description: 'Focus on your assigned tasks and checklists.', icon: 'person-outline' as const },
];

export default function LoginScreen() {
  const { state, act, busy } = useApp();
  const [role, setRole] = useState<Role>('admin');
  const [staffId, setStaffId] = useState(state.staff[0]?.id ?? '');
  const [error, setError] = useState('');
  async function enter() {
    setError('');
    try { await act({ type: 'login', session: { role, staffId } }); router.replace('/'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not open the demo. Please try again.'); }
  }
  return (
    <Screen>
      <View style={styles.brand}><BrandLogo size={44} decorative /><View style={styles.brandCopy}><Text style={styles.brandText}>CleanOS</Text><Text style={styles.brandCaption}>SMART HOUSEKEEPING MANAGEMENT</Text></View></View>
      <Header eyebrow="DEMO WORKSPACE" title="Choose your role" subtitle="Explore a workspace built around the work you do." action={<Chip label="DEMO" tone="warning" />} />
      <View style={styles.demoNote}><Ionicons name="information-circle-outline" size={20} color={colors.teal} accessible={false} /><Text style={styles.demoCopy}>No account needed. Demo access only; changes are saved on this device.</Text></View>
      <SectionTitle title="How will you use CleanOS?" />
      <View style={styles.roleList}>
        {roles.map(item => <Pressable key={item.id} onPress={() => { if (!busy) setRole(item.id); }} disabled={busy} accessibilityRole="radio" accessibilityState={{ selected: role === item.id, disabled: busy }} accessibilityLabel={`${item.title}. ${item.description}`} style={({ pressed }) => [styles.roleCard, role === item.id && styles.roleSelected, pressed && { opacity: 0.75 }]}>
          <IconBadge name={item.icon} /><View style={styles.grow}><Text style={styles.roleTitle}>{item.title}</Text><Text style={styles.roleDescription}>{item.description}</Text></View><Ionicons name={role === item.id ? 'radio-button-on' : 'radio-button-off'} size={23} color={role === item.id ? colors.teal : colors.muted} accessible={false} />
        </Pressable>)}
      </View>
      {role === 'staff' ? <Card><SectionTitle title="Choose a demo staff member" /><View style={styles.chips}>{state.staff.map(member => <Chip key={member.id} label={member.name} selected={staffId === member.id} onPress={() => { if (!busy) setStaffId(member.id); }} />)}</View><Text style={styles.caption}>You will see and update this person’s assigned work.</Text></Card> : null}
      {error ? <Notice tone="error" message={error} /> : null}
      <Button label={`Continue as ${roles.find(item => item.id === role)?.title}`} icon="arrow-forward" onPress={() => { void enter(); }} loading={busy} disabled={!staffId} />
      <View style={styles.footer}><Text style={styles.footnote}>Aura Tradings · India</Text><Text style={styles.developer}>Developed by Aura Builds</Text></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  brandCopy: { flex: 1, minWidth: 0, gap: 3 },
  brandText: { color: colors.navy, fontSize: 24, fontWeight: '800', letterSpacing: -0.6 },
  brandCaption: { color: colors.muted, fontSize: 9, lineHeight: 15, fontWeight: '600', letterSpacing: 0.9 },
  demoNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: 14, backgroundColor: colors.tealLight, padding: 14 },
  demoCopy: { color: colors.tealDark, fontSize: 13, lineHeight: 20, flex: 1 },
  roleList: { gap: 12 },
  roleCard: { backgroundColor: colors.white, padding: 17, borderWidth: 1, borderColor: colors.border, borderRadius: 18, flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 106 },
  roleSelected: { borderColor: colors.teal, borderWidth: 2, padding: 16, backgroundColor: colors.tealLight },
  grow: { flex: 1, minWidth: 0, gap: 5 },
  roleTitle: { color: colors.navy, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  roleDescription: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  caption: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  footer: { gap: 5, paddingVertical: 8 },
  footnote: { color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 19 },
  developer: { color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 19, fontWeight: '600' },
});
