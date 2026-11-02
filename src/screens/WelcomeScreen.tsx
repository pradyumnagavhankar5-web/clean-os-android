import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useApp } from '../state/AppProvider';
import { Button, Card, colors, IconBadge, Notice, Screen } from '../ui';
import { BrandLogo } from '../ui/BrandLogo';

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
        <BrandLogo size={49} decorative />
        <View style={styles.grow}><Text style={styles.brandName}>CleanOS</Text><Text style={styles.brandCaption}>AURA TRADINGS · INDIA</Text></View>
      </View>
      <View style={styles.hero}>
        <View style={styles.heroTop}><View style={styles.pill}><View style={styles.dot} /><Text style={styles.pillText}>HOUSEKEEPING OPERATIONS</Text></View><Ionicons name="checkmark-done-outline" size={27} color="#86D6C8" accessible={false} /></View>
        <Text accessibilityRole="header" style={styles.heroTitle}>A cleaner day.{'\n'}A clearer plan.</Text>
        <Text style={styles.heroCopy}>Give your team one place to organise daily cleaning, follow checklists and keep supplies ready.</Text>
        <View style={styles.preview}>
          <View style={styles.previewHeader}><View style={styles.previewIcon}><Ionicons name="business-outline" size={25} color={colors.teal} accessible={false} /></View><View style={styles.grow}><Text style={styles.previewTitle}>One workspace, every shift</Text><Text style={styles.previewCaption}>Facilities · Teams · Supplies</Text></View></View>
          <View style={styles.previewDivider} />
          <View style={styles.previewRow}><Ionicons name="checkbox-outline" size={21} color={colors.teal} accessible={false} /><Text style={styles.previewText}>Clear tasks for every team member</Text></View>
          <View style={styles.previewRow}><Ionicons name="cube-outline" size={21} color={colors.teal} accessible={false} /><Text style={styles.previewText}>Supplies tracked as they move</Text></View>
        </View>
      </View>
      <View style={styles.intro}><Text style={styles.eyebrow}>BUILT FOR YOUR DAILY OPERATIONS</Text><Text accessibilityRole="header" style={styles.title}>Smart Housekeeping Management</Text><Text style={styles.caption}>For offices, hotels, hospitals, housing societies and housekeeping contractors.</Text></View>
      <Card style={styles.features}>
        <View style={styles.feature}><IconBadge name="list-outline" /><View style={styles.grow}><Text style={styles.featureTitle}>Make every task clear</Text><Text style={styles.caption}>Assign work, follow checklists and track completion.</Text></View></View>
        <View style={styles.featureDivider} />
        <View style={styles.feature}><IconBadge name="layers-outline" /><View style={styles.grow}><Text style={styles.featureTitle}>Keep supplies ready</Text><Text style={styles.caption}>Record stock movements and spot low supplies.</Text></View></View>
      </Card>
      {error ? <Notice message={error} tone="error" /> : null}
      <Button label="Explore the demo" icon="arrow-forward" onPress={() => { void start(); }} loading={busy} />
      <View style={styles.footer}><Text style={styles.footnote}>No account required · Saved on this device</Text><Text style={styles.developer}>Developed by Aura Builds</Text></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  brandName: { color: colors.navy, fontSize: 25, fontWeight: '800', letterSpacing: -0.6 },
  brandCaption: { color: colors.muted, fontSize: 10, fontWeight: '600', letterSpacing: 1, marginTop: 3, lineHeight: 16 },
  hero: { backgroundColor: colors.navy, borderRadius: 24, padding: 22, gap: 19 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 4, flex: 1 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#86D6C8' },
  pillText: { color: '#D7F3ED', fontSize: 10, lineHeight: 16, fontWeight: '700', letterSpacing: 1, flexShrink: 1 },
  heroTitle: { color: colors.white, fontSize: 32, lineHeight: 40, fontWeight: '800', letterSpacing: -0.9 },
  heroCopy: { color: '#C4D9E0', fontSize: 15, lineHeight: 23, maxWidth: 550 },
  preview: { backgroundColor: colors.white, borderRadius: 16, padding: 15, gap: 12, marginTop: 3 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.tealLight },
  previewTitle: { color: colors.navy, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  previewCaption: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  previewDivider: { height: 1, backgroundColor: colors.border },
  previewRow: { flexDirection: 'row', gap: 9, alignItems: 'center' },
  previewText: { fontSize: 13, color: colors.navy, flex: 1, lineHeight: 20 },
  intro: { gap: 8, paddingTop: 4 },
  eyebrow: { color: colors.teal, fontSize: 10, fontWeight: '700', lineHeight: 17, letterSpacing: 1.2 },
  title: { color: colors.navy, fontSize: 23, fontWeight: '700', lineHeight: 31, letterSpacing: -0.5 },
  caption: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  features: { gap: 15 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 2 },
  featureDivider: { height: 1, backgroundColor: colors.border },
  featureTitle: { color: colors.navy, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  grow: { flex: 1, minWidth: 0 },
  footer: { gap: 8, paddingBottom: 8 },
  footnote: { textAlign: 'center', color: colors.muted, fontSize: 12, lineHeight: 19 },
  developer: { textAlign: 'center', color: colors.muted, fontSize: 12, lineHeight: 19, fontWeight: '600' },
});
