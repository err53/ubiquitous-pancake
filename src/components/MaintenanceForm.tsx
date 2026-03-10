import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { toast } from 'sonner';

interface MaintenanceFormProps {
  vehicleId: Id<'vehicles'>;
  onSuccess: () => void;
  editId?: Id<'maintenanceRecords'>;
  initialValues?: {
    date: number;
    odometer: number;
    description: string;
    cost: number;
  };
}

export function MaintenanceForm({ vehicleId, onSuccess, editId, initialValues }: MaintenanceFormProps) {
  const addMaintenance = useMutation(api.gasData.addMaintenance);
  const updateMaintenance = useMutation(api.gasData.updateMaintenance);

  const [form, setForm] = useState({
    date: initialValues ? new Date(initialValues.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    odometer: initialValues?.odometer ?? 0,
    description: initialValues?.description ?? '',
    cost: initialValues?.cost ?? 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      date: new Date(form.date).getTime(),
      odometer: form.odometer,
      description: form.description,
      cost: form.cost,
    };
    try {
      if (editId) {
        await updateMaintenance({ id: editId, ...data });
      } else {
        await addMaintenance({ vehicleId, ...data });
      }
      onSuccess();
      toast.success(editId ? 'Record updated' : 'Record added');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save record');
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
        <Label>Description</Label>
        <Input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="e.g. Oil change"
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
        {editId ? 'Update' : 'Add Record'}
      </Button>
    </form>
  );
}
