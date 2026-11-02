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
  const today = useBusinessDate();
  const metrics = dashboardMetrics(state);
  const tasks = getVisibleTasks(state)
    .filter(task => task.dueDate === today)
    .sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed'))
    .slice(0, 3);
  const lowStock = getLowStockItems(state);
  const isStaff = state.session?.role === 'staff';
  const firstName = state.staff.find(member => member.id === state.session?.staffId)?.name.split(' ')[0];
  const areaCount = state.facilities.reduce((count, facility) => count + facility.areas.length, 0);

  return (
    <Screen>
      <Header
        eyebrow={formatDate(today)}
        title={isStaff ? firstName ? `${firstName}’s workspace` : 'Your workspace' : 'Operations overview'}
        subtitle={isStaff ? 'Your tasks, progress and supplies for the day.' : 'A clear view of your cleaning operations.'}
        action={<Chip label="DEMO" tone="warning" />}
      />

      <View style={styles.section}>
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.overline}>TODAY’S COMPLETION</Text>
            <Ionicons name="checkmark-done-outline" size={25} color="#A4E1D5" accessible={false} />
          </View>
          <View style={styles.progressSummary}>
            <Text style={styles.progressValue}>{metrics.completionPercent}<Text style={styles.percent}>%</Text></Text>
            <View style={styles.progressCopy}>
              <Text style={styles.progressTitle}>Daily cleaning</Text>
              <Text style={styles.progressCaption}>
                {metrics.totalToday === 0 ? 'No tasks scheduled today' : `${metrics.completedToday} of ${metrics.totalToday} tasks completed`}
              </Text>
            </View>
          </View>
          <View
            style={styles.progressTrack}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Today's task completion"
            accessibilityValue={{ min: 0, max: 100, now: metrics.completionPercent }}
          >
            <View style={[styles.progressFill, { width: `${metrics.completionPercent}%` }]} />
          </View>
          <View style={styles.progressFooter}>
            <View style={styles.progressStatus}>
              <View style={styles.statusDot} />
              <Text style={styles.progressCaption}>{metrics.inProgressToday} in progress</Text>
            </View>
            <Text style={styles.progressCaption}>{metrics.pendingToday} remaining today</Text>
          </View>
        </View>
        <View style={styles.metrics}>
          <Metric label="Today’s tasks" value={metrics.totalToday} icon="clipboard-outline" />
          <Metric label="Remaining today" value={metrics.pendingToday} icon="time-outline" tone="warning" />
          <Metric label="Completed today" value={metrics.completedToday} icon="checkmark-circle-outline" tone="success" />
          <Metric label="Low-stock items" value={metrics.lowStockCount} icon="cube-outline" tone={metrics.lowStockCount ? 'danger' : 'success'} />
        </View>
      </View>

      <View style={styles.quickActions}>
        <Button label={isStaff ? 'My tasks' : 'Manage tasks'} icon="checkbox-outline" onPress={() => router.push('/tasks')} style={styles.quickAction} />
        <Button label="View supplies" icon="cube-outline" variant="secondary" onPress={() => router.push('/inventory')} style={styles.quickAction} />
      </View>

      <View style={styles.section}>
        <SectionTitle title={isStaff ? 'Your work today' : 'Today’s task board'} action={<Button label="View all" variant="ghost" onPress={() => router.push('/tasks')} />} />
        {tasks.length ? (
          <Card style={styles.taskContainer}>
            {tasks.map((task, index) => {
              const facility = state.facilities.find(item => item.id === task.facilityId);
              const area = facility?.areas.find(item => item.id === task.areaId);
              const assignee = state.staff.find(member => member.id === task.assigneeId);
              return (
                <Pressable
                  key={task.id}
                  onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${task.title}, ${statusLabel[task.status]}${task.priority === 'high' ? ', high priority' : ''}`}
                  style={({ pressed }) => [styles.task, index > 0 && styles.taskBorder, pressed && styles.pressed]}
                >
                  <IconBadge
                    name={task.status === 'completed' ? 'checkmark-circle-outline' : 'clipboard-outline'}
                    color={task.status === 'completed' ? colors.success : colors.teal}
                    background={task.status === 'completed' ? colors.successLight : colors.tealLight}
                  />
                  <View style={styles.grow}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <Text style={styles.taskMeta}>{facility?.name} · {area?.name}</Text>
                    {!isStaff && assignee ? <Text style={styles.assignee}>{assignee.name}</Text> : null}
                    <View style={styles.taskChips}>
                      <Chip label={statusLabel[task.status]} tone={task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'warning' : 'neutral'} />
                      {task.priority === 'high' ? <Chip label="High priority" tone="danger" /> : null}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} accessible={false} />
                </Pressable>
              );
            })}
            {metrics.totalToday > tasks.length ? <Text style={styles.boardCaption}>Showing {tasks.length} of {metrics.totalToday} tasks scheduled today</Text> : null}
          </Card>
        ) : (
          <EmptyState title="No tasks scheduled today" message="Open the task board to view tasks for other dates." icon="calendar-outline" action={<Button label="Open task board" variant="secondary" onPress={() => router.push('/tasks')} />} />
        )}
      </View>

      {lowStock.length ? (
        <View style={styles.section}>
          <SectionTitle title="Supplies needing attention" />
          <Card style={styles.stockAlert}>
            <View style={styles.alertHeader}>
              <IconBadge name="alert-circle-outline" color={colors.warning} background={colors.warningLight} />
              <View style={styles.grow}>
                <Text style={styles.alertTitle}>Reorder supplies</Text>
                <Text style={styles.taskMeta}>{lowStock.length} {lowStock.length === 1 ? 'item is' : 'items are'} at or below the stock threshold.</Text>
              </View>
            </View>
            <View>
              {lowStock.slice(0, 2).map((item, index) => (
                <View key={item.id} style={[styles.stockItem, index > 0 && styles.taskBorder]}>
                  <View style={styles.grow}>
                    <Text style={styles.stockName}>{item.name}</Text>
                    <Text style={styles.taskMeta}>Reorder at {item.threshold} {item.unit}</Text>
                  </View>
                  <Text style={styles.stockQuantity}>{item.quantity} {item.unit}</Text>
                </View>
              ))}
            </View>
            {lowStock.length > 2 ? <Text style={styles.taskMeta}>+{lowStock.length - 2} more {lowStock.length - 2 === 1 ? 'item needs' : 'items need'} attention</Text> : null}
            <Button label="Review low stock" variant="secondary" icon="arrow-forward" onPress={() => router.push({ pathname: '/inventory', params: { lowStock: 'true' } })} />
          </Card>
        </View>
      ) : null}

      <Card>
        <View style={styles.alertHeader}>
          <IconBadge name="business-outline" />
          <View style={styles.grow}>
            <Text style={styles.alertTitle}>Your facilities</Text>
            <Text style={styles.taskMeta}>{state.facilities.length} {state.facilities.length === 1 ? 'facility' : 'facilities'} · {areaCount} cleaning {areaCount === 1 ? 'area' : 'areas'}</Text>
          </View>
        </View>
        <Button label="Explore facilities" variant="ghost" icon="arrow-forward" onPress={() => router.push('/facilities')} />
      </Card>
      <Text style={styles.footnote}>Local demo · Dates follow Asia/Kolkata</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  progressCard: { borderRadius: 20, backgroundColor: colors.navy, padding: 20, gap: 16 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  overline: { color: '#B3D0D9', fontSize: 11, fontWeight: '700', letterSpacing: 1.4, flexShrink: 1 },
  progressSummary: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 18, rowGap: 8 },
  progressValue: { color: colors.white, fontSize: 48, fontWeight: '800', letterSpacing: -1.5 },
  percent: { fontSize: 26, color: '#A4E1D5', letterSpacing: 0 },
  progressCopy: { flexGrow: 1, flexShrink: 1, flexBasis: 120, gap: 4 },
  progressTitle: { color: colors.white, fontSize: 16, fontWeight: '700' },
  progressCaption: { color: '#DAE8ED', fontSize: 13, lineHeight: 20 },
  progressTrack: { height: 8, backgroundColor: '#355666', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: '#69CEB7', borderRadius: 4 },
  progressFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: 12, rowGap: 4 },
  progressStatus: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statusDot: { width: 6, height: 6, backgroundColor: '#69CEB7', borderRadius: 3 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickAction: { flex: 1, minWidth: 135 },
  taskContainer: { padding: 0, gap: 0, overflow: 'hidden' },
  task: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, minHeight: 100 },
  taskBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  grow: { flex: 1, minWidth: 0 },
  taskTitle: { color: colors.navy, fontSize: 15, fontWeight: '700', lineHeight: 22 },
  taskMeta: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 3 },
  assignee: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 2 },
  taskChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  boardCaption: { color: colors.muted, fontSize: 12, lineHeight: 19, backgroundColor: '#F8FAFB', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  stockAlert: { borderColor: '#E8D7AF' },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  alertTitle: { color: colors.navy, fontWeight: '700', fontSize: 16, lineHeight: 23 },
  stockItem: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 12, rowGap: 4, paddingVertical: 12 },
  stockName: { color: colors.navy, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  stockQuantity: { color: colors.warning, fontSize: 14, lineHeight: 21, fontWeight: '700', flexShrink: 1 },
  pressed: { backgroundColor: colors.tealLight },
  footnote: { color: colors.muted, textAlign: 'center', fontSize: 11, lineHeight: 17, paddingVertical: 4 },
});
