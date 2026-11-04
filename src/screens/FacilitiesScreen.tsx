import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { getVisibleTasks, type Facility } from '../domain';
import { useApp } from '../state/AppProvider';
import CloudRefreshButton from '../cloud/components/CloudRefreshButton';
import { Button, Card, Chip, colors, EmptyState, Header, IconBadge, Notice, Screen } from '../ui';
import { FacilityEditor } from '../cloud/components/FacilityEditor';

const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export default function FacilitiesScreen() {
  const { state, cloud, busy } = useApp();
  const [editing, setEditing] = useState<Facility | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [feedback, setFeedback] = useState('');
  const tasks = getVisibleTasks(state);
  const isStaff = state.session?.role === 'staff';
  const canEdit = !!cloud && state.session?.role === 'admin';
  const facilities = state.facilities.filter(facility => facility.active !== false || (canEdit && showArchived));
  const areaCount = facilities.reduce((total, facility) => total + facility.areas.filter(area => showArchived || area.active !== false).length, 0);
  function addFacility() {
    setEditing({ id: newId('facility'), name: '', type: 'Office', address: '', active: true,
      areas: [{ id: newId('area'), name: '', active: true }] });
  }
  return (
    <Screen>
      <Header eyebrow="WORKSPACE DIRECTORY" title="Facilities & areas" subtitle="A clear view of the spaces your team maintains." action={<View style={styles.chips}><CloudRefreshButton />{canEdit ? <Button label="Add facility" icon="add-outline" disabled={busy} onPress={addFacility} /> : null}</View>} />
      {feedback ? <Notice tone="success" message={feedback} /> : null}
      <View style={styles.directorySummary}>
        <View style={styles.summaryItem}><Text style={styles.summaryValue}>{facilities.length}</Text><Text style={styles.summaryLabel}>Facilities</Text></View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}><Text style={styles.summaryValue}>{areaCount}</Text><Text style={styles.summaryLabel}>Cleaning areas</Text></View>
      </View>
      {canEdit ? <View style={styles.chips}><Chip label="Active facilities" selected={!showArchived} onPress={() => setShowArchived(false)} /><Chip label="Include archived" selected={showArchived} onPress={() => setShowArchived(true)} /></View> : null}
      {facilities.length ? facilities.map(facility => {
        const facilityTasks = tasks.filter(task => task.facilityId === facility.id);
        const done = facilityTasks.filter(task => task.status === 'completed').length;
        const percent = facilityTasks.length ? Math.round(done / facilityTasks.length * 100) : 0;
        return <Card key={facility.id}>
          <View style={styles.facilityHeader}><IconBadge name={facility.type.toLowerCase().includes('hospital') ? 'medkit-outline' : facility.type.toLowerCase().includes('hotel') ? 'bed-outline' : 'business-outline'} /><View style={styles.grow}><Text style={styles.name}>{facility.name}</Text><Text style={styles.address}>{facility.address}</Text></View></View>
          <View style={styles.chips}><Chip label={facility.type} /><Chip label={`${facility.areas.filter(area => area.active !== false).length} active areas`} />{facility.active === false ? <Chip label="Archived" tone="warning" /> : null}</View>
          <View style={styles.areaHeader}><Text style={styles.areaLabel}>CLEANING AREAS</Text><Text style={styles.areaHint}>Open tasks</Text></View>
          <View style={styles.areas}>{facility.areas.filter(area => showArchived || area.active !== false).map((area, index) => {
            const count = facilityTasks.filter(task => task.areaId === area.id && task.status !== 'completed').length;
            return <Pressable key={area.id} accessibilityRole="button" accessibilityLabel={`View tasks for ${area.name}, ${count} open${area.active === false ? ', archived' : ''}`} onPress={() => router.push({ pathname: '/tasks', params: { facilityId: facility.id, areaId: area.id } })} style={({ pressed }) => [styles.area, index > 0 && styles.areaDivider, pressed && styles.pressed]}><Ionicons name="location-outline" size={18} color={colors.teal} accessible={false} /><Text style={styles.areaName}>{area.name}{area.active === false ? ' · Archived' : ''}</Text><View style={[styles.areaCountBadge, count === 0 && styles.areaCountClear]}><Text style={[styles.areaCount, count === 0 && styles.areaCountClearText]}>{count}</Text></View><Ionicons name="chevron-forward" size={16} color={colors.muted} accessible={false} /></Pressable>;
          })}</View>
          <View style={styles.completion}>
            <Text style={styles.summary}>{done} of {facilityTasks.length} {isStaff ? 'assigned tasks' : 'tasks'} completed · all dates</Text>
            <View style={styles.progressTrack} accessible accessibilityRole="progressbar" accessibilityLabel={`${facility.name} task completion, all dates`} accessibilityValue={{ min: 0, max: 100, now: percent }}><View style={[styles.progressFill, { width: `${percent}%` }]} /></View>
          </View>
          <Button label="View facility tasks" variant="secondary" icon="clipboard-outline" onPress={() => router.push({ pathname: '/tasks', params: { facilityId: facility.id } })} />
          {canEdit ? <Button label="Edit facility & areas" variant="ghost" icon="create-outline" disabled={busy} onPress={() => setEditing(facility)} /> : null}
        </Card>;
      }) : <EmptyState icon="business-outline" title="No facilities yet" message={canEdit ? 'Add your first facility and its cleaning areas to start assigning tasks.' : 'Your admin can add facilities and cleaning areas.'} action={canEdit ? <Button label="Add facility" onPress={addFacility} /> : undefined} />}
      <Text style={styles.footnote}>{cloud ? 'Archived facilities and areas keep their previous task history.' : 'Demo facilities are preconfigured for this prototype.'}</Text>
      {editing && cloud ? <FacilityEditor key={editing.id} initial={editing} allowCreateLocation={!cloud.locations.some(location => location.facilityId === editing.id)} createLocationDefault={cloud.workspace.inventoryMode === 'facility'} onSave={async (facility, createLocation) => { await cloud.saveFacility(facility, createLocation); setFeedback('Facility and cleaning areas saved.'); }} onClose={() => setEditing(null)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  directorySummary: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.navy, borderRadius: 20, paddingVertical: 20, paddingHorizontal: 22, gap: 20 },
  summaryItem: { flex: 1, gap: 4 },
  summaryValue: { color: colors.white, fontSize: 28, lineHeight: 35, fontWeight: '700' },
  summaryLabel: { color: '#C7DADF', fontSize: 13, lineHeight: 20 },
  summaryDivider: { width: 1, alignSelf: 'stretch', backgroundColor: '#355361' },
  facilityHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  grow: { flex: 1 },
  name: { color: colors.navy, fontSize: 18, lineHeight: 26, fontWeight: '700' },
  address: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  areaHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 3 },
  areaLabel: { fontSize: 10, lineHeight: 17, fontWeight: '700', color: colors.muted, letterSpacing: 1.2 },
  areaHint: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  areas: { backgroundColor: colors.background, paddingHorizontal: 12, borderRadius: 14 },
  area: { flexDirection: 'row', gap: 9, alignItems: 'center', minHeight: 54, paddingVertical: 12 },
  areaDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  areaName: { color: colors.navy, fontSize: 14, fontWeight: '500', flex: 1, lineHeight: 22 },
  areaCountBadge: { minWidth: 26, minHeight: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7, backgroundColor: colors.warningLight },
  areaCount: { color: colors.warning, fontSize: 12, lineHeight: 19, fontWeight: '700' },
  areaCountClear: { backgroundColor: colors.tealLight },
  areaCountClearText: { color: colors.teal },
  completion: { gap: 9, paddingVertical: 4 },
  summary: { color: colors.muted, fontSize: 12, lineHeight: 20 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: colors.tealLight, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: colors.teal },
  footnote: { color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 20 },
  pressed: { opacity: 0.65 },
});
