import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { Role } from '../domain/types';
import { useApp } from '../state/AppProvider';
import { Button, Card, Chip, colors, Header, IconBadge, Notice, Screen, SectionTitle } from '../ui';

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
      <View style={styles.brand}><Ionicons name="sparkles" size={23} color={colors.teal} accessible={false} /><Text style={styles.brandText}>CleanOS</Text><Chip label="DEMO" tone="warning" /></View>
      <Header eyebrow="YOUR WORKSPACE AWAITS" title="See your day, clearly." subtitle="Choose a role to explore how your team works together." />
      <Notice message="This is demo access. There is no real authentication, and all changes stay on this device." />
      <View style={styles.roleList}>
        {roles.map(item => <Pressable key={item.id} onPress={() => { if (!busy) setRole(item.id); }} disabled={busy} accessibilityRole="radio" accessibilityState={{ selected: role === item.id, disabled: busy }} accessibilityLabel={`${item.title}. ${item.description}`} style={({ pressed }) => [styles.roleCard, role === item.id && styles.roleSelected, pressed && { opacity: 0.75 }]}>
          <IconBadge name={item.icon} /><View style={styles.grow}><Text style={styles.roleTitle}>{item.title}</Text><Text style={styles.roleDescription}>{item.description}</Text></View><Ionicons name={role === item.id ? 'radio-button-on' : 'radio-button-off'} size={23} color={role === item.id ? colors.teal : colors.muted} accessible={false} />
        </Pressable>)}
      </View>
      {role === 'staff' ? <Card><SectionTitle title="Choose a demo staff member" /><View style={styles.chips}>{state.staff.map(member => <Chip key={member.id} label={member.name} selected={staffId === member.id} onPress={() => { if (!busy) setStaffId(member.id); }} />)}</View><Text style={styles.caption}>You will see and update this person’s assigned work.</Text></Card> : null}
      {error ? <Notice tone="error" message={error} /> : null}
      <Button label={`Continue as ${roles.find(item => item.id === role)?.title}`} icon="arrow-forward" onPress={() => { void enter(); }} loading={busy} disabled={!staffId} />
      <Text style={styles.footnote}>AURA TRADINGS · INDIA{ '\n' }Smart Housekeeping Management</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8 },
  brandText: { color: colors.navy, fontSize: 24, fontWeight: '800', flex: 1, letterSpacing: -0.6 },
  roleList: { gap: 12 },
  roleCard: { backgroundColor: colors.white, padding: 18, borderWidth: 1, borderColor: colors.border, borderRadius: 18, flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 100 },
  roleSelected: { borderColor: colors.teal, borderWidth: 2, padding: 17, backgroundColor: '#F3FBF8' },
  grow: { flex: 1, gap: 5 },
  roleTitle: { color: colors.navy, fontSize: 16, fontWeight: '700' },
  roleDescription: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  caption: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  footnote: { color: colors.muted, fontSize: 11, textAlign: 'center', lineHeight: 20, letterSpacing: 0.7, paddingVertical: 8 },
});
