import React, { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../state/AppProvider';
import { canManageInventory, dateKey, formatDate, formatINR, getLowStockItems } from '../domain';
import { buildReorderMessage, buildWhatsAppReorderUrl, type ReorderLine } from '../domain/reorder';
import type { InventoryItem } from '../domain/types';
import {
  Button, Card, Chip, EmptyState, Field, Header, IconBadge,
  Metric, ModalSheet, Notice, Screen, SectionTitle, colors,
} from '../ui';

type StockDialog = { itemId: string; type: 'in' | 'out' } | null;
type Feedback = { message: string; tone: 'success' | 'error' } | null;
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Please try again.';
const quantityLabel = (value: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(value);

export default function InventoryScreen() {
  const params = useLocalSearchParams<{ lowStock?: string }>();
  const { state, act, busy } = useApp();
  const manager = canManageInventory(state.session);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [category, setCategory] = useState('All categories');
  const [stockDialog, setStockDialog] = useState<StockDialog>(null);
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [thresholdItem, setThresholdItem] = useState<InventoryItem | null>(null);
  const [threshold, setThreshold] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [reorderVisible, setReorderVisible] = useState(false);
  const [reorderQuantities, setReorderQuantities] = useState<Record<string, string>>({});
  const [openingWhatsApp, setOpeningWhatsApp] = useState(false);
  const lowStock = getLowStockItems(state);
  const activeFilter = params.lowStock === 'true' ? 'Low stock' : filter;
  const categories = ['All categories', ...new Set(state.inventory.map((item) => item.category))];
  const selectedItem = stockDialog ? state.inventory.find((item) => item.id === stockDialog.itemId) : undefined;
  const visibleInventory = state.inventory.filter((item) =>
    `${item.name} ${item.category}`.toLowerCase().includes(search.trim().toLowerCase()) &&
    (activeFilter !== 'Low stock' || item.quantity <= item.threshold) &&
    (category === 'All categories' || item.category === category));
  const movements = [...state.movements].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const reorderLines: ReorderLine[] = state.inventory
    .filter((item) => Object.hasOwn(reorderQuantities, item.id))
    .map((item) => ({ id: item.id, name: item.name, unit: item.unit, quantity: Number(reorderQuantities[item.id]) }));
  const preview = (() => {
    try { return buildReorderMessage(reorderLines, dateKey()); }
    catch { return ''; }
  })();

  function openStock(item: InventoryItem, type: 'in' | 'out') {
    setQuantity(''); setNote(''); setDialogError(''); setStockDialog({ itemId: item.id, type });
  }

  async function saveStock() {
    if (!stockDialog || !selectedItem) return;
    const amount = Number(quantity);
    if (!quantity.trim() || !Number.isFinite(amount) || amount <= 0) {
      setDialogError('Enter a quantity greater than zero.'); return;
    }
    if (!note.trim()) { setDialogError('Add a reason so your team can trace this movement.'); return; }
    setDialogError('');
    try {
      await act({ type: 'recordStock', movement: {
        id: `stock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        itemId: selectedItem.id, type: stockDialog.type, quantity: amount,
        note: note.trim(), createdAt: new Date().toISOString(),
      } });
      setStockDialog(null);
      setFeedback({ tone: 'success', message: `${stockDialog.type === 'in' ? 'Stock received' : 'Stock issued'} and saved on this device.` });
    } catch (error) { setDialogError(errorMessage(error)); }
  }

  async function saveThreshold() {
    if (!thresholdItem) return;
    const value = Number(threshold);
    if (!threshold.trim() || !Number.isFinite(value) || value < 0) {
      setDialogError('Enter a threshold of zero or more.'); return;
    }
    setDialogError('');
    try {
      await act({ type: 'setThreshold', itemId: thresholdItem.id, threshold: value });
      setThresholdItem(null);
      setFeedback({ tone: 'success', message: 'Low-stock threshold updated.' });
    } catch (error) { setDialogError(errorMessage(error)); }
  }

  function openReorder() {
    setReorderQuantities(Object.fromEntries(lowStock.map((item) =>
      [item.id, String(Math.max(1, item.threshold * 2 - item.quantity))])));
    setDialogError(''); setReorderVisible(true);
  }

  function toggleReorderProduct(item: InventoryItem) {
    setReorderQuantities((current) => {
      const next = { ...current };
      if (Object.hasOwn(next, item.id)) delete next[item.id];
      else next[item.id] = String(Math.max(1, item.threshold * 2 - item.quantity));
      return next;
    });
    setDialogError('');
  }

  async function openWhatsApp() {
    setDialogError('');
    try {
      const url = buildWhatsAppReorderUrl(reorderLines, dateKey());
      setOpeningWhatsApp(true);
      await Linking.openURL(url);
    } catch (error) {
      setDialogError(error instanceof Error && /quantity|Select at least|product/.test(error.message)
        ? error.message
        : 'Could not open WhatsApp. Install WhatsApp or open the enquiry link in a compatible browser, then try again.');
    } finally { setOpeningWhatsApp(false); }
  }

  return (
    <Screen>
      <Header eyebrow="Supplies & consumables" title="Inventory" subtitle="Know what is on hand. Replenish before it runs out." />
      <View style={styles.metrics}>
        <Metric icon="cube-outline" label="Products tracked" value={state.inventory.length} />
        <Metric icon="alert-circle-outline" label="Low-stock products" value={lowStock.length} tone={lowStock.length ? 'warning' : 'success'} />
      </View>
      {feedback ? <Notice message={feedback.message} tone={feedback.tone} /> : null}
      {lowStock.length > 0 ? <Notice message={`${lowStock.length} product${lowStock.length > 1 ? 's are' : ' is'} at or below the reorder threshold.`} /> : null}
      {manager ? <Button label="Prepare reorder enquiry" icon="logo-whatsapp" onPress={openReorder} />
        : <Notice message="Staff view: check stock availability here. Ask your supervisor to record supplies received or issued." />}
      <Card>
        <Field label="Search supplies" value={search} onChangeText={setSearch} placeholder="Try tissues, floor cleaner or handwash" />
        <View style={styles.chips}>
          {['All', 'Low stock'].map((option) => <Chip key={option} label={option} selected={activeFilter === option} onPress={() => { setFilter(option); router.setParams({lowStock:undefined}); }} />)}
        </View>
        <Text style={styles.smallLabel}>CATEGORY</Text>
        <View style={styles.chips}>
          {categories.map((option) => <Chip key={option} label={option} selected={category === option} onPress={() => setCategory(option)} />)}
        </View>
      </Card>
      <SectionTitle title={`${visibleInventory.length} ${visibleInventory.length === 1 ? 'product' : 'products'}`} />
      {visibleInventory.length === 0 ? <EmptyState icon="search-outline" title="No supplies found" message="Try another search or clear the filters." action={<Button label="Clear filters" variant="secondary" onPress={() => { setSearch(''); setFilter('All'); setCategory('All categories'); router.setParams({lowStock:undefined}); }} />} /> : null}
      {visibleInventory.map((item) => {
        const low = item.quantity <= item.threshold;
        return <Card key={item.id}>
          <View style={styles.row}>
            <IconBadge name="cube-outline" color={low ? colors.warning : colors.teal} background={low ? colors.warningLight : colors.tealLight} />
            <View style={styles.grow}><Text style={styles.itemName}>{item.name}</Text><Text style={styles.secondary}>{item.category}</Text></View>
            <Chip label={low ? 'Low stock' : 'In stock'} tone={low ? 'warning' : 'success'} />
          </View>
          <View style={styles.stockSummary}>
            <View style={styles.grow}><Text style={styles.quantity}>{quantityLabel(item.quantity)} <Text style={styles.unit}>{item.unit}</Text></Text><Text style={styles.secondary}>Available stock</Text></View>
            <View><Text style={styles.threshold}>≤ {quantityLabel(item.threshold)} {item.unit}</Text><Text style={styles.secondary}>Low-stock threshold</Text></View>
          </View>
          <Text style={styles.secondary}>Demo unit value: {formatINR(item.unitPrice)} / {item.unit}</Text>
          {manager ? <>
            <View style={styles.actions}>
              <Button label="Stock in" icon="add-outline" variant="secondary" style={styles.actionButton} disabled={busy} onPress={() => openStock(item, 'in')} accessibilityLabel={`Record stock received for ${item.name}`} />
              <Button label="Stock out" icon="remove-outline" variant="secondary" style={styles.actionButton} disabled={busy || item.quantity === 0} onPress={() => openStock(item, 'out')} accessibilityLabel={`Record stock issued for ${item.name}`} />
            </View>
            <Button label="Edit threshold" variant="ghost" disabled={busy} onPress={() => { setThresholdItem(item); setThreshold(String(item.threshold)); setDialogError(''); }} accessibilityLabel={`Edit low-stock threshold for ${item.name}`} />
          </> : null}
        </Card>;
      })}
      <SectionTitle title="Stock movement history" />
      <Text style={styles.secondary}>Most recent first · Dates and times use IST</Text>
      {movements.length === 0 ? <EmptyState icon="swap-vertical-outline" title="No stock movements yet" message="Record your first stock receipt or issue to start the history." /> :
        movements.map((movement) => {
          const item = state.inventory.find((product) => product.id === movement.itemId);
          const isIn = movement.type === 'in';
          const time = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }).format(new Date(movement.createdAt));
          return <Card key={movement.id}>
            <View style={styles.row}>
              <IconBadge name={isIn ? 'arrow-down-outline' : 'arrow-up-outline'} color={isIn ? colors.success : colors.warning} background={isIn ? colors.successLight : colors.warningLight} />
              <View style={styles.grow}><Text style={styles.itemName}>{item?.name ?? 'Product'}</Text><Text style={styles.secondary}>{formatDate(movement.createdAt)} · {time}</Text></View>
              <Text style={[styles.movementAmount, { color: isIn ? colors.success : colors.warning }]}>{isIn ? '+' : '−'}{quantityLabel(movement.quantity)} {item?.unit}</Text>
            </View>
            <Text style={styles.secondary}>{movement.note || (isIn ? 'Stock received' : 'Stock issued')}</Text>
          </Card>;
        })}

      <ModalSheet visible={!!stockDialog} title={stockDialog?.type === 'in' ? 'Receive stock' : 'Issue stock'} onClose={() => { if (!busy) setStockDialog(null); }}>
        <Text style={styles.itemName}>{selectedItem?.name}</Text>
        <Text style={styles.secondary}>Available: {selectedItem?.quantity} {selectedItem?.unit}</Text>
        <Field label={`Quantity (${selectedItem?.unit ?? 'units'})`} value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="Enter quantity" editable={!busy} />
        <Field label="Reason / reference" value={note} onChangeText={setNote} placeholder={stockDialog?.type === 'in' ? 'e.g. Supplier delivery, invoice AT-024' : 'e.g. Issued for lobby and washrooms'} multiline editable={!busy} />
        {dialogError ? <Notice tone="error" message={dialogError} /> : null}
        <Button label="Save stock movement" loading={busy} onPress={() => { void saveStock(); }} />
      </ModalSheet>
      <ModalSheet visible={!!thresholdItem} title="Low-stock threshold" onClose={() => { if (!busy) setThresholdItem(null); }}>
        <Text style={styles.itemName}>{thresholdItem?.name}</Text>
        <Text style={styles.secondary}>A warning appears when available stock is equal to or below this quantity.</Text>
        <Field label={`Threshold (${thresholdItem?.unit ?? 'units'})`} value={threshold} onChangeText={setThreshold} keyboardType="decimal-pad" editable={!busy} />
        {dialogError ? <Notice tone="error" message={dialogError} /> : null}
        <Button label="Save threshold" loading={busy} onPress={() => { void saveThreshold(); }} />
      </ModalSheet>
      <ModalSheet visible={reorderVisible} title="Reorder enquiry" onClose={() => { if (!openingWhatsApp) setReorderVisible(false); }}>
        <Text style={styles.secondary}>Choose products and edit the quantities. Low-stock products are selected for you.</Text>
        <View style={styles.chips}>
          {state.inventory.map((item) => <Chip key={item.id} label={item.name} selected={Object.hasOwn(reorderQuantities, item.id)} onPress={() => toggleReorderProduct(item)} />)}
        </View>
        {state.inventory.filter((item) => Object.hasOwn(reorderQuantities, item.id)).map((item) =>
          <Field key={item.id} label={`${item.name} (${item.unit})`} value={reorderQuantities[item.id]} keyboardType="decimal-pad" onChangeText={(value) => setReorderQuantities((current) => ({ ...current, [item.id]: value }))} />)}
        {preview ? <Card><Text style={styles.smallLabel}>MESSAGE PREVIEW</Text><Text selectable style={styles.preview}>{preview}</Text></Card>
          : <Notice message="Select at least one product and enter a quantity greater than zero for every selected product to preview the enquiry." />}
        <Notice message="Choose your verified supplier contact in WhatsApp. Review the message and tap Send there when ready." />
        {dialogError ? <Notice tone="error" message={dialogError} /> : null}
        <Button label="Open WhatsApp enquiry" icon="logo-whatsapp" loading={openingWhatsApp} onPress={() => { void openWhatsApp(); }} />
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  grow: { flex: 1, minWidth: 120, gap: 4 },
  itemName: { color: colors.navy, fontSize: 16, fontWeight: '700', lineHeight: 23 },
  secondary: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  smallLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  stockSummary: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 16, borderRadius: 12, backgroundColor: colors.background, padding: 14 },
  quantity: { color: colors.navy, fontSize: 27, fontWeight: '800' },
  unit: { fontSize: 14, fontWeight: '500', color: colors.muted },
  threshold: { color: colors.navy, fontSize: 15, fontWeight: '600', lineHeight: 23 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionButton: { flex: 1, minWidth: 120 },
  movementAmount: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  preview: { color: colors.navy, fontSize: 14, lineHeight: 23 },
});
