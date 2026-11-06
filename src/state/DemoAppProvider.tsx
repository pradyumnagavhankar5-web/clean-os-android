import React, { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Action, AppState } from '../domain';
import { localRepository } from '../data/localRepository';
import { createAppStore } from './store';
import { Button, Card, Notice, Screen, colors } from '../ui';
import { AppContext } from './AppContext';

export function DemoAppProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createAppStore(localRepository));
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try { await store.load(); }
    catch { setError('We could not read your saved demo. Your existing data has been kept. Retry, or explicitly replace it with fresh demo data.'); }
    finally { setLoading(false); }
  }, [store]);
  useEffect(() => {
    let active = true;
    const unsubscribe = store.subscribe(setState);
    void store.load().catch(() => {
      if (active) setError('We could not read your saved demo. Your existing data has been kept. Retry, or explicitly replace it with fresh demo data.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; unsubscribe(); };
  }, [store]);
  const run = useCallback(async (operation: () => Promise<void>) => {
    setPending((count) => count + 1);
    try { await operation(); }
    finally { setPending((count) => count - 1); }
  }, []);
  const act = useCallback((action: Action) => run(() => store.act(action)), [run, store]);
  const resetDemo = useCallback(() => run(() => store.reset()), [run, store]);
  if (!state) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen>
        <View style={{ paddingTop: 60, gap: 16 }}>
          <Text style={{ fontSize: 32, fontWeight: '800', color: colors.navy }}>CleanOS</Text>
          {loading ? <><ActivityIndicator size="large" color={colors.teal} /><Text style={{ color: colors.muted }}>Preparing your housekeeping workspace…</Text></> :
            <Card>
              <Notice message={error} tone="error" />
              <Button label="Retry loading" onPress={() => void load()} />
              <Button label="Replace with fresh demo" variant="danger" disabled={pending > 0} onPress={() => Alert.alert('Replace saved demo?', 'This permanently replaces local demo tasks, stock and your selected role.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Replace demo', style: 'destructive', onPress: () => { void resetDemo().catch(() => setError('Storage is unavailable. Please free device space and try again.')); } },
              ])} />
            </Card>}
        </View>
      </Screen>
    </SafeAreaView>
  );
  return <AppContext.Provider value={{ state, act, busy: pending > 0, resetDemo, mode: 'demo' }}>{children}</AppContext.Provider>;
}
