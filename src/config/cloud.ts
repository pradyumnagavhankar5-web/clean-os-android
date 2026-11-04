/** Public client settings. Authorization is enforced by Supabase Auth and RLS. */
export const CLOUD_CONFIG = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://zhfvvumdgidiognelnqh.supabase.co',
  publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_ibz1ONqxIXaEfQtALFS87g_E8yWM3-i',
  redirectUrl: 'cleanos-team://auth/callback',
};

export const APP_MODE = process.env.EXPO_PUBLIC_CLEANOS_MODE === 'demo' ? 'demo' : 'cloud';
