import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { toast } from 'sonner';

interface FillUpFormProps {
  vehicleId: Id<'vehicles'>;
  onSuccess: () => void;
  editId?: Id<'gasFillUps'>;
  initialValues?: {
    date: number;
    odometer: number;
    volumeLitres: number;
    cost: number;
  };
}

export function FillUpForm({ vehicleId, onSuccess, editId, initialValues }: FillUpFormProps) {
  const addFillUp = useMutation(api.gasData.addFillUp);
  const updateFillUp = useMutation(api.gasData.updateFillUp);

  const [form, setForm] = useState({
    date: initialValues ? new Date(initialValues.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    odometer: initialValues?.odometer ?? 0,
    volumeLitres: initialValues?.volumeLitres ?? 0,
    cost: initialValues?.cost ?? 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      date: new Date(form.date).getTime(),
      odometer: form.odometer,
      volumeLitres: form.volumeLitres,
      cost: form.cost,
    };
    try {
      if (editId) {
        await updateFillUp({ id: editId, ...data });
      } else {
        await addFillUp({ vehicleId, ...data });
      }
      onSuccess();
      toast.success(editId ? 'Fill-up updated' : 'Fill-up added');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save fill-up');
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
      <div className="space-y-2">
        <Label>Volume (litres)</Label>
        <Input
          type="number"
          value={form.volumeLitres}
          step="0.01"
          onChange={(e) => setForm({ ...form, volumeLitres: Number(e.target.value) })}
          min={0}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Cost (CAD)</Label>
        <Input
          type="number"
          value={form.cost}
          step="0.01"
          onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
          min={0}
          required
        />
      </div>
      <Button type="submit" className="w-full">
        {editId ? 'Update' : 'Add Fill-up'}
      </Button>
    </form>
  );
}
