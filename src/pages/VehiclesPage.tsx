import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AddVehicleForm } from '@/components/AddVehicleForm';
import { Car, Zap, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function VehiclesPage() {
  const vehicles = useQuery(api.vehicles.list);
  const removeVehicle = useMutation(api.vehicles.remove);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  if (vehicles === undefined) {
    return <div className="text-muted-foreground text-sm">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vehicles</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {vehicles.length === 0
              ? 'No vehicles yet'
              : `${vehicles.length} vehicle${vehicles.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="gap-2"><Plus className="w-4 h-4" />Add Vehicle</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register Vehicle</DialogTitle>
            </DialogHeader>
            <AddVehicleForm onSuccess={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {vehicles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Car className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">No vehicles yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">Add a vehicle to start tracking costs.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => {
            const isElectric = v.type === 'electric';
            return (
              <Card
                key={v._id}
                className="group cursor-pointer hover:ring-border transition-all"
                onClick={() => { void navigate(`/vehicles/${v._id}`); }}
              >
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isElectric ? 'bg-chart-2/15' : 'bg-primary/15'}`}>
                        {isElectric
                          ? <Zap className="w-4 h-4 text-chart-2" />
                          : <Car className="w-4 h-4 text-primary" />
                        }
                      </div>
                      <div>
                        <p className="font-semibold text-sm leading-snug">
                          {v.year} {v.make} {v.model}
                        </p>
                        <span className={`inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-xs font-medium capitalize ${
                          isElectric
                            ? 'bg-chart-2/10 text-chart-2'
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {v.type}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        void removeVehicle({ id: v._id }).catch((err: unknown) => {
                          toast.error(err instanceof Error ? err.message : 'Failed to remove vehicle');
                        });
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
