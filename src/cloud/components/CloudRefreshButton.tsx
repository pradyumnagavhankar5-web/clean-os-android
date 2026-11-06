import { useApp } from '../../state/AppProvider';
import { Button } from '../../ui';
export default function CloudRefreshButton() {
  const { cloud, busy } = useApp();
  if (!cloud) return null;
  return <Button label="Refresh" icon="refresh-outline" variant="ghost" loading={cloud.refreshing} disabled={busy}
    onPress={() => { void cloud.refresh().catch(() => undefined); }} />;
}
