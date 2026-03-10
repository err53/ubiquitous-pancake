import { Button } from '@/components/ui/button';
import { cad } from '@/lib/formatters';
import { format } from 'date-fns';

interface CostEvent {
  id: string;
  date: number;
  cost: number;
  label: string; // e.g. "40.0L" for fill-up or description for maintenance
  odometer: number;
}

interface CostEventListProps {
  events: CostEvent[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  emptyMessage?: string;
}

export function CostEventList({ events, onEdit, onDelete, emptyMessage = 'No records yet.' }: CostEventListProps) {
  if (events.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyMessage}</p>;
  }

  const sorted = [...events].sort((a, b) => b.date - a.date);

  return (
    <div className="space-y-2">
      {sorted.map((event) => (
        <div key={event.id} className="flex items-center justify-between rounded-md border p-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{format(event.date, 'MMM d, yyyy')}</p>
            <p className="text-xs text-muted-foreground">
              {event.odometer.toLocaleString('en-CA')} km · {event.label} · {cad(event.cost)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit(event.id)}>
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(event.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
