import { useEffect, useState } from 'react';
import { useAction, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cad } from '@/lib/formatters';
import { gasMarkets } from '@/lib/gasMarkets';
import { format } from 'date-fns';
import { toast } from 'sonner';

type GasVehicle = Doc<'vehicles'>;

export function GasCostPreferences({ vehicle }: { vehicle: GasVehicle }) {
  const updateFuelPreferences = useMutation(api.vehicles.updateFuelPreferences);
  const fetchCanadianAverage = useAction(api.gasPrices.fetchCanadianAverage);
  const [mode, setMode] = useState<'manual_fillups' | 'estimated'>(vehicle.fuelCostMode ?? 'manual_fillups');
  const [fuelType, setFuelType] = useState<'regular' | 'premium' | 'diesel'>(vehicle.fuelType ?? 'regular');
  const [fuelEfficiency, setFuelEfficiency] = useState(vehicle.fuelEfficiencyLPer100Km ?? 0);
  const [fuelPrice, setFuelPrice] = useState(vehicle.fuelPriceCadPerLitre ?? 0);
  const [fuelPriceSource, setFuelPriceSource] = useState<'manual' | 'statcan' | undefined>(vehicle.fuelPriceSource);
  const [fuelPriceUpdatedAt, setFuelPriceUpdatedAt] = useState<number | undefined>(vehicle.fuelPriceUpdatedAt);
  const [fuelPriceMarket, setFuelPriceMarket] = useState(vehicle.fuelPriceMarket ?? 'canada');
  const [saving, setSaving] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);

  useEffect(() => {
    setMode(vehicle.fuelCostMode ?? 'manual_fillups');
    setFuelType(vehicle.fuelType ?? 'regular');
    setFuelEfficiency(vehicle.fuelEfficiencyLPer100Km ?? 0);
    setFuelPrice(vehicle.fuelPriceCadPerLitre ?? 0);
    setFuelPriceSource(vehicle.fuelPriceSource);
    setFuelPriceUpdatedAt(vehicle.fuelPriceUpdatedAt);
    setFuelPriceMarket(vehicle.fuelPriceMarket ?? 'canada');
  }, [vehicle]);

  const handleSave = async () => {
    if (mode === 'estimated') {
      if (fuelEfficiency <= 0) {
        toast.error('Fuel efficiency must be greater than 0');
        return;
      }
      if (fuelPrice <= 0) {
        toast.error('Fuel price must be greater than 0');
        return;
      }
    }

    setSaving(true);
    try {
      await updateFuelPreferences({
        id: vehicle._id as Id<'vehicles'>,
        fuelCostMode: mode,
        fuelEfficiencyLPer100Km: mode === 'estimated' ? fuelEfficiency : vehicle.fuelEfficiencyLPer100Km,
        fuelPriceCadPerLitre: mode === 'estimated' ? fuelPrice : vehicle.fuelPriceCadPerLitre,
        fuelPriceSource,
        fuelPriceUpdatedAt,
        fuelPriceMarket,
        fuelType,
      });
      toast.success('Fuel preferences updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save fuel preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleFetchCanadianAverage = async () => {
    setFetchingPrice(true);
    try {
      const result = await fetchCanadianAverage({
        market: fuelPriceMarket,
        fuelType,
      });

      setFuelPrice(result.priceCadPerLitre);
      setFuelPriceSource(result.source);
      setFuelPriceUpdatedAt(result.updatedAt);
      toast.success(`Loaded ${result.marketLabel} average for ${result.effectiveMonth.slice(0, 7)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch Canadian average');
    } finally {
      setFetchingPrice(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fuel Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Fuel Cost Mode</Label>
          <Select value={mode} onValueChange={(value) => setMode(value as 'manual_fillups' | 'estimated')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual_fillups">Manual fill-ups</SelectItem>
              <SelectItem value="estimated">Estimated from efficiency and gas price</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Estimated mode disables manual fuel logging and uses odometer distance instead of fill-up costs.
          </p>
        </div>

        {mode === 'estimated' && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Fuel Efficiency (L/100 km)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={fuelEfficiency}
                  onChange={(e) => setFuelEfficiency(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fuel Type</Label>
                <Select value={fuelType} onValueChange={(value) => setFuelType(value as 'regular' | 'premium' | 'diesel')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Canadian Fuel Market</Label>
                <Select value={fuelPriceMarket} onValueChange={(value) => setFuelPriceMarket(value ?? 'canada')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {gasMarkets.map((market) => (
                      <SelectItem key={market.key} value={market.key}>
                        {market.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label>Fuel Price (CAD/L)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.001"
                  value={fuelPrice}
                  onChange={(e) => {
                    setFuelPrice(Number(e.target.value));
                    setFuelPriceSource('manual');
                    setFuelPriceUpdatedAt(Date.now());
                  }}
                />
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={() => void handleFetchCanadianAverage()} disabled={fetchingPrice}>
                  {fetchingPrice ? 'Fetching…' : 'Fetch Canadian Average'}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              The fetched price is a monthly Statistics Canada average for the selected market, not a live station quote.
            </p>

            {(fuelPriceSource || fuelPriceUpdatedAt) && (
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                <p>Current estimate: {cad(fuelPrice)} / L</p>
                <p>Market: {gasMarkets.find((market) => market.key === fuelPriceMarket)?.label ?? 'Unknown'}</p>
                {fuelPriceSource && <p>Source: {fuelPriceSource === 'statcan' ? 'Statistics Canada monthly average' : 'Manual entry'}</p>}
                {fuelPriceUpdatedAt && <p>Updated: {format(fuelPriceUpdatedAt, 'PPP p')}</p>}
              </div>
            )}
          </>
        )}

        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? 'Saving…' : 'Save Fuel Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
}
