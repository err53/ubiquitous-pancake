import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { toast } from 'sonner';

export function OdometerEntry({ vehicleId, onSuccess }: { vehicleId: Id<'vehicles'>; onSuccess: () => void }) {
  const addReading = useMutation(api.odometer.addManualReading);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    odometer: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addReading({
        vehicleId,
        date: new Date(form.date).getTime(),
        odometer: form.odometer,
      });
      toast.success('Odometer reading saved');
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
      <Button type="submit" className="w-full">Save Reading</Button>
    </form>
  );
}
