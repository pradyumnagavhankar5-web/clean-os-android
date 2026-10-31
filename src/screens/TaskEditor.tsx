import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../state/AppProvider';
import { dateKey, isDateKey, type Task, type Priority } from '../domain';
import { Button, Chip, Field, ModalSheet, Notice, SectionTitle, colors } from '../ui';

const id = () => `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
export default function TaskEditor({ task, onClose }: { task?: Task; onClose: () => void }) {
  const { state, act, busy } = useApp();
  const [title, setTitle] = useState(task?.title ?? '');
  const [facilityId, setFacilityId] = useState(task?.facilityId ?? state.facilities[0]?.id ?? '');
  const [areaId, setAreaId] = useState(task?.areaId ?? state.facilities[0]?.areas[0]?.id ?? '');
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? state.staff[0]?.id ?? '');
  const [dueDate, setDueDate] = useState((task?.dueDate ?? dateKey()).split('-').reverse().join('/'));
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [checklist, setChecklist] = useState(task?.checklist.map((item) => item.label).join('\n') ?? 'Clean and disinfect surfaces\nMop the floor\nCheck supplies and sign off');
  const [error, setError] = useState('');
  const facility = state.facilities.find((item) => item.id === facilityId);
  async function save() {
    setError('');
    try {
      if (!title.trim()) throw new Error('Enter a task title.');
      const date = dueDate.trim().split('/').reverse().join('-');
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dueDate.trim()) || !isDateKey(date)) throw new Error('Enter a real date in DD/MM/YYYY format.');
      const labels = checklist.split('\n').map((label) => label.trim()).filter(Boolean);
      if (!labels.length) throw new Error('Add at least one checklist step.');
      const taskId = task?.id ?? id();
      const steps = labels.map((label, index) => {
        const previous = task?.checklist[index];
        return { id: previous?.id ?? `${taskId}-step-${index}`, label, done: previous?.label === label ? previous.done : false };
      });
      await act({ type: 'saveTask', task: {
        id: taskId, title: title.trim(), facilityId, areaId, assigneeId, dueDate: date, priority,
        status: task?.status === 'completed' && steps.some((step) => !step.done) ? 'in_progress' : task?.status ?? 'pending',
        checklist: steps, notes: notes.trim(),
      } });
      onClose();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save the task. Please retry.'); }
  }
  return <ModalSheet visible title={task ? 'Edit task' : 'Create a task'} onClose={() => { if (!busy) onClose(); }}>
    <Text style={{color:colors.muted}}>Give your team a clear area, owner and checklist.</Text>
    <Field label="Task title" value={title} onChangeText={setTitle} placeholder="e.g. Morning lobby cleaning" editable={!busy} />
    <SectionTitle title="Facility" />
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{state.facilities.map((item) => <Chip key={item.id} label={item.name} selected={facilityId===item.id} onPress={() => { if (busy) return; setFacilityId(item.id); setAreaId(item.areas[0]?.id ?? ''); }} />)}</View>
    <SectionTitle title="Cleaning area" />
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{facility?.areas.map((area) => <Chip key={area.id} label={area.name} selected={areaId===area.id} onPress={() => { if (!busy) setAreaId(area.id); }} />)}</View>
    <SectionTitle title="Assign to" />
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{state.staff.map((member) => <Chip key={member.id} label={member.name} selected={assigneeId===member.id} onPress={() => { if (!busy) setAssigneeId(member.id); }} />)}</View>
    <Field label="Due date · DD/MM/YYYY · India time" value={dueDate} onChangeText={setDueDate} placeholder="31/10/2026" keyboardType="numbers-and-punctuation" editable={!busy} />
    <SectionTitle title="Priority" />
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{(['low','medium','high'] as const).map((value) => <Chip key={value} label={value[0].toUpperCase()+value.slice(1)} selected={priority===value} onPress={() => { if (!busy) setPriority(value); }} />)}</View>
    <Field label="Checklist · one step per line" value={checklist} onChangeText={setChecklist} multiline editable={!busy} />
    <Field label="Notes (optional)" value={notes} onChangeText={setNotes} multiline placeholder="Safety instructions, supplies or access details" editable={!busy} />
    {task?.status === 'completed' ? <Notice message="Changing a checklist step reopens this task so the new work can be checked." /> : null}
    {error ? <Notice message={error} tone="error" /> : null}
    <Button label={task ? 'Save changes' : 'Create and assign task'} icon="checkmark-outline" onPress={() => void save()} loading={busy} />
  </ModalSheet>;
}
