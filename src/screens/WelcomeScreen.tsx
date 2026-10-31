import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useApp } from '../state/AppProvider';
import { Button, Card, colors, IconBadge, Notice, Screen } from '../ui';

export default function WelcomeScreen() {
  const { act, busy } = useApp();
  const [error, setError] = useState('');
  async function start() {
    setError('');
    try {
      await act({ type: 'completeOnboarding' });
      router.replace('/login');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save. Please try again.'); }
  }
  return (
    <Screen>
      <View style={styles.brand}>
        <View style={styles.logo}><Ionicons name="sparkles" color={colors.white} size={25} accessible={false} /></View>
        <View><Text style={styles.brandName}>CleanOS</Text><Text style={styles.brandCaption}>BY AURA TRADINGS</Text></View>
      </View>
      <View style={styles.hero}>
        <View style={styles.heroTop}><View style={styles.pill}><View style={styles.dot} /><Text style={styles.pillText}>A cleaner way to work</Text></View><Ionicons name="sparkles-outline" size={29} color="#86D6C8" accessible={false} /></View>
        <Text accessibilityRole="header" style={styles.heroTitle}>Great spaces.{'\n'}Well-run teams.</Text>
        <Text style={styles.heroCopy}>Bring your cleaning tasks, people and supplies together in one organised workspace.</Text>
        <View style={styles.preview}>
          <View style={styles.previewHeader}><View style={styles.previewIcon}><Ionicons name="business-outline" size={28} color={colors.teal} accessible={false} /></View><View style={styles.grow}><Text style={styles.previewTitle}>Your facility, in focus</Text><Text style={styles.previewCaption}>Every area. Every day.</Text></View><Ionicons name="checkmark-circle" size={25} color={colors.teal} accessible={false} /></View>
          <View style={styles.previewDivider} />
          <View style={styles.previewRow}><Ionicons name="checkbox-outline" size={21} color={colors.teal} accessible={false} /><Text style={styles.previewText}>Clear tasks for every team member</Text></View>
          <View style={styles.previewRow}><Ionicons name="cube-outline" size={21} color={colors.teal} accessible={false} /><Text style={styles.previewText}>Supplies tracked as they move</Text></View>
        </View>
      </View>
      <View style={styles.intro}><Text accessibilityRole="header" style={styles.title}>Smart Housekeeping Management</Text><Text style={styles.caption}>Built for offices, hotels, hospitals, housing societies and housekeeping teams across India.</Text></View>
      <Card>
        <View style={styles.feature}><IconBadge name="list-outline" /><View style={styles.grow}><Text style={styles.featureTitle}>Make every task clear</Text><Text style={styles.caption}>Assign work, follow checklists and track completion.</Text></View></View>
        <View style={styles.feature}><IconBadge name="layers-outline" /><View style={styles.grow}><Text style={styles.featureTitle}>Keep supplies ready</Text><Text style={styles.caption}>Record stock movements and spot low supplies.</Text></View></View>
      </Card>
      {error ? <Notice message={error} tone="error" /> : null}
      <Button label="Explore the demo" icon="arrow-forward" onPress={() => { void start(); }} loading={busy} />
      <Text style={styles.footnote}>No account required · Demo data stays on this device</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 6 },
  logo: { width: 49, height: 49, backgroundColor: colors.teal, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  brandName: { color: colors.navy, fontSize: 25, fontWeight: '800', letterSpacing: -0.7 },
  brandCaption: { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginTop: 2 },
  hero: { backgroundColor: colors.navy, borderRadius: 26, padding: 23, gap: 20 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 20, backgroundColor: '#254B59', paddingVertical: 7, paddingHorizontal: 11, flexShrink: 1 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#86D6C8' },
  pillText: { color: '#D7F3ED', fontSize: 11, fontWeight: '600', flexShrink: 1 },
  heroTitle: { color: colors.white, fontSize: 35, lineHeight: 42, fontWeight: '800', letterSpacing: -1.2 },
  heroCopy: { color: '#C4D9E0', fontSize: 15, lineHeight: 23, maxWidth: 550 },
  preview: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, gap: 12, marginTop: 4 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.tealLight },
  previewTitle: { color: colors.navy, fontSize: 14, fontWeight: '700' },
  previewCaption: { color: colors.muted, fontSize: 12, marginTop: 3 },
  previewDivider: { height: 1, backgroundColor: colors.border },
  previewRow: { flexDirection: 'row', gap: 9, alignItems: 'center' },
  previewText: { fontSize: 12, color: colors.navy, flex: 1, lineHeight: 18 },
  intro: { gap: 9 },
  title: { color: colors.navy, fontSize: 24, fontWeight: '800', lineHeight: 31, letterSpacing: -0.5 },
  caption: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 5 },
  featureTitle: { color: colors.navy, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  grow: { flex: 1 },
  footnote: { textAlign: 'center', color: colors.muted, fontSize: 12, lineHeight: 19 },
});
