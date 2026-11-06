import React, { useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

type IconName = ComponentProps<typeof Ionicons>['name'];
type Tone = 'neutral' | 'success' | 'warning' | 'danger';

export const colors = {
  navy: '#102D3D',
  teal: '#087F76',
  tealDark: '#06685F',
  tealLight: '#E8F5F2',
  white: '#FFFFFF',
  background: '#F3F6F9',
  bg: '#F3F6F9',
  surface: '#FFFFFF',
  text: '#102D3D',
  muted: '#526877',
  border: '#E1E8EE',
  success: '#14714C',
  successLight: '#E7F5EC',
  warning: '#8B5700',
  warningLight: '#FFF3D8',
  danger: '#AE3440',
  dangerLight: '#FCECEF',
};

const toneColors: Record<Tone, { foreground: string; background: string }> = {
  neutral: { foreground: colors.muted, background: '#EDF2F4' },
  success: { foreground: colors.success, background: colors.successLight },
  warning: { foreground: colors.warning, background: colors.warningLight },
  danger: { foreground: colors.danger, background: colors.dangerLight },
};

export function Screen({ children, scroll = true, style }: {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const content = <View style={[styles.screenContent, style]}>{children}</View>;
  return scroll ? (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {content}
    </ScrollView>
  ) : <View style={styles.screen}>{content}</View>;
}

export function Header({ eyebrow, title, subtitle, action }: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action ? <View style={styles.headerAction}>{action}</View> : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label, onPress, variant = 'primary', icon, disabled = false,
  loading = false, style, accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const foreground = variant === 'primary' || variant === 'danger' ? colors.white : colors.teal;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={foreground} size="small" /> :
        icon ? <Ionicons name={icon} size={20} color={foreground} accessible={false} /> : null}
      <Text style={[styles.buttonLabel, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected = false, onPress, tone = 'neutral' }: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: Tone;
}) {
  const palette = selected ? { foreground: colors.white, background: colors.teal } : toneColors[tone];
  const text = <Text style={[styles.chipLabel, { color: palette.foreground }]}>{label}</Text>;
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        styles.chipInteractive,
        { backgroundColor: selected ? palette.background : colors.white, borderColor: selected ? colors.teal : colors.border },
        pressed && styles.pressed,
      ]}
    >{text}</Pressable>
  ) : <View style={[styles.chip, { backgroundColor: palette.background }]}>{text}</View>;
}

