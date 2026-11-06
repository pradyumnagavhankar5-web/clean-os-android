import { createContext, useContext } from 'react';
import type { Action, AppState } from '../domain';
import type { CloudCommands } from '../cloud/types';

export interface AppContextValue {
  state: AppState;
  act: (action: Action) => Promise<void>;
  busy: boolean;
  resetDemo: () => Promise<void>;
  mode: 'demo' | 'cloud';
  cloud?: CloudCommands;
}
export const AppContext = createContext<AppContextValue | null>(null);
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be inside AppProvider.');
  return value;
}
