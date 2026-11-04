import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Role, Staff } from '../../domain';
import { formatDate } from '../../domain';
import { useApp } from '../../state/AppProvider';
import { Button, Card, Chip, EmptyState, Field, Header, IconBadge, ModalSheet, Notice, Screen, SectionTitle, colors } from '../../ui';
import type { CloudCommands, WorkspaceInvite } from '../types';

const labels: Record<Role, string> = { admin: 'Facility Admin', supervisor: 'Supervisor', staff: 'Cleaning Staff' };
const message = (error: unknown) => error instanceof Error ? error.message : 'Could not complete this request. Please retry.';

export default function TeamScreen() {
  const { state, cloud, busy } = useApp();
  if (!cloud || state.session?.role !== 'admin') return <Screen><EmptyState icon="lock-closed-outline" title="Admin access required" message="Your facility admin manages staff accounts and invitations." /></Screen>;
  return <TeamWorkspace key={cloud.workspace.id} cloud={cloud} members={state.staff} busy={busy} />;
}

function TeamWorkspace({ cloud, members, busy }: { cloud: CloudCommands; members: Staff[]; busy: boolean }) {
  // An initial fetch belongs to this keyed workspace, while manual refresh uses current commands.
  const [initialCloud] = useState(cloud);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('staff');
  const [creating, setCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState<{ code: string; email: string } | null>(null);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void initialCloud.listInvites().then(rows => { if (active) setInvites(rows); })
      .catch(caught => { if (active) setError(message(caught)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [initialCloud]);

  async function refresh() {
    setLoading(true); setError('');
    try { setInvites(await cloud.listInvites()); }
    catch (caught) { setError(message(caught)); }
    finally { setLoading(false); }
  }
  async function createInvite() {
    const target = email.trim().toLowerCase();
    setError(''); setFeedback('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target) || target.length > 254) {
      setError('Enter the staff member’s email address.'); return;
    }
    setCreating(true);
    try {
      const code = await cloud.createInvite(target, role);
      setCreatedCode({ code, email: target });
      setEmail('');
      setInvites(await cloud.listInvites());
      setFeedback('Invitation created. Share its code with this person privately.');
    } catch (caught) { setError(message(caught)); }
    finally { setCreating(false); }
  }
  async function revoke(invite: WorkspaceInvite) {
    setError(''); setRevokingId(invite.id);
    try {
      await cloud.revokeInvite(invite.id);
      setInvites(await cloud.listInvites());
      if (createdCode?.email === invite.email) setCreatedCode(null);
      setFeedback('Invitation revoked. Its code can no longer be used.');
    } catch (caught) { setError(message(caught)); }
    finally { setRevokingId(null); }
  }

  return <Screen>
    <Header eyebrow={cloud.workspace.name} title="Team & access" subtitle="Invite staff and manage their workspace permissions." />
    {error ? <Notice message={error} tone="error" /> : null}
    {feedback ? <Notice message={feedback} tone="success" /> : null}
    <Card>
      <SectionTitle title="Invite a team member" />
      <Field label="Staff email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholder="name@example.com" editable={!creating && !busy} />
      <Text style={styles.label}>Workspace role</Text>
      <View style={styles.options}>{(['staff', 'supervisor', 'admin'] as const).map(value => <Chip key={value} label={labels[value]} selected={role === value} onPress={() => { if (!creating && !busy) setRole(value); }} />)}</View>
      <Text style={styles.caption}>Cleaning Staff update assigned work. Supervisors manage tasks and stock. Facility Admins also manage facilities and team access.</Text>
      <Button label="Create invitation" icon="person-add-outline" loading={creating} disabled={busy} onPress={() => { void createInvite(); }} />
    </Card>
    {createdCode ? <Card style={styles.inviteCodeCard}>
      <SectionTitle title="Share this invitation code" />
      <Text style={styles.caption}>For {createdCode.email}</Text>
      <Text selectable accessibilityLabel={`Invitation code ${createdCode.code}`} style={styles.code}>{createdCode.code}</Text>
      <Notice message="Long-press the code to copy it. The recipient must create and verify an account using this same email, then choose Join workspace and enter the code. This code is shown only after creation." />
      <Button label="Hide code" variant="ghost" onPress={() => setCreatedCode(null)} />
    </Card> : null}
    <SectionTitle title="Team members" action={<Text style={styles.caption}>{members.filter(member => member.active !== false).length} active</Text>} />
    {members.map(member => <Card key={member.id}>
      <View style={styles.row}><IconBadge name="person-outline" /><View style={styles.grow}><Text style={styles.name}>{member.name}</Text><Text style={styles.caption}>{labels[member.role ?? 'staff']}</Text></View><Chip label={member.active === false ? 'Inactive' : 'Active'} tone={member.active === false ? 'neutral' : 'success'} /></View>
      <Button label="Edit access" icon="create-outline" variant="secondary" disabled={busy} accessibilityLabel={`Edit workspace access for ${member.name}`} onPress={() => setEditing(member)} />
    </Card>)}
    <SectionTitle title="Invitations" action={<Button label="Refresh invitations" variant="ghost" loading={loading} onPress={() => { void refresh(); }} />} />
    {!loading && !invites.length ? <EmptyState icon="mail-outline" title="No invitations yet" message="Create an invitation above when a team member is ready to join." /> : null}
    {invites.map(invite => <Card key={invite.id}>
      <Text style={styles.name}>{invite.email}</Text>
      <View style={styles.options}><Chip label={labels[invite.role]} /><Chip label={invite.usedAt ? 'Accepted' : 'Not accepted'} tone={invite.usedAt ? 'success' : 'neutral'} /></View>
      <Text style={styles.caption}>Expires {formatDate(invite.expiresAt)}</Text>
      {!invite.usedAt ? <Button label="Revoke invitation" variant="secondary" disabled={busy || creating || revokingId !== null} loading={revokingId === invite.id} onPress={() => { void revoke(invite); }} /> : null}
    </Card>)}
    {editing ? <MemberEditor key={editing.id} member={editing} onSave={async (name, nextRole, active) => { await cloud.updateMember(editing.id, name, nextRole, active, editing.revision); setFeedback('Team member access updated.'); }} onClose={() => setEditing(null)} /> : null}
  </Screen>;
}

function MemberEditor({ member, onSave, onClose }: { member: Staff; onSave: (name: string, role: Role, active: boolean) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState(member.name);
  const [role, setRole] = useState<Role>(member.role ?? 'staff');
  const [active, setActive] = useState(member.active !== false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    setError('');
    if (!name.trim() || name.trim().length > 120) { setError('Enter a name up to 120 characters.'); return; }
    setSaving(true);
    try { await onSave(name.trim(), role, active); onClose(); }
    catch (caught) { setError(message(caught)); }
    finally { setSaving(false); }
  }
  return <ModalSheet visible title="Edit team member" onClose={() => { if (!saving) onClose(); }}>
    <Field label="Display name" value={name} onChangeText={setName} editable={!saving} />
    <SectionTitle title="Workspace role" />
    <View style={styles.options}>{(['staff', 'supervisor', 'admin'] as const).map(value => <Chip key={value} label={labels[value]} selected={role === value} onPress={() => { if (!saving) setRole(value); }} />)}</View>
    <SectionTitle title="Workspace access" />
    <View style={styles.options}><Chip label="Active" selected={active} onPress={() => { if (!saving) setActive(true); }} /><Chip label="Inactive" selected={!active} onPress={() => { if (!saving) setActive(false); }} /></View>
    <Notice message={active ? 'The workspace must retain at least one active Facility Admin.' : 'Deactivation removes this person’s access to this workspace. Their previous tasks and stock history remain saved.'} />
    {error ? <Notice tone="error" message={error} /> : null}
    <Button label="Save member access" loading={saving} onPress={() => { void save(); }} />
  </ModalSheet>;
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  grow: { flex: 1, minWidth: 120, gap: 3 },
  label: { color: colors.navy, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  name: { color: colors.navy, fontSize: 16, lineHeight: 23, fontWeight: '700' },
  caption: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  inviteCodeCard: { backgroundColor: colors.tealLight, borderColor: '#C7DED9' },
  code: { color: colors.navy, fontSize: 15, lineHeight: 24, fontWeight: '600' },
});
