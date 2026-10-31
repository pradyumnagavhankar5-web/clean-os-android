import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { dateKey } from '../domain/format';

/** Refresh after midnight in India and when returning from a suspended app. */
export function useBusinessDate() {
  const [today, setToday] = useState(() => dateKey());
  useEffect(() => {
    const refresh = () => setToday(dateKey());
    const interval = setInterval(refresh, 60_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => { clearInterval(interval); subscription.remove(); };
  }, []);
  return today;
}
