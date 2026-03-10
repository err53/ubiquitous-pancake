import { format } from 'date-fns';

interface SyncLog {
  startedAt: number;
  outcome: 'success' | 'partial' | 'failure';
  message?: string;
  sessionsAdded?: number;
}

interface SyncStatusProps {
  log: SyncLog | null | undefined;
  isStale: boolean;
}

export function SyncStatus({ log, isStale }: SyncStatusProps) {
  if (log === undefined) {
    return <p className="text-muted-foreground text-sm">Loading...</p>;
  }
  if (log === null) {
    return <p className="text-muted-foreground text-sm">No sync data yet.</p>;
  }
  return (
    <div className="space-y-1 text-sm">
      <p>
        Last sync: <span className="font-medium">{format(log.startedAt, 'PPpp')}</span>
      </p>
      <p>
        Outcome:{' '}
        <span
          className={
            log.outcome === 'success'
              ? 'text-green-600 dark:text-green-400 font-medium'
              : 'text-destructive font-medium'
          }
        >
          {log.outcome}
        </span>
      </p>
      {log.sessionsAdded !== undefined && <p>Sessions added: {log.sessionsAdded}</p>}
      {log.message && <p className="text-muted-foreground">{log.message}</p>}
      {isStale && (
        <p className="text-amber-600 dark:text-amber-400 font-medium mt-2">
          ⚠ EV data may be stale (last sync was over 48h ago or failed).
        </p>
      )}
    </div>
  );
}
