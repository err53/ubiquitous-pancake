import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { toast } from 'sonner';

export function DepreciationEntry({
  vehicleId,
  editId,
  initialValues,
  onSuccess,
}: {
  vehicleId: Id<'vehicles'>;
  editId?: Id<'marketValuations'>;
  initialValues?: { date: number; valuationCAD: number };
  onSuccess: () => void;
}) {
  const addValuation = useMutation(api.depreciation.addValuation);
  const updateValuation = useMutation(api.depreciation.updateValuation);
  const [form, setForm] = useState({
    date: initialValues ? new Date(initialValues.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    valuationCAD: initialValues?.valuationCAD ?? 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await updateValuation({
          id: editId,
          date: new Date(form.date).getTime(),
          valuationCAD: form.valuationCAD,
        });
        toast.success('Market valuation updated');
      } else {
        await addValuation({
          vehicleId,
          date: new Date(form.date).getTime(),
          valuationCAD: form.valuationCAD,
        });
        toast.success('Market valuation saved');
      }
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save valuation');
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="space-y-2">
        <Label>Date</Label>
        <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label>Market Value (CAD)</Label>
        <Input
          type="number"
          value={form.valuationCAD}
          step="0.01"
          onChange={(e) => setForm({ ...form, valuationCAD: Number(e.target.value) })}
          min={0}
          required
        />
      </div>
      <Button type="submit" className="w-full">{editId ? 'Update Valuation' : 'Save Valuation'}</Button>
    </form>
  );
}