export function Field({
  label, value, onChangeText, placeholder, keyboardType = 'default',
  multiline = false, error, secureTextEntry = false, editable = true,
  autoCapitalize = 'sentences', autoCorrect = true,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  error?: string;
  secureTextEntry?: boolean;
  editable?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        editable={editable}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          multiline && styles.multilineInput,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
          !editable && styles.inputDisabled,
        ]}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      {error ? <Text accessibilityLiveRegion="polite" style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function EmptyState({ icon = 'file-tray-outline', title, message, action }: {
  icon?: IconName;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={30} color={colors.teal} accessible={false} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

export function IconBadge({ name, color = colors.teal, background = colors.tealLight }: {
  name: IconName;
  color?: string;
  background?: string;
}) {
  return <View style={[styles.iconBadge, { backgroundColor: background }]}><Ionicons name={name} size={22} color={color} accessible={false} /></View>;
}

export function Metric({ label, value, icon, tone = 'neutral' }: {
  label: string;
  value: string | number;
  icon: IconName;
  tone?: Tone;
}) {
  const palette = toneColors[tone];
  return (
    <View style={styles.metric} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricLabel}>{label}</Text>
        <View style={[styles.metricIcon, { backgroundColor: tone === 'neutral' ? colors.tealLight : palette.background }]}>
          <Ionicons name={icon} size={19} color={tone === 'neutral' ? colors.teal : palette.foreground} accessible={false} />
        </View>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export function ModalSheet({ visible, title, onClose, children }: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable
          style={styles.modalBackdrop}
          accessibilityLabel="Close dialog"
          accessibilityRole="button"
          onPress={onClose}
        />
        <View style={styles.modalSheet} accessibilityViewIsModal>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text accessibilityRole="header" style={styles.modalTitle}>{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <Ionicons name="close" size={24} color={colors.navy} accessible={false} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Notice({ message, tone = 'info' }: {
  message: string;
  tone?: 'info' | 'error' | 'success';
}) {
  const palette = tone === 'error' ? toneColors.danger : tone === 'success' ? toneColors.success :
    { foreground: colors.tealDark, background: colors.tealLight };
  const icon: IconName = tone === 'error' ? 'alert-circle-outline' : tone === 'success' ? 'checkmark-circle-outline' : 'information-circle-outline';
  return (
    <View style={[styles.notice, { backgroundColor: palette.background }]} accessibilityLiveRegion="polite">
      <Ionicons name={icon} size={21} color={palette.foreground} accessible={false} style={styles.noticeIcon} />
      <Text style={[styles.noticeText, { color: palette.foreground }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  screenContent: { width: '100%', maxWidth: 1000, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 22 },
  header: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingTop: 2, paddingBottom: 4 },
  headerCopy: { flex: 1, minWidth: 180, gap: 6 },
  headerAction: { flexShrink: 1 },
  eyebrow: { color: colors.tealDark, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase' },
  title: { color: colors.navy, fontSize: 28, lineHeight: 36, fontWeight: '700', letterSpacing: -0.7 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  card: { backgroundColor: colors.white, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border, gap: 14, elevation: 1, shadowColor: '#183749', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8 },
  button: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 13, borderRadius: 12, gap: 9, borderWidth: 1, borderColor: 'transparent' },
  buttonPrimary: { backgroundColor: colors.teal },
  buttonSecondary: { backgroundColor: colors.white, borderColor: '#BDD6D3' },
  buttonGhost: { backgroundColor: 'transparent' },
  buttonDanger: { backgroundColor: colors.danger },
  buttonLabel: { fontSize: 15, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.45 },
  chip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start', justifyContent: 'center', maxWidth: '100%' },
  chipInteractive: { minHeight: 48, paddingHorizontal: 15, paddingVertical: 11, borderRadius: 12, borderWidth: 1 },
  chipLabel: { fontSize: 12, fontWeight: '600', lineHeight: 18 },
  field: { gap: 8 },
  fieldLabel: { color: colors.navy, fontSize: 13, fontWeight: '600', lineHeight: 20 },
  input: { minHeight: 54, backgroundColor: colors.white, borderWidth: 1, borderColor: '#C6D3DD', borderRadius: 12, color: colors.navy, fontSize: 16, lineHeight: 23, paddingVertical: 14, paddingHorizontal: 15 },
  inputFocused: { borderColor: colors.teal, backgroundColor: '#FBFEFD' },
  multilineInput: { minHeight: 106 },
  inputError: { borderColor: colors.danger },
  inputDisabled: { backgroundColor: '#EDF2F4', color: colors.muted },
  fieldError: { color: colors.danger, fontSize: 13, lineHeight: 19 },
  empty: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 24, paddingVertical: 32, alignItems: 'center', gap: 12 },
  emptyIcon: { width: 60, height: 60, borderRadius: 18, backgroundColor: colors.tealLight, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { color: colors.navy, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyMessage: { color: colors.muted, fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 380 },
  emptyAction: { marginTop: 8, maxWidth: '100%' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  sectionTitle: { color: colors.navy, fontSize: 17, lineHeight: 24, fontWeight: '700', letterSpacing: -0.2, flexShrink: 1 },
  iconBadge: { width: 44, height: 44, flexShrink: 0, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  metric: { flex: 1, minWidth: 130, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 13 },
  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metricIcon: { width: 34, height: 34, flexShrink: 0, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  metricValue: { color: colors.navy, fontSize: 30, lineHeight: 38, fontWeight: '700', letterSpacing: -0.8 },
  metricLabel: { color: colors.muted, fontSize: 12, fontWeight: '500', lineHeight: 18, flex: 1 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#102D3D99' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modalSheet: { maxHeight: '92%', width: '100%', maxWidth: 760, alignSelf: 'center', backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D0DAE1', alignSelf: 'center', marginTop: 10 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingLeft: 22, paddingRight: 12, paddingTop: 4, paddingBottom: 10, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { color: colors.navy, fontSize: 20, lineHeight: 28, letterSpacing: -0.3, fontWeight: '700', flex: 1 },
  closeButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  modalContent: { padding: 22, paddingBottom: 36, gap: 20 },
  notice: { borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  noticeIcon: { marginTop: 1 },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 21 },
});
