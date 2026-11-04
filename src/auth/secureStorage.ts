import * as SecureStore from 'expo-secure-store';
import { createChunkedStorage } from './chunkedStorage';

const options: SecureStore.SecureStoreOptions = { keychainService: 'cleanos.team.auth' };

export const secureAuthStorage = createChunkedStorage({
  getItem: (key) => SecureStore.getItemAsync(key, options),
  setItem: (key, value) => SecureStore.setItemAsync(key, value, options),
  removeItem: (key) => SecureStore.deleteItemAsync(key, options),
});
