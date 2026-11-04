import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Area, Facility } from '../../domain';
import { Button, Card, Chip, Field, ModalSheet, Notice, SectionTitle, colors } from '../../ui';

const areaId = () => `area-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export function FacilityEditor({ initial, allowCreateLocation, createLocationDefault = false, onSave, onClose }: {
  initial: Facility;
  allowCreateLocation: boolean;
  createLocationDefault?: boolean;
  onSave: (facility: Facility, createLocation: boolean) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [type, setType] = useState(initial.type);
  const [address, setAddress] = useState(initial.address);
  const [areas, setAreas] = useState<Area[]>(initial.areas.map(area => ({ ...area })));
  const [active, setActive] = useState(initial.active !== false);
  const [createLocation, setCreateLocation] = useState(createLocationDefault);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setError('');
    if (!name.trim() || !type.trim() || !address.trim()) {
      setError('Enter the facility name, type and address.'); return;
    }
    if (name.trim().length > 160 || type.trim().length > 80 || address.trim().length > 500) {
      setError('Use a name up to 160 characters, type up to 80 and address up to 500.'); return;
    }
    if (!areas.length || areas.some(area => !area.name.trim() || area.name.trim().length > 160)) {
      setError('Add named cleaning areas, using up to 160 characters for each name.'); return;
    }
    if (active && !areas.some(area => area.active !== false)) {
      setError('Keep at least one cleaning area active for an active facility.'); return;
    }
    setSaving(true);
    try {
      await onSave({ ...initial, name: name.trim(), type: type.trim(), address: address.trim(), active,
        areas: areas.map(area => ({ ...area, name: area.name.trim() })) }, createLocation);
      onClose();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save the facility. Please retry.'); }
    finally { setSaving(false); }
  }

  return <ModalSheet visible title={initial.revision === undefined ? 'Add facility' : 'Edit facility'} onClose={() => { if (!saving) onClose(); }}>
    <Field label="Facility name" value={name} onChangeText={setName} placeholder="e.g. Aura Business Centre" editable={!saving} />
    <Field label="Facility type" value={type} onChangeText={setType} placeholder="Office, hotel, clinic or housing society" editable={!saving} />
    <Field label="Address" value={address} onChangeText={setAddress} multiline editable={!saving} />
    <SectionTitle title="Cleaning areas" />
    <Text style={styles.hint}>Archive an area to keep its previous task history.</Text>
    {areas.map((area, index) => <Card key={area.id}>
      <Field label={`Area ${index + 1}`} value={area.name} editable={!saving} onChangeText={value => setAreas(current => current.map(item => item.id === area.id ? { ...item, name: value } : item))} />
      <View style={styles.options}>
        <Chip label="Active" selected={area.active !== false} onPress={() => { if (!saving) setAreas(current => current.map(item => item.id === area.id ? { ...item, active: true } : item)); }} />
        <Chip label="Archived" selected={area.active === false} onPress={() => { if (!saving) setAreas(current => current.map(item => item.id === area.id ? { ...item, active: false } : item)); }} />
      </View>
    </Card>)}
    <Button label="Add cleaning area" variant="secondary" icon="add-outline" disabled={saving} onPress={() => setAreas(current => [...current, { id: areaId(), name: '', active: true }])} />
    <SectionTitle title="Facility status" />
    <View style={styles.options}>
      <Chip label="Active" selected={active} onPress={() => { if (!saving) setActive(true); }} />
      <Chip label="Archived" selected={!active} onPress={() => { if (!saving) setActive(false); }} />
    </View>
    {!active ? <Notice message="Archiving keeps previous tasks and prevents new assignments here. Resolve or reassign open tasks before archiving." /> : null}
    {allowCreateLocation ? <View style={styles.locationChoice}>
      <SectionTitle title="Stock room" />
      <Chip label={createLocation ? 'Create a stock room for this facility ✓' : 'Create a stock room for this facility'} selected={createLocation} onPress={() => { if (!saving) setCreateLocation(value => !value); }} />
      <Text style={styles.hint}>Its stock balance will be separate from your other locations.</Text>
    </View> : null}
    {error ? <Notice tone="error" message={error} /> : null}
    <Button label="Save facility" icon="checkmark-outline" loading={saving} onPress={() => { void save(); }} />
  </ModalSheet>;
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  locationChoice: { gap: 10 },
});
