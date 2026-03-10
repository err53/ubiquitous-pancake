import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AddVehicleForm } from '@/components/AddVehicleForm';
import { toast } from 'sonner';

export function VehiclesPage() {
  const vehicles = useQuery(api.vehicles.list);
  const removeVehicle = useMutation(api.vehicles.remove);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  if (vehicles === undefined) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Vehicles</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>Add Vehicle</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register Vehicle</DialogTitle>
            </DialogHeader>
            <AddVehicleForm onSuccess={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      {vehicles.length === 0 ? (
        <p className="text-muted-foreground">No vehicles yet. Add one to get started.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => (
            <Card
              key={v._id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => { void navigate(`/vehicles/${v._id}`); }}
            >
              <CardHeader>
                <CardTitle className="text-lg">
                  {v.year} {v.make} {v.model}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground capitalize">{v.type}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    void removeVehicle({ id: v._id }).catch((err: unknown) => {
                      toast.error(err instanceof Error ? err.message : 'Failed to remove vehicle');
                    });
                  }}
                >
                  Remove
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
