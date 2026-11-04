import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ProductDraft } from '../types';
import { Button, Chip, Field, ModalSheet, Notice, SectionTitle, colors } from '../../ui';

function decimal(value: string, places: number, label: string): number {
  const input = value.trim();
  const pattern = new RegExp(`^(?:\\d+(?:\\.\\d{0,${places}})?|\\.\\d{1,${places}})$`);
  const number = Number(input);
  if (!pattern.test(input) || !Number.isFinite(number) || number < 0 || number > 999999999) {
    throw new Error(`${label} must be zero or more, with up to ${places} decimal places.`);
  }
  return number;
}

export function ProductEditor({ initial, isNew, locationName, onSave, onClose }: {
  initial: ProductDraft;
  isNew: boolean;
  locationName: string;
  onSave: (product: ProductDraft) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [category, setCategory] = useState(initial.category);
  const [unit, setUnit] = useState(initial.unit);
  const [price, setPrice] = useState(String(initial.unitPrice));
  const [threshold, setThreshold] = useState(String(initial.threshold));
  const [opening, setOpening] = useState(String(initial.openingQuantity ?? 0));
  const [active, setActive] = useState(initial.active !== false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setError('');
    try {
      if (!name.trim() || !category.trim() || !unit.trim()) throw new Error('Enter a product name, category and unit.');
      if (name.trim().length > 160 || category.trim().length > 80 || unit.trim().length > 30 || /[\r\n]/.test(name + category + unit)) {
        throw new Error('Use a single-line product name up to 160 characters, category up to 80 and unit up to 30.');
      }
      const unitPrice = decimal(price, 2, 'Unit value');
      const thresholdValue = isNew ? decimal(threshold, 3, 'Low-stock threshold') : initial.threshold;
      const openingQuantity = isNew ? decimal(opening, 3, 'Opening stock') : 0;
      setSaving(true);
      await onSave({ ...initial, name: name.trim(), category: category.trim(), unit: unit.trim(), unitPrice,
        threshold: thresholdValue, openingQuantity, active });
      onClose();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save this product. Please retry.'); }
    finally { setSaving(false); }
  }

  return <ModalSheet visible title={isNew ? 'Add product' : 'Edit product'} onClose={() => { if (!saving) onClose(); }}>
    <Field label="Product name" value={name} onChangeText={setName} placeholder="e.g. Floor cleaner" editable={!saving} />
    <Field label="Category" value={category} onChangeText={setCategory} placeholder="e.g. Cleaning liquids" editable={!saving} />
    <Field label="Stock unit" value={unit} onChangeText={setUnit} placeholder="litres, bottles, packs or rolls" editable={isNew && !saving} />
    {!isNew ? <Text style={styles.hint}>Units are fixed after creation to preserve stock history.</Text> : null}
    <Field label="Unit value (₹)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" editable={!saving} />
    {isNew ? <>
      <SectionTitle title={`Opening balance · ${locationName}`} />
      <Field label="Opening stock" value={opening} onChangeText={setOpening} keyboardType="decimal-pad" editable={!saving} />
      <Field label="Low-stock threshold" value={threshold} onChangeText={setThreshold} keyboardType="decimal-pad" editable={!saving} />
      <Notice message="Opening stock is recorded as a stock receipt at this location. Other locations start with zero stock." />
    </> : <Text style={styles.hint}>Use Stock in / Stock out to change quantities, and Edit threshold to change this location’s reorder level.</Text>}
    <SectionTitle title="Product status" />
    <View style={styles.options}>
      <Chip label="Active" selected={active} onPress={() => { if (!saving) setActive(true); }} />
      <Chip label="Archived" selected={!active} onPress={() => { if (!saving) setActive(false); }} />
    </View>
    {!active ? <Notice message="Archive products only after their stock reaches zero at every location. Previous stock movements remain in your history." /> : null}
    {error ? <Notice tone="error" message={error} /> : null}
    <Button label="Save product" icon="checkmark-outline" loading={saving} onPress={() => { void save(); }} />
  </ModalSheet>;
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 21 },
});
