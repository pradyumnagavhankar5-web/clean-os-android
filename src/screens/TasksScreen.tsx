import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useApp } from '../state/AppProvider';
import { canManageTasks, formatDate, getVisibleTasks } from '../domain';
import { useBusinessDate } from '../state/useBusinessDate';
import { Button, Card, Chip, EmptyState, Field, Header, Screen, colors } from '../ui';
import TaskEditor from './TaskEditor';

const statusLabels = {pending:'Pending',in_progress:'In progress',completed:'Completed'};
export default function TasksScreen() {
  const { state } = useApp();
  const params = useLocalSearchParams<{ facilityId?: string; areaId?: string; status?: string }>();
  const [search,setSearch] = useState('');
  const [status,setStatus] = useState('all');
  const [priority,setPriority] = useState('all');
  const [date,setDate] = useState('all');
  const [creating,setCreating] = useState(false);
  const facilityId = typeof params.facilityId === 'string' ? params.facilityId : undefined;
  const areaId = typeof params.areaId === 'string' ? params.areaId : undefined;
  const selectedStatus = params.status ?? status;
  const today = useBusinessDate();
  const tasks = getVisibleTasks(state).filter((task) => {
    const facility = state.facilities.find((item) => item.id === task.facilityId);
    const staff = state.staff.find((item) => item.id === task.assigneeId);
    const area = facility?.areas.find((item) => item.id === task.areaId);
    return (!facilityId || task.facilityId === facilityId) && (!areaId || task.areaId === areaId) &&
      (selectedStatus === 'all' || task.status === selectedStatus || (selectedStatus === 'unfinished' && task.status !== 'completed')) &&
      (priority === 'all' || task.priority === priority) &&
      (date === 'all' || (date === 'today' ? task.dueDate === today : task.dueDate < today && task.status !== 'completed')) &&
      `${task.title} ${facility?.name} ${area?.name} ${staff?.name}`.toLowerCase().includes(search.toLowerCase().trim());
  }).sort((a,b) => a.dueDate.localeCompare(b.dueDate));
  return <Screen>
    <Header eyebrow="DAILY OPERATIONS" title={state.session?.role==='staff' ? 'My cleaning tasks' : 'Cleaning tasks'} subtitle="Clear ownership. Consistent standards." action={canManageTasks(state.session) ? <Button label="New task" icon="add" onPress={() => setCreating(true)} /> : undefined} />
    <Field label="Search tasks, areas or staff" value={search} onChangeText={setSearch} placeholder="Search your workspace" />
    {facilityId || areaId ? <View style={styles.row}><Chip label={state.facilities.find((facility)=>facility.id===facilityId)?.name ?? 'Area filter'} selected /><Button label="Clear area filter" variant="ghost" onPress={()=>router.setParams({facilityId:undefined,areaId:undefined})} /></View> : null}
    <View style={styles.row}>{['all','pending','in_progress','completed'].map((value) => <Chip key={value} label={value==='all'?'All statuses':statusLabels[value as keyof typeof statusLabels]} selected={selectedStatus===value} onPress={()=>{setStatus(value);router.setParams({status:undefined});}} />)}</View>
    <View style={styles.row}>{['all','today','overdue'].map((value)=><Chip key={value} label={value==='all'?'All dates':value==='today'?'Today':'Overdue'} selected={date===value} onPress={()=>setDate(value)} />)}</View>
    <View style={styles.row}>{['all','high','medium','low'].map((value)=><Chip key={value} label={value==='all'?'All priorities':`${value[0].toUpperCase()+value.slice(1)} priority`} selected={priority===value} onPress={()=>setPriority(value)} />)}</View>
    <Text style={styles.count}>{tasks.length} task{tasks.length===1?'':'s'} · {state.session?.role==='staff'?'assigned to you':'across your facilities'}</Text>
    {tasks.length===0 ? <EmptyState icon="checkbox-outline" title="No tasks to show" message="Try a different search or filter. New assignments appear here." /> : tasks.map((task)=>{
      const facility=state.facilities.find((item)=>item.id===task.facilityId);
      const area=facility?.areas.find((item)=>item.id===task.areaId);
      const staff=state.staff.find((item)=>item.id===task.assigneeId);
      const done=task.checklist.filter((item)=>item.done).length;
      return <Pressable key={task.id} accessibilityRole="button" accessibilityLabel={`Open ${task.title}, ${statusLabels[task.status]}`} onPress={()=>router.push({pathname:'/task/[id]',params:{id:task.id}})} style={({pressed})=>({opacity:pressed?0.75:1})}>
        <Card>
          <View style={styles.row}><Chip label={statusLabels[task.status]} tone={task.status==='completed'?'success':task.status==='pending'?'warning':'neutral'} /><Chip label={`${task.priority} priority`} tone={task.priority==='high'?'danger':'neutral'} /></View>
          <View style={styles.titleRow}><Text style={styles.title}>{task.title}</Text><Ionicons name="chevron-forward" size={22} color={colors.muted} /></View>
          <Text style={styles.body}>{facility?.name} · {area?.name}</Text>
          <Text style={styles.body}>{staff?.name} · {formatDate(task.dueDate)}</Text>
          <Text style={[styles.body,{color:task.dueDate<today&&task.status!=='completed'?colors.danger:colors.teal}]}>{task.dueDate<today&&task.status!=='completed'?'Overdue · ':''}{done}/{task.checklist.length} checklist steps complete</Text>
        </Card>
      </Pressable>;
    })}
    {creating ? <TaskEditor onClose={()=>setCreating(false)} /> : null}
  </Screen>;
}
const styles=StyleSheet.create({row:{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'},count:{fontSize:13,color:colors.muted,fontWeight:'600'},titleRow:{flexDirection:'row',gap:12,alignItems:'center'},title:{fontSize:18,lineHeight:25,fontWeight:'700',color:colors.navy,flex:1},body:{fontSize:14,lineHeight:21,color:colors.muted}});
