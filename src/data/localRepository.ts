import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStorageRepository } from './repository';

export const localRepository = createStorageRepository(AsyncStorage);
