import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../state/AppProvider';
import { canManageTasks, canUpdateTask, formatDate, type Action } from '../domain';
import { Button, Card, Chip, EmptyState, Header, Notice, Screen, SectionTitle, colors } from '../ui';
import TaskEditor from './TaskEditor';

export default function TaskDetailScreen() {
  const {id}=useLocalSearchParams<{id:string}>();
  const {state,act,busy}=useApp();
  const [error,setError]=useState('');
  const [editing,setEditing]=useState(false);
  const task=state.tasks.find((item)=>item.id===id);
  const permitted=!!task&&canUpdateTask(state.session,task);
  async function update(action:Action) {
    setError('');
    try { await act(action); }
    catch(caught) {setError(caught instanceof Error?caught.message:'Could not save the task. Please retry.');}
  }
  if(!task || !permitted) return <Screen><EmptyState title="Task unavailable" message="This task does not exist or is not assigned to your demo role." action={<Button label="Back to tasks" onPress={()=>router.replace('/tasks')} />} /></Screen>;
  const facility=state.facilities.find((item)=>item.id===task.facilityId);
  const area=facility?.areas.find((item)=>item.id===task.areaId);
  const staff=state.staff.find((item)=>item.id===task.assigneeId);
  const done=task.checklist.filter((item)=>item.done).length;
  return <SafeAreaView edges={['bottom','left','right']} style={{flex:1,backgroundColor:colors.background}}><Screen>
    <Header eyebrow="TASK DETAILS" title={task.title} subtitle={`${facility?.name} · ${area?.name}`} action={canManageTasks(state.session)?<Button label="Edit" icon="create-outline" variant="secondary" onPress={()=>setEditing(true)} />:undefined} />
    <Card>
      <View style={styles.row}><Chip label={task.status.replace('_',' ')} tone={task.status==='completed'?'success':'warning'} /><Chip label={`${task.priority} priority`} tone={task.priority==='high'?'danger':'neutral'} /></View>
      <Text style={styles.label}>ASSIGNED TO</Text><Text style={styles.value}>{staff?.name}</Text>
      <Text style={styles.label}>DUE DATE · ASIA/KOLKATA</Text><Text style={styles.value}>{formatDate(task.dueDate)}</Text>
      {task.notes ? <><Text style={styles.label}>NOTES</Text><Text style={styles.body}>{task.notes}</Text></>:null}
    </Card>
    <SectionTitle title={`Cleaning checklist · ${done}/${task.checklist.length}`} />
    <Text style={styles.body}>Check each step after the work is done. All steps must be checked before completing the task.</Text>
    <Card>{task.checklist.map((item)=><Pressable key={item.id} accessibilityRole="checkbox" accessibilityLabel={item.label} accessibilityState={{checked:item.done,disabled:busy}} disabled={busy} onPress={()=>void update({type:'toggleChecklist',taskId:task.id,itemId:item.id})} style={({pressed})=>[styles.step,{opacity:pressed?0.65:1}]}>
      <Ionicons name={item.done?'checkbox':'square-outline'} size={28} color={item.done?colors.teal:colors.muted} /><Text style={[styles.stepLabel,item.done&&{color:colors.muted,textDecorationLine:'line-through'}]}>{item.label}</Text>
    </Pressable>)}</Card>
    {error?<Notice message={error} tone="error" />:null}
    {task.status==='pending'?<Button label="Start task" icon="play-outline" loading={busy} onPress={()=>void update({type:'setTaskStatus',taskId:task.id,status:'in_progress'})} />:null}
    {task.status!=='completed'?<Button label="Complete task" icon="checkmark-circle-outline" loading={busy} onPress={()=>void update({type:'setTaskStatus',taskId:task.id,status:'completed'})} />:<><Notice message="Task completed. Your dashboard has been updated." tone="success" /><Button label="Reopen task" variant="secondary" loading={busy} onPress={()=>void update({type:'setTaskStatus',taskId:task.id,status:'in_progress'})} /></>}
    {editing?<TaskEditor task={task} onClose={()=>setEditing(false)} />:null}
  </Screen></SafeAreaView>;
}
const styles=StyleSheet.create({row:{flexDirection:'row',flexWrap:'wrap',gap:8},label:{fontSize:11,fontWeight:'700',letterSpacing:1,color:colors.muted,marginTop:8},value:{fontSize:17,fontWeight:'600',color:colors.navy},body:{fontSize:14,lineHeight:22,color:colors.muted},step:{flexDirection:'row',gap:12,minHeight:52,alignItems:'center',paddingVertical:10},stepLabel:{flex:1,fontSize:16,lineHeight:24,color:colors.navy}});
