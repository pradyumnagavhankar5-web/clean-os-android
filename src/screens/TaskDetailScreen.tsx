import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../state/AppProvider';
import { canManageTasks, canUpdateTask, formatDate, type Action } from '../domain';
import { Button, Card, Chip, EmptyState, Header, Notice, Screen, SectionTitle, colors } from '../ui';
import TaskEditor from './TaskEditor';

const statusLabels = { pending: 'Pending', in_progress: 'In progress', completed: 'Completed' };
export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, act, busy } = useApp();
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const task = state.tasks.find((item) => item.id === id);
  const permitted = !!task && canUpdateTask(state.session, task);
  async function update(action: Action) {
    setError('');
    try { await act(action); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save the task. Please retry.'); }
  }
  if (!task || !permitted) return <Screen><EmptyState title="Task unavailable" message="This task does not exist or is not assigned to your demo role." action={<Button label="Back to tasks" onPress={() => router.replace('/tasks')} />} /></Screen>;
  const facility = state.facilities.find((item) => item.id === task.facilityId);
  const area = facility?.areas.find((item) => item.id === task.areaId);
  const staff = state.staff.find((item) => item.id === task.assigneeId);
  const done = task.checklist.filter((item) => item.done).length;
  const percent = task.checklist.length ? Math.round(done / task.checklist.length * 100) : 0;
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safeArea}>
      <Screen>
        <Header eyebrow="TASK DETAILS" title={task.title} subtitle={`${facility?.name} · ${area?.name}`} action={canManageTasks(state.session) ? <Button label="Edit task" icon="create-outline" variant="secondary" onPress={() => setEditing(true)} /> : undefined} />
        <Card>
          <View style={styles.row}><Chip label={statusLabels[task.status]} tone={task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'warning' : 'neutral'} /><Chip label={`${task.priority[0].toUpperCase()}${task.priority.slice(1)} priority`} tone={task.priority === 'high' ? 'danger' : 'neutral'} /></View>
          <View style={styles.metadata}>
            <View style={styles.metadataRow}><View style={styles.metaIcon}><Ionicons name="person-outline" size={20} color={colors.teal} accessible={false} /></View><View style={styles.grow}><Text style={styles.label}>Assigned to</Text><Text style={styles.value}>{staff?.name}</Text></View></View>
            <View style={styles.divider} />
            <View style={styles.metadataRow}><View style={styles.metaIcon}><Ionicons name="calendar-outline" size={20} color={colors.teal} accessible={false} /></View><View style={styles.grow}><Text style={styles.label}>Due date · Asia/Kolkata</Text><Text style={styles.value}>{formatDate(task.dueDate)}</Text></View></View>
          </View>
          {task.notes ? <View style={styles.notes}><Text style={styles.label}>Task notes</Text><Text style={styles.body}>{task.notes}</Text></View> : null}
        </Card>
        <SectionTitle title="Cleaning checklist" action={<Chip label={`${done} of ${task.checklist.length} done`} tone={percent === 100 ? 'success' : 'neutral'} />} />
        <Card style={styles.checklistCard}>
          <View style={styles.checklistIntro}>
            <Text style={styles.body}>Complete each step, then mark the task as finished.</Text>
            <View style={styles.progressTrack} accessible accessibilityRole="progressbar" accessibilityLabel="Checklist completion" accessibilityValue={{ min: 0, max: 100, now: percent }}><View style={[styles.progressFill, { width: `${percent}%` }]} /></View>
          </View>
          {task.checklist.map((item, index) => <Pressable key={item.id} accessibilityRole="checkbox" accessibilityLabel={item.label} accessibilityState={{ checked: item.done, disabled: busy }} disabled={busy} onPress={() => void update({ type: 'setChecklistDone', taskId: task.id, itemId: item.id, done: !item.done, expectedRevision: task.revision })} style={({ pressed }) => [styles.step, index > 0 && styles.stepDivider, item.done && styles.stepDone, pressed && styles.pressed]}>
            <Ionicons name={item.done ? 'checkmark-circle' : 'ellipse-outline'} size={27} color={item.done ? colors.teal : colors.muted} accessible={false} /><Text style={[styles.stepLabel, item.done && styles.completedLabel]}>{item.label}</Text>
          </Pressable>)}
        </Card>
        {error ? <Notice message={error} tone="error" /> : null}
        <View style={styles.actions}>
          {task.status === 'pending' ? <Button label="Start task" icon="play-outline" variant="secondary" loading={busy} onPress={() => void update({ type: 'setTaskStatus', taskId: task.id, status: 'in_progress', expectedRevision: task.revision })} /> : null}
          {task.status !== 'completed' ? <Button label="Complete task" icon="checkmark-circle-outline" loading={busy} onPress={() => void update({ type: 'setTaskStatus', taskId: task.id, status: 'completed', expectedRevision: task.revision })} /> : <><Notice message="Task completed. Your dashboard has been updated." tone="success" /><Button label="Reopen task" variant="secondary" loading={busy} onPress={() => void update({ type: 'setTaskStatus', taskId: task.id, status: 'in_progress', expectedRevision: task.revision })} /></>}
        </View>
        {editing ? <TaskEditor task={task} onClose={() => setEditing(false)} /> : null}
      </Screen>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grow: { flex: 1, gap: 4 },
  metadata: { gap: 14, marginTop: 6 },
  metadataRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, lineHeight: 19, fontWeight: '600', color: colors.muted },
  value: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: colors.navy },
  divider: { height: 1, backgroundColor: colors.border },
  notes: { gap: 5, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14, marginTop: 3 },
  body: { fontSize: 14, lineHeight: 22, color: colors.muted },
  checklistCard: { padding: 0, gap: 0, overflow: 'hidden' },
  checklistIntro: { gap: 14, padding: 18, borderBottomWidth: 1, borderBottomColor: colors.border },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: colors.tealLight, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3, backgroundColor: colors.teal },
  step: { flexDirection: 'row', gap: 12, minHeight: 62, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 18 },
  stepDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  stepDone: { backgroundColor: '#F4FAF8' },
  stepLabel: { flex: 1, fontSize: 15, lineHeight: 24, color: colors.navy },
  completedLabel: { color: colors.tealDark },
  pressed: { opacity: 0.65 },
  actions: { gap: 12 },
});
