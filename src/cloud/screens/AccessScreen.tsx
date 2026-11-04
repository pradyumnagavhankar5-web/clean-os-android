import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthProvider';
import { BrandLogo } from '../../ui/BrandLogo';
import { Button, Card, Chip, Field, Header, Notice, Screen, colors } from '../../ui';

type Mode = 'signin' | 'signup' | 'reset';

export default function AccessScreen() {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const recovering = auth.recovering;

  function chooseMode(value: Mode) {
    if (busy) return;
    setMode(value); setError(''); setMessage(''); setPassword(''); setConfirmation(''); auth.clearError();
  }
  async function submit() {
    setBusy(true); setError(''); setMessage(''); auth.clearError();
    try {
      if (recovering || mode === 'signup') {
        if (password !== confirmation) throw new Error('The passwords do not match.');
      }
      if (recovering) {
        await auth.changePassword(password);
        setPassword(''); setConfirmation(''); auth.finishRecovery();
      } else if (mode === 'signin') {
        await auth.signIn(email, password);
      } else if (mode === 'signup') {
        const result = await auth.signUp(email, password);
        setPassword(''); setConfirmation('');
        setMessage(result.confirmationRequired
          ? 'Check your email. Open the confirmation link on this device, then return to CleanOS. You can sign in after confirming.'
          : 'Your account is ready. Continue by creating or joining your workspace.');
        setMode('signin');
      } else {
        await auth.sendPasswordReset(email);
        setMessage('If this email has an account, a reset link will be sent. Open the latest link on this device to set a new password.');
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The request could not be completed. Please try again.'); }
    finally { setBusy(false); }
  }

  async function clearSavedSignIn() {
    setBusy(true); setError('');
    try { await auth.forgetSavedSession(); setMessage('Saved sign-in cleared. Sign in to access your workspace.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not clear the saved sign-in. Please try again.'); }
    finally { setBusy(false); }
  }

  const title = recovering ? 'Set a new password' : mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Welcome to CleanOS';
  return <SafeAreaView style={styles.safeArea}>
    <Screen style={styles.content}>
      <View style={styles.brand}><BrandLogo size={56} decorative /><View style={styles.brandCopy}><Text style={styles.brandName}>CleanOS</Text><Text style={styles.tagline}>Smart Housekeeping Management</Text></View></View>
      <Header eyebrow="YOUR SHARED WORKSPACE" title={title} subtitle={recovering ? 'Choose a strong password to protect your account.' : 'Sign in to manage your team’s cleaning tasks and supplies.'} />
      {!recovering ? <View style={styles.tabs}><Chip label="Sign in" selected={mode === 'signin'} onPress={() => chooseMode('signin')} /><Chip label="Create account" selected={mode === 'signup'} onPress={() => chooseMode('signup')} /></View> : null}
      <Card>
        {!recovering ? <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@company.com" autoCapitalize="none" autoCorrect={false} editable={!busy} /> : null}
        {recovering || mode !== 'reset' ? <Field label={recovering ? 'New password' : 'Password'} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy} /> : null}
        {recovering || mode === 'signup' ? <><Text style={styles.hint}>Use at least 10 characters. Keep your password private.</Text><Field label="Confirm password" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy} /></> : null}
        {message ? <Notice message={message} tone="success" /> : null}
        {error || auth.error ? <Notice message={error || auth.error} tone="error" /> : null}
        <Button label={recovering ? 'Save new password' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'} icon={recovering ? 'checkmark-outline' : 'arrow-forward'} loading={busy || auth.loading} onPress={() => void submit()} />
        {!recovering && mode === 'signin' ? <Button label="Forgot password?" variant="ghost" disabled={busy} onPress={() => chooseMode('reset')} /> : null}
        {!recovering && mode === 'reset' ? <Button label="Back to sign in" variant="ghost" disabled={busy} onPress={() => chooseMode('signin')} /> : null}
        {recovering ? <Button label="Cancel and sign out" variant="secondary" disabled={busy} onPress={() => { setBusy(true); void auth.signOut().catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not sign out.')).finally(() => setBusy(false)); }} /> : null}
      </Card>
      {auth.error ? <Card><Text style={styles.hint}>Retry restoring your sign-in. Clearing the saved sign-in removes credentials from this device; your shared workspace data stays on the server.</Text><Button label="Retry restoring session" variant="secondary" disabled={busy} onPress={() => void auth.retrySession()} /><Button label="Clear saved sign-in" variant="ghost" disabled={busy} onPress={() => void clearSavedSignIn()} /></Card> : null}
      {mode === 'signup' && !recovering ? <Text style={styles.caption}>Your administrator can provide a workspace invite code. Create your own account first, then join with that code.</Text> : null}
      <View style={styles.footer}><Text style={styles.caption}>Aura Tradings · India</Text><Text style={styles.developer}>Developed by Aura Builds</Text></View>
    </Screen>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { maxWidth: 620 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  brandCopy: { flex: 1, gap: 4 },
  brandName: { color: colors.navy, fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  tagline: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  caption: { color: colors.muted, fontSize: 13, lineHeight: 21, textAlign: 'center' },
  footer: { gap: 5, paddingVertical: 10 },
  developer: { color: colors.muted, fontSize: 12, lineHeight: 19, fontWeight: '600', textAlign: 'center' },
});
