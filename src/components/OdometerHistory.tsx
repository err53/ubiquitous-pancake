import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

interface OdometerHistoryItem {
  id: string;
  date: number;
  odometer: number;
  source: 'manual' | 'charging_session' | 'fill_up' | 'maintenance';
}

const sourceLabel: Record<OdometerHistoryItem['source'], string> = {
  manual: 'Manual',
  charging_session: 'Charging session',
  fill_up: 'Fill-up',
  maintenance: 'Maintenance',
};

const PAGE_SIZE = 10;

export function OdometerHistory({
  readings,
  onEdit,
  onDelete,
}: {
  readings: OdometerHistoryItem[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => [...readings].sort((a, b) => b.date - a.date), [readings]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageReadings = sorted.slice(pageStart, pageStart + PAGE_SIZE);

  if (readings.length === 0) {
    return <p className="text-sm text-muted-foreground">No odometer history yet.</p>;
  }

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Reading</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageReadings.map((reading) => {
            const editable = reading.source === 'manual';
            return (
              <TableRow key={reading.id}>
                <TableCell>{format(reading.date, 'PPP')}</TableCell>
                <TableCell>{reading.odometer.toLocaleString('en-CA')} km</TableCell>
                <TableCell>{sourceLabel[reading.source]}</TableCell>
                <TableCell className="text-right">
                  {editable ? (
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(reading.id)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onDelete(reading.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Edit the source entry</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {pageStart + 1}-{Math.min(pageStart + PAGE_SIZE, sorted.length)} of {sorted.length}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
