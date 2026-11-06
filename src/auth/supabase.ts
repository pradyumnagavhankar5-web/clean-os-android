import 'react-native-url-polyfill/auto';
import { createClient, processLock } from '@supabase/supabase-js';
import * as NativeCrypto from 'expo-crypto';
import { CLOUD_CONFIG } from '../config/cloud';
import { secureAuthStorage } from './secureStorage';
import { createPkceFetch } from './pkceFetch';

// Auth code verifiers must use device cryptographic randomness, including Hermes.
if (typeof globalThis.crypto === 'undefined') {
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: {
    getRandomValues: NativeCrypto.getRandomValues, randomUUID: NativeCrypto.randomUUID,
  } });
} else if (typeof globalThis.crypto.getRandomValues !== 'function') {
  Object.defineProperty(globalThis.crypto, 'getRandomValues', { configurable: true, value: NativeCrypto.getRandomValues });
}

export const AUTH_STORAGE_KEY = 'cleanos-team-session';

export const supabase = createClient(CLOUD_CONFIG.url, CLOUD_CONFIG.publishableKey, {
  global: { fetch: createPkceFetch(globalThis.fetch.bind(globalThis), CLOUD_CONFIG.url,
    value => NativeCrypto.digestStringAsync(NativeCrypto.CryptoDigestAlgorithm.SHA256, value, { encoding: NativeCrypto.CryptoEncoding.BASE64 })) },
  auth: {
    lock: processLock,
    storage: secureAuthStorage,
    storageKey: AUTH_STORAGE_KEY,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
