import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useApp } from '../state/AppProvider';
import CloudRefreshButton from '../cloud/components/CloudRefreshButton';
import { canManageTasks, formatDate, getVisibleTasks } from '../domain';
import { useBusinessDate } from '../state/useBusinessDate';
import { Button, Card, Chip, EmptyState, Field, Header, Screen, colors } from '../ui';
import TaskEditor from './TaskEditor';

const statusLabels = { pending: 'Pending', in_progress: 'In progress', completed: 'Completed' };
export default function TasksScreen() {
  const { state } = useApp();
  const params = useLocalSearchParams<{ facilityId?: string; areaId?: string; status?: string }>();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [date, setDate] = useState('all');
  const [creating, setCreating] = useState(false);
  const facilityId = typeof params.facilityId === 'string' ? params.facilityId : undefined;
  const areaId = typeof params.areaId === 'string' ? params.areaId : undefined;
  const selectedStatus = params.status ?? status;
  const today = useBusinessDate();
  const isStaff = state.session?.role === 'staff';
  const tasks = getVisibleTasks(state).filter((task) => {
    const facility = state.facilities.find((item) => item.id === task.facilityId);
    const staff = state.staff.find((item) => item.id === task.assigneeId);
    const area = facility?.areas.find((item) => item.id === task.areaId);
    return (!facilityId || task.facilityId === facilityId) && (!areaId || task.areaId === areaId) &&
      (selectedStatus === 'all' || task.status === selectedStatus || (selectedStatus === 'unfinished' && task.status !== 'completed')) &&
      (priority === 'all' || task.priority === priority) &&
      (date === 'all' || (date === 'today' ? task.dueDate === today : task.dueDate < today && task.status !== 'completed')) &&
      `${task.title} ${facility?.name} ${area?.name} ${staff?.name}`.toLowerCase().includes(search.toLowerCase().trim());
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <Screen>
      <Header eyebrow="DAILY OPERATIONS" title={isStaff ? 'My tasks' : 'Task board'} subtitle={isStaff ? 'Your assignments, checklists and daily progress.' : 'Plan the work. Keep every area on track.'} action={<View style={styles.row}><CloudRefreshButton />{canManageTasks(state.session) ? <Button label="New task" icon="add" onPress={() => setCreating(true)} /> : null}</View>} />
      <Card style={styles.filterCard}>
        <Field label="Search tasks" value={search} onChangeText={setSearch} placeholder="Task, facility, area or team member" />
        {facilityId || areaId ? <View style={styles.row}><Chip label={state.facilities.find((facility) => facility.id === facilityId)?.name ?? 'Area filter'} selected /><Button label="Clear area filter" variant="ghost" onPress={() => router.setParams({ facilityId: undefined, areaId: undefined })} /></View> : null}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Status</Text>
          <View style={styles.row}>{['all', 'pending', 'in_progress', 'completed'].map((value) => <Chip key={value} label={value === 'all' ? 'All' : statusLabels[value as keyof typeof statusLabels]} selected={selectedStatus === value} onPress={() => { setStatus(value); router.setParams({ status: undefined }); }} />)}</View>
        </View>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Due date</Text>
          <View style={styles.row}>{['all', 'today', 'overdue'].map((value) => <Chip key={value} label={value === 'all' ? 'All dates' : value === 'today' ? 'Today' : 'Overdue'} selected={date === value} onPress={() => setDate(value)} />)}</View>
        </View>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Priority</Text>
          <View style={styles.row}>{['all', 'high', 'medium', 'low'].map((value) => <Chip key={value} label={value === 'all' ? 'All priorities' : value[0].toUpperCase() + value.slice(1)} selected={priority === value} onPress={() => setPriority(value)} />)}</View>
        </View>
      </Card>
      <View style={styles.resultsHeader}><Text accessibilityRole="header" style={styles.resultsTitle}>{isStaff ? 'Your assignments' : 'Assignments'}</Text><Text style={styles.count}>{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</Text></View>
      {tasks.length === 0 ? <EmptyState icon="checkbox-outline" title="No matching tasks" message="Try another search or filter to find your assignments." /> : tasks.map((task) => {
        const facility = state.facilities.find((item) => item.id === task.facilityId);
        const area = facility?.areas.find((item) => item.id === task.areaId);
        const staff = state.staff.find((item) => item.id === task.assigneeId);
        const done = task.checklist.filter((item) => item.done).length;
        const overdue = task.dueDate < today && task.status !== 'completed';
        const percent = task.checklist.length ? Math.round(done / task.checklist.length * 100) : 0;
        return <Pressable key={task.id} accessibilityRole="button" accessibilityLabel={`Open ${task.title}, ${statusLabels[task.status]}`} onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
          <Card>
            <View style={styles.row}><Chip label={statusLabels[task.status]} tone={task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'warning' : 'neutral'} /><Chip label={`${task.priority[0].toUpperCase()}${task.priority.slice(1)} priority`} tone={task.priority === 'high' ? 'danger' : 'neutral'} /></View>
            <View style={styles.titleRow}><Text style={styles.title}>{task.title}</Text><Ionicons name="chevron-forward" size={20} color={colors.muted} accessible={false} /></View>
            <View style={styles.metaRow}><Ionicons name="location-outline" size={16} color={colors.muted} accessible={false} /><Text style={styles.body}>{facility?.name} · {area?.name}</Text></View>
            <View style={styles.metaRow}><Ionicons name="person-outline" size={16} color={colors.muted} accessible={false} /><Text style={styles.body}>{staff?.name}</Text></View>
            <View style={styles.taskFooter}>
              <View style={styles.metaRow}><Ionicons name="calendar-outline" size={16} color={overdue ? colors.danger : colors.muted} accessible={false} /><Text style={[styles.date, overdue && styles.overdue]}>{overdue ? 'Overdue · ' : ''}{formatDate(task.dueDate)}</Text></View>
              <Text style={styles.checklistCount}>{done}/{task.checklist.length} steps</Text>
            </View>
            <View style={styles.progressTrack} accessible accessibilityRole="progressbar" accessibilityLabel="Checklist completion" accessibilityValue={{ min: 0, max: 100, now: percent }}><View style={[styles.progressFill, { width: `${percent}%` }]} /></View>
          </Card>
        </Pressable>;
      })}
      {creating ? <TaskEditor onClose={() => setCreating(false)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterCard: { gap: 16 },
  filterGroup: { gap: 8 },
  filterLabel: { fontSize: 12, fontWeight: '700', color: colors.muted },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  resultsHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' },
  resultsTitle: { fontSize: 18, fontWeight: '700', color: colors.navy },
  count: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  titleRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  title: { fontSize: 18, lineHeight: 26, fontWeight: '700', color: colors.navy, flex: 1 },
  metaRow: { flexDirection: 'row', gap: 7, alignItems: 'center', flexShrink: 1 },
  body: { fontSize: 13, lineHeight: 21, color: colors.muted, flexShrink: 1 },
  taskFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 3 },
  date: { color: colors.muted, fontSize: 12, lineHeight: 19, fontWeight: '600', flexShrink: 1 },
  overdue: { color: colors.danger },
  checklistCount: { color: colors.teal, fontSize: 12, lineHeight: 19, fontWeight: '700' },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: colors.tealLight, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: colors.teal },
});
