import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { dashboardMetrics, formatDate, getLowStockItems, getVisibleTasks } from '../domain';
import { useApp } from '../state/AppProvider';
import { useBusinessDate } from '../state/useBusinessDate';
import { Button, Card, Chip, colors, EmptyState, Header, IconBadge, Metric, Screen, SectionTitle } from '../ui';

const statusLabel = { pending: 'Pending', in_progress: 'In progress', completed: 'Completed' };

export default function DashboardScreen() {
  const { state } = useApp();
  const metrics = dashboardMetrics(state);
  const today = useBusinessDate();
  const tasks = getVisibleTasks(state).filter(task => task.dueDate === today).sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed')).slice(0, 3);
  const lowStock = getLowStockItems(state);
  const isStaff = state.session?.role === 'staff';
  const name = isStaff ? state.staff.find(member => member.id === state.session?.staffId)?.name.split(' ')[0] : 'team';
  return (
    <Screen>
      <Header eyebrow={`CLEANOS · ${formatDate(today)}`} title={`Hello, ${name ?? 'team'}.`} subtitle={isStaff ? 'Your cleaning day, all in one place.' : 'Here’s how your housekeeping day is shaping up.'} action={<Chip label="DEMO" tone="warning" />} />
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}><View style={styles.grow}><Text style={styles.overline}>TODAY’S PROGRESS</Text><Text style={styles.progressValue}>{metrics.completionPercent}<Text style={styles.percent}>%</Text></Text></View><View style={styles.heroIcon}><Ionicons name="sparkles-outline" size={33} color="#A4E1D5" accessible={false} /></View></View>
        <View style={styles.progressTrack} accessible accessibilityRole="progressbar" accessibilityLabel="Today's task completion" accessibilityValue={{ min: 0, max: 100, now: metrics.completionPercent }}><View style={[styles.progressFill, { width: `${metrics.completionPercent}%` }]} /></View>
        <Text style={styles.progressCaption}>{metrics.completedToday} of {metrics.totalToday} tasks completed today</Text>
      </View>
      <View style={styles.metrics}><Metric label="Today's tasks" value={metrics.totalToday} icon="clipboard-outline" /><Metric label="Unfinished today" value={metrics.pendingToday} icon="time-outline" tone="warning" /><Metric label="Completed today" value={metrics.completedToday} icon="checkmark-circle-outline" tone="success" /><Metric label="Low-stock items" value={metrics.lowStockCount} icon="cube-outline" tone={metrics.lowStockCount ? 'danger' : 'success'} /></View>
      <SectionTitle title="Keep things moving" />
      <View style={styles.quickActions}><Button label={isStaff ? 'My tasks' : 'Manage tasks'} icon="checkbox-outline" onPress={() => router.push('/tasks')} style={styles.quickAction} /><Button label="View supplies" icon="cube-outline" variant="secondary" onPress={() => router.push('/inventory')} style={styles.quickAction} /></View>
      <SectionTitle title={isStaff ? 'Your work today' : 'Today’s task board'} action={<Button label="View all" variant="ghost" onPress={() => router.push('/tasks')} />} />
      {tasks.length ? <Card style={styles.taskContainer}>{tasks.map((task, index) => {
        const facility = state.facilities.find(item => item.id === task.facilityId);
        const area = facility?.areas.find(item => item.id === task.areaId);
        return <Pressable key={task.id} onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })} accessibilityRole="button" accessibilityLabel={`${task.title}, ${statusLabel[task.status]}`} style={({ pressed }) => [styles.task, index > 0 && styles.taskBorder, pressed && { opacity: 0.7 }]}>
          <IconBadge name={task.status === 'completed' ? 'checkmark-circle-outline' : 'clipboard-outline'} color={task.status === 'completed' ? colors.success : colors.teal} /><View style={styles.grow}><Text style={styles.taskTitle}>{task.title}</Text><Text style={styles.taskMeta}>{facility?.name} · {area?.name}</Text><View style={styles.taskChips}><Chip label={statusLabel[task.status]} tone={task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'warning' : 'neutral'} />{task.priority === 'high' ? <Chip label="High priority" tone="danger" /> : null}</View></View><Ionicons name="chevron-forward" size={19} color={colors.muted} accessible={false} />
        </Pressable>;
      })}</Card> : <EmptyState title="A clear day ahead" message="No tasks are scheduled for you today. Open the task board to view other dates." icon="sunny-outline" action={<Button label="Open task board" variant="secondary" onPress={() => router.push('/tasks')} />} />}
      {lowStock.length ? <Card style={styles.stockAlert}><View style={styles.alertHeader}><IconBadge name="alert-circle-outline" color={colors.warning} background={colors.warningLight} /><View style={styles.grow}><Text style={styles.alertTitle}>Time to top up</Text><Text style={styles.taskMeta}>{lowStock.length} {lowStock.length === 1 ? 'item has' : 'items have'} reached the reorder threshold.</Text></View></View><Text style={styles.stockNames}>{lowStock.slice(0, 3).map(item => item.name).join(' · ')}{lowStock.length > 3 ? ` +${lowStock.length - 3} more` : ''}</Text><Button label="Review low stock" variant="secondary" icon="arrow-forward" onPress={() => router.push({ pathname: '/inventory', params: { lowStock: 'true' } })} /></Card> : null}
      <Card><View style={styles.alertHeader}><IconBadge name="business-outline" /><View style={styles.grow}><Text style={styles.alertTitle}>{state.facilities.length} connected demo facilities</Text><Text style={styles.taskMeta}>A place for every cleaning area.</Text></View></View><Button label="Explore facilities" variant="ghost" onPress={() => router.push('/facilities')} /></Card>
      <Text style={styles.footnote}>Local demo · Dates follow Asia/Kolkata</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressCard: { borderRadius: 23, backgroundColor: colors.navy, padding: 22, gap: 15 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  grow: { flex: 1 },
  overline: { color: '#B3D0D9', fontSize: 11, fontWeight: '700', letterSpacing: 1.7 },
  progressValue: { color: colors.white, fontSize: 49, fontWeight: '800', letterSpacing: -2, marginTop: 5 },
  percent: { fontSize: 25, color: '#A4E1D5', letterSpacing: 0 },
  heroIcon: { width: 68, height: 68, backgroundColor: '#204957', borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 9, backgroundColor: '#355666', borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: 9, backgroundColor: '#69CEB7', borderRadius: 5 },
  progressCaption: { color: '#DAE8ED', fontSize: 13, lineHeight: 20 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickAction: { flex: 1, minWidth: 135 },
  taskContainer: { padding: 0, gap: 0 },
  task: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 16, minHeight: 100 },
  taskBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  taskTitle: { color: colors.navy, fontSize: 15, fontWeight: '700', lineHeight: 21 },
  taskMeta: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 4 },
  taskChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  stockAlert: { borderColor: '#EDD6A4' },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  alertTitle: { color: colors.navy, fontWeight: '700', fontSize: 16 },
  stockNames: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  footnote: { color: colors.muted, textAlign: 'center', fontSize: 11, paddingVertical: 4 },
});
