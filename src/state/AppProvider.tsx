import type { ReactNode } from 'react';
import { APP_MODE } from '../config/cloud';
import { CloudProvider } from '../cloud/CloudProvider';
import { DemoAppProvider } from './DemoAppProvider';

export { useApp } from './AppContext';
/** Real shared data is the default; sample data uses an explicit isolated mode. */
export function AppProvider({ children }: { children: ReactNode }) {
  return APP_MODE === 'demo'
    ? <DemoAppProvider>{children}</DemoAppProvider>
    : <CloudProvider>{children}</CloudProvider>;
}
