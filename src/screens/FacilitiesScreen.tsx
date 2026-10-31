import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { getVisibleTasks } from '../domain';
import { useApp } from '../state/AppProvider';
import { Button, Card, Chip, colors, EmptyState, Header, IconBadge, Screen } from '../ui';

export default function FacilitiesScreen() {
  const { state } = useApp();
  const tasks = getVisibleTasks(state);
  const isStaff = state.session?.role === 'staff';
  return (
    <Screen>
      <Header eyebrow="CLEANING OPERATIONS" title="Your facilities" subtitle="Every space has a place. Explore the areas your team keeps clean." />
      {state.facilities.length ? state.facilities.map(facility => {
        const facilityTasks = tasks.filter(task => task.facilityId === facility.id);
        const done = facilityTasks.filter(task => task.status === 'completed').length;
        return <Card key={facility.id}>
          <View style={styles.facilityHeader}><IconBadge name={facility.type.toLowerCase().includes('hospital') ? 'medkit-outline' : facility.type.toLowerCase().includes('hotel') ? 'bed-outline' : 'business-outline'} /><View style={styles.grow}><Text style={styles.name}>{facility.name}</Text><Text style={styles.address}>{facility.address}</Text></View></View>
          <View style={styles.chips}><Chip label={facility.type} /><Chip label={`${facility.areas.length} cleaning areas`} /></View>
          <View style={styles.divider} />
          <Text style={styles.areaLabel}>CLEANING AREAS</Text>
          <View style={styles.areas}>{facility.areas.map(area => {
            const count = facilityTasks.filter(task => task.areaId === area.id && task.status !== 'completed').length;
            return <Pressable key={area.id} accessibilityRole="button" accessibilityLabel={`View tasks for ${area.name}`} onPress={() => router.push({ pathname: '/tasks', params: { facilityId: facility.id, areaId: area.id } })} style={({ pressed }) => [styles.area, pressed && { opacity: 0.65 }]}><Ionicons name="location-outline" size={18} color={colors.teal} accessible={false} /><Text style={styles.areaName}>{area.name}</Text><Text style={styles.areaCount}>{count} open</Text><Ionicons name="chevron-forward" size={16} color={colors.muted} accessible={false} /></Pressable>;
          })}</View>
          <Text style={styles.summary}>{done} of {facilityTasks.length} {isStaff ? 'of your ' : ''}tasks completed · all dates</Text>
          <Button label="View facility tasks" variant="secondary" icon="clipboard-outline" onPress={() => router.push({ pathname: '/tasks', params: { facilityId: facility.id } })} />
        </Card>;
      }) : <EmptyState icon="business-outline" title="No facilities yet" message="Facilities and cleaning areas will appear here when available." />}
      <Text style={styles.footnote}>Demo facilities are preconfigured for this prototype.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  facilityHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  grow: { flex: 1 },
  name: { color: colors.navy, fontSize: 18, lineHeight: 25, fontWeight: '700' },
  address: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  areaLabel: { fontSize: 10, fontWeight: '700', color: colors.muted, letterSpacing: 1.4 },
  areas: { gap: 2 },
  area: { flexDirection: 'row', gap: 9, alignItems: 'center', minHeight: 48, paddingVertical: 9 },
  areaName: { color: colors.navy, fontSize: 14, flex: 1, lineHeight: 21 },
  areaCount: { color: colors.muted, fontSize: 12 },
  summary: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  footnote: { color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 19 },
});
