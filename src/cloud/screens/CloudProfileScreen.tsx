import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useAuth } from '../../auth/AuthProvider';
import { useApp } from '../../state/AppProvider';
import { Button, Card, Chip, Field, Header, ModalSheet, Notice, Screen, SectionTitle, colors } from '../../ui';
import { BrandLogo } from '../../ui/BrandLogo';

const labels = { admin: 'Facility Admin', supervisor: 'Housekeeping Supervisor', staff: 'Cleaning Staff' };
export default function CloudProfileScreen() {
  const { state, cloud, busy } = useApp();
  const auth = useAuth();
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [addingLocation, setAddingLocation] = useState(false);
  const [locationName, setLocationName] = useState('');
  if (!cloud || !state.session) return null;
  const member = state.staff.find(item => item.id === state.session?.staffId);
  async function run(operation: () => Promise<void>) {
    setError(''); setFeedback('');
    try { await operation(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not complete the request. Please try again.'); }
  }
  return <Screen>
    <Header eyebrow="YOUR WORKSPACE" title="Profile & settings" subtitle="Your account, team access and workspace preferences." />
    {error ? <Notice message={error} tone="error" /> : null}
    {feedback ? <Notice message={feedback} tone="success" /> : null}
    <Card>
      <Text style={styles.name}>{member?.name}</Text>
      <Text style={styles.caption}>{auth.user?.email}</Text>
      <Chip label={labels[state.session.role]} />
      <Text style={styles.description}>{cloud.workspace.name}</Text>
      {state.session.role === 'admin' ? <Button label="Manage team & invitations" icon="people-outline" onPress={() => router.push('/team')} /> : null}
      <Button label="Choose another workspace" variant="secondary" icon="business-outline" disabled={busy} onPress={cloud.changeWorkspace} />
    </Card>
    <SectionTitle title="Workspace preferences" />
    <Card>
      <Text style={styles.setting}>India · Indian Rupees (₹)</Text>
      <Text style={styles.caption}>Dates and times follow Asia/Kolkata.</Text>
      <Text style={styles.setting}>Shared tasks and inventory</Text>
      <Text style={styles.caption}>Changes are saved on the server. An internet connection is required to save work. The app refreshes while open and when you return to it.</Text>
      <Button label="Refresh workspace" variant="secondary" icon="refresh-outline" loading={cloud.refreshing} onPress={() => { void run(cloud.refresh); }} />
    </Card>
    {state.session.role === 'admin' ? <Card>
      <SectionTitle title="Stock rooms" />
      {cloud.locations.filter(item => item.active).map(item => <View key={item.id} style={styles.location}><Text style={styles.description}>{item.name}</Text>{item.id === cloud.locationId ? <Chip label="Selected" tone="success" /> : null}</View>)}
      <Button label="Add shared stock room" variant="secondary" icon="add-outline" onPress={() => setAddingLocation(true)} disabled={busy} />
      <Text style={styles.caption}>You can also create a facility stock room while adding or editing that facility.</Text>
    </Card> : null}
    <SectionTitle title="Account" />
    <Card>
      <Button label="Send password reset email" variant="secondary" icon="key-outline" disabled={busy} onPress={() => { void run(async () => { if (!auth.user?.email) throw new Error('Your email address is unavailable.'); await auth.sendPasswordReset(auth.user.email); setFeedback('A reset link has been requested. Open it on this device to change your password.'); }); }} />
      <Button label="Sign out of this device" variant="secondary" icon="log-out-outline" disabled={busy} onPress={() => Alert.alert('Sign out?', 'Your workspace records remain on the server.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', onPress: () => { void run(cloud.signOut); } }])} />
    </Card>
    <Card>
      <View style={styles.about}><BrandLogo size={52} decorative /><View style={styles.grow}><Text style={styles.name}>CleanOS</Text><Text style={styles.description}>Smart Housekeeping Management</Text></View></View>
      <Text style={styles.description}>Aura Tradings, India</Text>
      <Text style={styles.setting}>Developed by Aura Builds</Text>
      <Text style={styles.caption}>Version {Constants.expoConfig?.version ?? '2.0.0'} · Shared workspace</Text>
    </Card>
    <ModalSheet visible={addingLocation} title="Add stock room" onClose={() => { if (!busy) setAddingLocation(false); }}>
      <Field label="Stock room name" value={locationName} onChangeText={setLocationName} placeholder="e.g. Central supplies" editable={!busy} />
      {error ? <Notice message={error} tone="error" /> : null}
      <Button label="Create stock room" loading={busy} onPress={() => { void run(async () => { if (!locationName.trim()) throw new Error('Enter a stock room name.'); await cloud.createLocation(locationName.trim()); setLocationName(''); setAddingLocation(false); }); }} />
    </ModalSheet>
  </Screen>;
}
const styles = StyleSheet.create({
  name: { color: colors.navy, fontSize: 21, lineHeight: 29, fontWeight: '700' },
  caption: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  description: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  setting: { color: colors.navy, fontSize: 15, lineHeight: 23, fontWeight: '600' },
  location: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  about: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1, minWidth: 0 },
});
