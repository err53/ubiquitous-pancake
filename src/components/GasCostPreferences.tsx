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
  const [mode, setMode] = useState<'manual_fillups' | 'estimated_historical'>(vehicle.fuelCostMode ?? 'manual_fillups');
  const [fuelType, setFuelType] = useState<'regular' | 'premium' | 'diesel'>(vehicle.fuelType ?? 'regular');
  const [fuelEfficiency, setFuelEfficiency] = useState(vehicle.fuelEfficiencyLPer100Km ?? 0);
  const [fuelPriceMarket, setFuelPriceMarket] = useState(vehicle.fuelPriceMarket ?? 'canada');
  const [overrideMode, setOverrideMode] = useState<'historical_market' | 'fixed_manual'>(
    vehicle.fuelPriceOverrideMode ?? 'historical_market',
  );
  const [manualOverridePrice, setManualOverridePrice] = useState(vehicle.fuelPriceManualOverrideCadPerLitre ?? 0);
  const [previewPrice, setPreviewPrice] = useState<{ priceCadPerLitre: number; effectiveMonth: string; updatedAt: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetchingPreview, setFetchingPreview] = useState(false);

  useEffect(() => {
    setMode(vehicle.fuelCostMode ?? 'manual_fillups');
    setFuelType(vehicle.fuelType ?? 'regular');
    setFuelEfficiency(vehicle.fuelEfficiencyLPer100Km ?? 0);
    setFuelPriceMarket(vehicle.fuelPriceMarket ?? 'canada');
    setOverrideMode(vehicle.fuelPriceOverrideMode ?? 'historical_market');
    setManualOverridePrice(vehicle.fuelPriceManualOverrideCadPerLitre ?? 0);
  }, [vehicle]);

  const handleSave = async () => {
    if (mode === 'estimated_historical') {
      if (fuelEfficiency <= 0) {
        toast.error('Fuel efficiency must be greater than 0');
        return;
      }
      if (overrideMode === 'fixed_manual' && manualOverridePrice <= 0) {
        toast.error('Manual fuel price must be greater than 0');
        return;
      }
    }

    setSaving(true);
    try {
      await updateFuelPreferences({
        id: vehicle._id as Id<'vehicles'>,
        fuelCostMode: mode,
        fuelEfficiencyLPer100Km: mode === 'estimated_historical' ? fuelEfficiency : undefined,
        fuelPriceMarket,
        fuelPriceOverrideMode: overrideMode,
        fuelPriceManualOverrideCadPerLitre: mode === 'estimated_historical' && overrideMode === 'fixed_manual'
          ? manualOverridePrice
          : undefined,
        fuelType,
      });
      toast.success('Fuel preferences updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save fuel preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleFetchPreview = async () => {
    setFetchingPreview(true);
    try {
      const result = await fetchCanadianAverage({
        market: fuelPriceMarket,
        fuelType,
      });
      setPreviewPrice({
        priceCadPerLitre: result.priceCadPerLitre,
        effectiveMonth: result.effectiveMonth,
        updatedAt: result.updatedAt,
      });
      toast.success(`Loaded ${result.marketLabel} average for ${result.effectiveMonth.slice(0, 7)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch market preview');
    } finally {
      setFetchingPreview(false);
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
          <Select value={mode} onValueChange={(value) => setMode(value as 'manual_fillups' | 'estimated_historical')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual_fillups">Manual fill-ups</SelectItem>
              <SelectItem value="estimated_historical">Estimated from historical fuel prices</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Historical estimate mode disables manual fuel logging and derives costs from odometer distance.
          </p>
        </div>

        {mode === 'estimated_historical' && (
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

            <div className="space-y-2">
              <Label>Pricing Method</Label>
              <Select
                value={overrideMode}
                onValueChange={(value) => setOverrideMode(value as 'historical_market' | 'fixed_manual')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="historical_market">Historical market averages</SelectItem>
                  <SelectItem value="fixed_manual">Fixed manual price</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {overrideMode === 'fixed_manual' ? (
              <div className="space-y-2">
                <Label>Manual Fuel Price (CAD/L)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.001"
                  value={manualOverridePrice}
                  onChange={(e) => setManualOverridePrice(Number(e.target.value))}
                />
              </div>
            ) : (
              <>
                <div className="flex items-end gap-4">
                  <div className="flex-1 rounded-md border p-3 text-sm text-muted-foreground">
                    <p>Historical pricing source: Statistics Canada monthly averages</p>
                    <p>Coverage market: {gasMarkets.find((market) => market.key === fuelPriceMarket)?.label ?? 'Unknown'}</p>
                    {previewPrice && (
                      <>
                        <p>Latest available average: {cad(previewPrice.priceCadPerLitre)} / L</p>
                        <p>Reference month: {previewPrice.effectiveMonth.slice(0, 7)}</p>
                        <p>Published: {format(previewPrice.updatedAt, 'PPP p')}</p>
                      </>
                    )}
                  </div>
                  <Button variant="outline" onClick={() => void handleFetchPreview()} disabled={fetchingPreview}>
                    {fetchingPreview ? 'Fetching…' : 'Preview Latest Average'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Historical mode uses month-specific StatCan averages at read time. It does not use live station prices.
                </p>
              </>
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
