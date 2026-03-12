import { useAction, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SyncStatus } from '@/components/SyncStatus';
import { useState } from 'react';
import { toast } from 'sonner';

export function SettingsPage() {
  const latestSync = useQuery(api.syncLogs.getLatest);
  const syncState = useQuery(api.settings.getEvSyncState);
  const setCredential = useAction(api.settingsActions.setEvCredential);
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);

  const isStale =
    latestSync !== undefined &&
    latestSync !== null &&
    (latestSync.outcome === 'failure' || Date.now() - latestSync.startedAt > 48 * 60 * 60 * 1000);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await setCredential({ token });
      setToken('');
      toast.success('Tessie API token saved securely.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save token');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Tessie API Credentials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {syncState === undefined ? (
            <p className="text-sm text-muted-foreground">Loading credential status...</p>
          ) : (
            <>
              <p
                className={
                  syncState.hasCredentials
                    ? 'text-sm text-green-600 dark:text-green-400'
                    : 'text-sm text-amber-600 dark:text-amber-400'
                }
              >
                {syncState.hasCredentials
                  ? 'API token is configured. Enter a new token below to replace it.'
                  : 'No Tessie API token is configured yet.'}
              </p>
              {syncState.isAdmin ? (
                <>
                  <div className="space-y-2">
                    <Label>API Token</Label>
                    <Input
                      type="password"
                      placeholder="Tessie API token"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      autoComplete="off"
                    />
                    <p className="text-xs text-muted-foreground">
                      Token is stored encrypted and never displayed after saving.
                    </p>
                  </div>
                  <Button onClick={() => void handleSave()} disabled={!token || saving}>
                    {saving ? 'Saving…' : 'Save Token'}
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Only admins can manage Tessie credentials. Contact an admin to enable EV sync.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sync Status</CardTitle>
        </CardHeader>
        <CardContent>
          <SyncStatus log={latestSync ?? null} isStale={isStale} />
        </CardContent>
      </Card>
    </div>
  );
}
