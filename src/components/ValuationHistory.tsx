import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cad } from '@/lib/formatters';
import { format } from 'date-fns';

interface ValuationHistoryItem {
  id: string;
  date: number;
  valuationCAD: number;
}

export function ValuationHistory({
  valuations,
  onEdit,
  onDelete,
}: {
  valuations: ValuationHistoryItem[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (valuations.length === 0) {
    return <p className="text-sm text-muted-foreground">No market valuations recorded yet.</p>;
  }

  const sorted = [...valuations].sort((a, b) => b.date - a.date);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Market value</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((valuation) => (
          <TableRow key={valuation.id}>
            <TableCell>{format(valuation.date, 'PPP')}</TableCell>
            <TableCell>{cad(valuation.valuationCAD)}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => onEdit(valuation.id)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(valuation.id)}
                >
                  Delete
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
