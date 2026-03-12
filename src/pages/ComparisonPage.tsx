import { useAction, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MetricsPanel } from '@/components/MetricsPanel';
import { ComparisonChart } from '@/components/ComparisonChart';
import { TimeRangeSelector } from '@/components/TimeRangeSelector';
import { getDateRange, type TimeRange } from '@/lib/dates';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function ComparisonPage() {
  const vehicles = useQuery(api.vehicles.list);
  const ensureHistoricalPrices = useAction(api.gasPrices.ensureHistoricalPrices);
  const [vehicleIdA, setVehicleIdA] = useState<Id<'vehicles'> | null>(null);
  const [vehicleIdB, setVehicleIdB] = useState<Id<'vehicles'> | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const dateRange = getDateRange(timeRange);
  const comparison = useQuery(
    api.comparison.compare,
    vehicleIdA && vehicleIdB
      ? {
          vehicleIdA,
          vehicleIdB,
          from: dateRange?.from,
          to: dateRange?.to,
        }
      : 'skip',
  );

  useEffect(() => {
    if (!vehicles || !vehicleIdA || !vehicleIdB) return;

    const selectedVehicles = vehicles.filter((vehicle) => vehicle._id === vehicleIdA || vehicle._id === vehicleIdB);
    const needsHistoricalPrices = selectedVehicles.some(
      (vehicle) =>
        vehicle.type === 'gas' &&
        vehicle.fuelCostMode === 'estimated_historical' &&
        vehicle.fuelPriceOverrideMode === 'historical_market',
    );
    if (!needsHistoricalPrices) return;

    let cancelled = false;
    void ensureHistoricalPrices({
      vehicleIds: [vehicleIdA, vehicleIdB],
      from: dateRange?.from,
      to: dateRange?.to,
    })
      .catch((err: unknown) => {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Failed to load historical fuel prices');
        }
      })
      .finally(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [dateRange?.from, dateRange?.to, ensureHistoricalPrices, vehicleIdA, vehicleIdB, vehicles]);

  if (vehicles === undefined) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  const labelA =
    vehicleIdA && vehicles.find((v) => v._id === vehicleIdA)
      ? (() => {
          const v = vehicles.find((x) => x._id === vehicleIdA)!;
          return `${v.year} ${v.make} ${v.model}`;
        })()
      : 'Vehicle A';

  const labelB =
    vehicleIdB && vehicles.find((v) => v._id === vehicleIdB)
      ? (() => {
          const v = vehicles.find((x) => x._id === vehicleIdB)!;
          return `${v.year} ${v.make} ${v.model}`;
        })()
      : 'Vehicle B';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Compare Vehicles</h1>
      <div className="flex flex-wrap gap-4 items-center">
        <VehiclePicker
          label="Vehicle A"
          vehicles={vehicles}
          value={vehicleIdA}
          onChange={setVehicleIdA}
          exclude={vehicleIdB}
        />
        <VehiclePicker
          label="Vehicle B"
          vehicles={vehicles}
          value={vehicleIdB}
          onChange={setVehicleIdB}
          exclude={vehicleIdA}
        />
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      {!vehicleIdA || !vehicleIdB ? (
        <p className="text-muted-foreground">Select two vehicles to compare.</p>
      ) : comparison === undefined ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="space-y-8">
          {(comparison.vehicleA?.historicalFuelStatus === 'missing_prices' ||
            comparison.vehicleB?.historicalFuelStatus === 'missing_prices') && (
            <p className="text-sm text-muted-foreground">
              Loading historical fuel prices for the selected range...
            </p>
          )}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <h2 className="font-semibold">{labelA}</h2>
              {comparison.vehicleA ? (
                <MetricsPanel
                  kmDriven={comparison.vehicleA.kmDriven}
                  operatingCostTotal={comparison.vehicleA.operatingCostTotal}
                  operatingCostPerKm={comparison.vehicleA.operatingCostPerKm}
                  depreciationPerKm={comparison.vehicleA.depreciationPerKm}
                  totalCostPerKm={comparison.vehicleA.totalCostPerKm}
                />
              ) : (
                <p className="text-muted-foreground">Vehicle not found</p>
              )}
            </div>
            <div className="space-y-2">
              <h2 className="font-semibold">{labelB}</h2>
              {comparison.vehicleB ? (
                <MetricsPanel
                  kmDriven={comparison.vehicleB.kmDriven}
                  operatingCostTotal={comparison.vehicleB.operatingCostTotal}
                  operatingCostPerKm={comparison.vehicleB.operatingCostPerKm}
                  depreciationPerKm={comparison.vehicleB.depreciationPerKm}
                  totalCostPerKm={comparison.vehicleB.totalCostPerKm}
                />
              ) : (
                <p className="text-muted-foreground">Vehicle not found</p>
              )}
            </div>
          </div>
          <ComparisonChart
            labelA={labelA}
            dataA={comparison.vehicleA?.dailyCosts ?? []}
            labelB={labelB}
            dataB={comparison.vehicleB?.dailyCosts ?? []}
          />
        </div>
      )}
    </div>
  );
}

function VehiclePicker({
  label,
  vehicles,
  value,
  onChange,
  exclude,
}: {
  label: string;
  vehicles: Array<{ _id: Id<'vehicles'>; year: number; make: string; model: string }>;
  value: Id<'vehicles'> | null;
  onChange: (v: Id<'vehicles'>) => void;
  exclude: Id<'vehicles'> | null;
}) {
  const options = vehicles.filter((v) => v._id !== exclude);
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{label}</p>
      <Select value={value ?? ''} onValueChange={(v) => onChange(v as Id<'vehicles'>)}>
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Select vehicle" />
        </SelectTrigger>
        <SelectContent>
          {options.map((v) => (
            <SelectItem key={v._id} value={v._id}>
              {v.year} {v.make} {v.model}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
