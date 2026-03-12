import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { toast } from 'sonner';

interface FormState {
  type: 'gas' | 'electric';
  make: string;
  model: string;
  year: number;
  purchasePrice: number;
  purchaseDate: string;
  initialOdometer: number;
  vin: string;
}

export function AddVehicleForm({ onSuccess }: { onSuccess: () => void }) {
  const register = useMutation(api.vehicles.register);
  const [form, setForm] = useState<FormState>({
    type: 'gas',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    purchasePrice: 0,
    purchaseDate: new Date().toISOString().slice(0, 10),
    initialOdometer: 0,
    vin: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register({
        type: form.type,
        make: form.make,
        model: form.model,
        year: form.year,
        purchasePrice: form.purchasePrice,
        purchaseDate: new Date(form.purchaseDate).getTime(),
        initialOdometer: form.initialOdometer,
        vin: form.type === 'electric' && form.vin ? form.vin : undefined,
      });
      onSuccess();
      toast.success('Vehicle registered');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to register vehicle');
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="space-y-2">
        <Label>Type</Label>
        <Select
          value={form.type}
          onValueChange={(v) => setForm({ ...form, type: v as 'gas' | 'electric' })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gas">Gas</SelectItem>
            <SelectItem value="electric">Electric</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Make</Label>
        <Input
          value={form.make}
          onChange={(e) => setForm({ ...form, make: e.target.value })}
          placeholder="e.g. Toyota"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Model</Label>
        <Input
          value={form.model}
          onChange={(e) => setForm({ ...form, model: e.target.value })}
          placeholder="e.g. Corolla"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Year</Label>
        <Input
          type="number"
          value={form.year}
          onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
          min={1900}
          max={new Date().getFullYear() + 1}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Purchase Price (CAD)</Label>
        <Input
          type="number"
          value={form.purchasePrice}
          onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })}
          min={0}
          step="0.01"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Purchase Date</Label>
        <Input
          type="date"
          value={form.purchaseDate}
          onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Odometer at Purchase (km)</Label>
        <Input
          type="number"
          value={form.initialOdometer}
          onChange={(e) => setForm({ ...form, initialOdometer: Number(e.target.value) })}
          min={0}
          required
        />
        <p className="text-xs text-muted-foreground">
          This is recorded as the odometer reading on the purchase date.
        </p>
      </div>
      {form.type === 'electric' && (
        <div className="space-y-2">
          <Label>VIN (for Tessie sync)</Label>
          <Input
            value={form.vin}
            onChange={(e) => setForm({ ...form, vin: e.target.value })}
            placeholder="Vehicle Identification Number"
          />
        </div>
      )}
      <Button type="submit" className="w-full">
        Register Vehicle
      </Button>
    </form>
  );
}
