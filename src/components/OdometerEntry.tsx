import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { toast } from 'sonner';

export function OdometerEntry({
  vehicleId,
  editId,
  initialValues,
  onSuccess,
}: {
  vehicleId: Id<'vehicles'>;
  editId?: Id<'odometerReadings'>;
  initialValues?: { date: number; odometer: number };
  onSuccess: () => void;
}) {
  const addReading = useMutation(api.odometer.addManualReading);
  const updateReading = useMutation(api.odometer.updateManualReading);
  const [form, setForm] = useState({
    date: initialValues ? new Date(initialValues.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    odometer: initialValues?.odometer ?? 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await updateReading({
          id: editId,
          date: new Date(form.date).getTime(),
          odometer: form.odometer,
        });
        toast.success('Odometer reading updated');
      } else {
        await addReading({
          vehicleId,
          date: new Date(form.date).getTime(),
          odometer: form.odometer,
        });
        toast.success('Odometer reading saved');
      }
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save reading');
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="space-y-2">
        <Label>Date</Label>
        <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label>Odometer (km)</Label>
        <Input
          type="number"
          value={form.odometer}
          onChange={(e) => setForm({ ...form, odometer: Number(e.target.value) })}
          min={0}
          required
        />
      </div>
      <Button type="submit" className="w-full">{editId ? 'Update Reading' : 'Save Reading'}</Button>
    </form>
  );
}
