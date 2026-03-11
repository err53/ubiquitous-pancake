import { useQuery, useMutation, useAction } from 'convex/react';
import { useParams } from 'react-router-dom';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FillUpForm } from '@/components/FillUpForm';
import { MaintenanceForm } from '@/components/MaintenanceForm';
import { CostEventList } from '@/components/CostEventList';
import { MetricsPanel } from '@/components/MetricsPanel';
import { CostChart } from '@/components/CostChart';
import { TimeRangeSelector } from '@/components/TimeRangeSelector';
import { OdometerEntry } from '@/components/OdometerEntry';
import { DepreciationEntry } from '@/components/DepreciationEntry';
import { getDateRange, type TimeRange } from '@/lib/dates';
import { cad } from '@/lib/formatters';
import { format } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const vehicleId = id as Id<'vehicles'>;

  const vehicle = useQuery(api.vehicles.get, { id: vehicleId });
  const fillUps = useQuery(api.gasData.listFillUps, { vehicleId });
  const maintenance = useQuery(api.gasData.listMaintenance, { vehicleId });
  const deleteFillUp = useMutation(api.gasData.deleteFillUp);
  const deleteMaintenance = useMutation(api.gasData.deleteMaintenance);
  const triggerSync = useAction(api.vehicles.triggerSync);

  const [fillUpDialog, setFillUpDialog] = useState<'add' | Id<'gasFillUps'> | null>(null);
  const [maintenanceDialog, setMaintenanceDialog] = useState<'add' | Id<'maintenanceRecords'> | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [odometerDialogOpen, setOdometerDialogOpen] = useState(false);
  const [depreciationDialogOpen, setDepreciationDialogOpen] = useState(false);

  const dateRange = getDateRange(timeRange);
  const dashboard = useQuery(api.dashboard.getVehicleDashboard, {
    vehicleId,
    from: dateRange?.from,
    to: dateRange?.to,
  });

  if (!vehicle || fillUps === undefined || maintenance === undefined) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  const fillUpEvents = fillUps.map((f) => ({
    id: f._id,
    date: f.date,
    cost: f.cost,
    label: `${f.volumeLitres.toFixed(1)}L`,
    odometer: f.odometer,
  }));

  const maintenanceEvents = maintenance.map((m) => ({
    id: m._id,
    date: m.date,
    cost: m.cost,
    label: m.description,
    odometer: m.odometer,
  }));

  const editingFillUp =
    fillUpDialog !== 'add' && fillUpDialog !== null ? fillUps.find((f) => f._id === fillUpDialog) : undefined;

  const editingMaintenance =
    maintenanceDialog !== 'add' && maintenanceDialog !== null
      ? maintenance.find((m) => m._id === maintenanceDialog)
      : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h1>
          <p className="text-sm text-muted-foreground capitalize">{vehicle.type}</p>
        </div>
        {vehicle.type === 'electric' && vehicle.vin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void triggerSync({ vehicleId }).catch((err: unknown) => {
                toast.error(err instanceof Error ? err.message : 'Sync failed');
              });
            }}
          >
            Sync EV Data
          </Button>
        )}
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          {vehicle.type === 'gas' && <TabsTrigger value="fillups">Fill-ups</TabsTrigger>}
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4 space-y-6">
          <div className="flex items-center justify-between">
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setOdometerDialogOpen(true)}>
                Add Odometer
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDepreciationDialogOpen(true)}>
                Add Valuation
              </Button>
            </div>
          </div>
          {dashboard === undefined ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <>
              <MetricsPanel
                kmDriven={dashboard.kmDriven}
                operatingCostTotal={dashboard.operatingCostTotal}
                operatingCostPerKm={dashboard.operatingCostPerKm}
                depreciationPerKm={dashboard.depreciation?.perKm ?? null}
                totalCostPerKm={dashboard.totalCostPerKm}
              />
              <CostChart data={dashboard.dailyCosts} />
              {dashboard.mostRecentEvent && (
                <div className="rounded-md border p-4 text-sm">
                  <p className="font-medium">Most recent event</p>
                  <p className="text-muted-foreground mt-1">
                    {format(dashboard.mostRecentEvent.date, 'PPP')} ·{' '}
                    {dashboard.mostRecentEvent.type === 'charge' ? 'Charging session' : 'Fill-up'} ·{' '}
                    {cad(dashboard.mostRecentEvent.cost)}
                    {dashboard.mostRecentEvent.odometer !== null && (
                      <> · {dashboard.mostRecentEvent.odometer.toLocaleString('en-CA')} km</>
                    )}
                  </p>
                </div>
              )}
            </>
          )}
          {/* Odometer dialog */}
          <Dialog open={odometerDialogOpen} onOpenChange={(open) => { if (!open) setOdometerDialogOpen(false); }}>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Odometer Reading</DialogTitle></DialogHeader>
              <OdometerEntry vehicleId={vehicleId} onSuccess={() => setOdometerDialogOpen(false)} />
            </DialogContent>
          </Dialog>
          {/* Depreciation dialog */}
          <Dialog open={depreciationDialogOpen} onOpenChange={(open) => { if (!open) setDepreciationDialogOpen(false); }}>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Market Valuation</DialogTitle></DialogHeader>
              <DepreciationEntry vehicleId={vehicleId} onSuccess={() => setDepreciationDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </TabsContent>

        {vehicle.type === 'gas' && (
          <TabsContent value="fillups" className="mt-4 space-y-4">
            <Button onClick={() => setFillUpDialog('add')}>Add Fill-up</Button>
            <CostEventList
              events={fillUpEvents}
              onEdit={(eventId) => setFillUpDialog(eventId as Id<'gasFillUps'>)}
              onDelete={(eventId) => {
                deleteFillUp({ id: eventId as Id<'gasFillUps'> }).catch((err: unknown) => {
                  toast.error(err instanceof Error ? err.message : 'Failed to delete');
                });
              }}
              emptyMessage="No fill-ups recorded yet."
            />
          </TabsContent>
        )}

        <TabsContent value="maintenance" className="mt-4 space-y-4">
          <Button onClick={() => setMaintenanceDialog('add')}>Add Maintenance</Button>
          <CostEventList
            events={maintenanceEvents}
            onEdit={(eventId) => setMaintenanceDialog(eventId as Id<'maintenanceRecords'>)}
            onDelete={(eventId) => {
              deleteMaintenance({ id: eventId as Id<'maintenanceRecords'> }).catch((err: unknown) => {
                toast.error(err instanceof Error ? err.message : 'Failed to delete');
              });
            }}
            emptyMessage="No maintenance records yet."
          />
        </TabsContent>
      </Tabs>

      {/* Fill-up add/edit dialog */}
      <Dialog open={fillUpDialog !== null} onOpenChange={(open) => { if (!open) setFillUpDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{fillUpDialog === 'add' ? 'Add Fill-up' : 'Edit Fill-up'}</DialogTitle>
          </DialogHeader>
          {fillUpDialog !== null && (
            <FillUpForm
              vehicleId={vehicleId}
              editId={fillUpDialog !== 'add' ? fillUpDialog : undefined}
              initialValues={
                editingFillUp
                  ? {
                      date: editingFillUp.date,
                      odometer: editingFillUp.odometer,
                      volumeLitres: editingFillUp.volumeLitres,
                      cost: editingFillUp.cost,
                    }
                  : undefined
              }
              onSuccess={() => setFillUpDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Maintenance add/edit dialog */}
      <Dialog
        open={maintenanceDialog !== null}
        onOpenChange={(open) => { if (!open) setMaintenanceDialog(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{maintenanceDialog === 'add' ? 'Add Maintenance' : 'Edit Maintenance'}</DialogTitle>
          </DialogHeader>
          {maintenanceDialog !== null && (
            <MaintenanceForm
              vehicleId={vehicleId}
              editId={maintenanceDialog !== 'add' ? maintenanceDialog : undefined}
              initialValues={
                editingMaintenance
                  ? {
                      date: editingMaintenance.date,
                      odometer: editingMaintenance.odometer,
                      description: editingMaintenance.description,
                      cost: editingMaintenance.cost,
                    }
                  : undefined
              }
              onSuccess={() => setMaintenanceDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
