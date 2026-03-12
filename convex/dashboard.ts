import { query } from './_generated/server';
import { v } from 'convex/values';
import { requireAuth } from './lib/auth';
import { calcCostPerKm, calcDepreciation } from './lib/costCalc';
import { buildHistoricalFuelEstimate, sortOdometerReadings, type OdometerPoint } from './lib/historicalFuel';

function getPriceLookup(rows: { month: string; priceCadPerLitre: number }[]) {
  const sorted = [...rows].sort((a, b) => a.month.localeCompare(b.month));
  return (month: string) => {
    let selected: number | undefined;
    for (const row of sorted) {
      if (row.month > month) break;
      selected = row.priceCadPerLitre;
    }
    return selected;
  };
}

function buildDailyCosts(
  sessions: { startedAt: number; cost: number }[],
  fuelEvents: { date: string; cost: number }[],
  fillUps: { date: number; cost: number }[],
  maintenance: { date: number; cost: number }[],
): { date: string; cost: number }[] {
  const map = new Map<string, number>();
  const add = (day: string, cost: number) => {
    map.set(day, (map.get(day) ?? 0) + cost);
  };

  sessions.forEach((session) => add(new Date(session.startedAt).toISOString().slice(0, 10), session.cost));
  fuelEvents.forEach((event) => add(event.date, event.cost));
  fillUps.forEach((fillUp) => add(new Date(fillUp.date).toISOString().slice(0, 10), fillUp.cost));
  maintenance.forEach((item) => add(new Date(item.date).toISOString().slice(0, 10), item.cost));

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cost]) => ({ date, cost }));
}

function getMostRecentEvent(
  sessions: { startedAt: number; cost: number; odometer?: number | null }[],
  fillUps: { date: number; cost: number; odometer: number }[],
) {
  const candidates = [
    ...sessions.map((s) => ({
      date: s.startedAt,
      cost: s.cost,
      odometer: s.odometer ?? null,
      type: 'charge' as const,
    })),
    ...fillUps.map((f) => ({
      date: f.date,
      cost: f.cost,
      odometer: f.odometer,
      type: 'fillup' as const,
    })),
  ];
  return candidates.sort((a, b) => b.date - a.date)[0] ?? null;
}

export const getVehicleDashboard = query({
  args: {
    vehicleId: v.id('vehicles'),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, { vehicleId, from, to }) => {
    await requireAuth(ctx);
    const vehicle = await ctx.db.get(vehicleId);
    if (!vehicle) throw new Error('Vehicle not found');

    const [chargingSessions, fillUps, maintenance, allOdometer] = await Promise.all([
      vehicle.type === 'electric'
        ? ctx.db
            .query('chargingSessions')
            .withIndex('by_vehicle', (q) => q.eq('vehicleId', vehicleId))
            .collect()
        : Promise.resolve([]),
      ctx.db
        .query('gasFillUps')
        .withIndex('by_vehicle', (q) => q.eq('vehicleId', vehicleId))
        .collect(),
      ctx.db
        .query('maintenanceRecords')
        .withIndex('by_vehicle', (q) => q.eq('vehicleId', vehicleId))
        .collect(),
      ctx.db
        .query('odometerReadings')
        .withIndex('by_vehicle_date', (q) => q.eq('vehicleId', vehicleId))
        .order('asc')
        .collect(),
    ]);

    const inRange = <T extends { date?: number; startedAt?: number }>(items: T[]) =>
      items.filter((item) => {
        const date = (item as { startedAt?: number }).startedAt ?? (item as { date?: number }).date ?? 0;
        return (from === undefined || date >= from) && (to === undefined || date <= to);
      });

    const filteredSessions = inRange(chargingSessions);
    const filteredFillUps = inRange(fillUps);
    const filteredMaintenance = inRange(maintenance);
    const usesHistoricalEstimate =
      vehicle.type === 'gas' &&
      vehicle.fuelCostMode === 'estimated_historical' &&
      vehicle.fuelPriceOverrideMode === 'historical_market' &&
      vehicle.fuelEfficiencyLPer100Km !== undefined &&
      vehicle.fuelPriceMarket &&
      vehicle.fuelType;

    const usesManualEstimate =
      vehicle.type === 'gas' &&
      vehicle.fuelCostMode === 'estimated_historical' &&
      vehicle.fuelPriceOverrideMode === 'fixed_manual' &&
      vehicle.fuelEfficiencyLPer100Km !== undefined &&
      vehicle.fuelPriceManualOverrideCadPerLitre !== undefined;

    const cachedPrices =
      usesHistoricalEstimate
        ? await ctx.db
            .query('fuelPriceCache')
            .withIndex('by_market_fuel_type', (q) =>
              q.eq('market', vehicle.fuelPriceMarket!).eq('fuelType', vehicle.fuelType!),
            )
            .collect()
        : [];
    const getHistoricalPriceForMonth = getPriceLookup(cachedPrices);

    const estimatedFuel =
      usesHistoricalEstimate
        ? buildHistoricalFuelEstimate({
            readings: allOdometer as OdometerPoint[],
            from,
            to,
            fuelEfficiencyLPer100Km: vehicle.fuelEfficiencyLPer100Km!,
            getPriceForMonth: getHistoricalPriceForMonth,
          })
        : usesManualEstimate
          ? buildHistoricalFuelEstimate({
              readings: allOdometer as OdometerPoint[],
              from,
              to,
              fuelEfficiencyLPer100Km: vehicle.fuelEfficiencyLPer100Km!,
              getPriceForMonth: () => vehicle.fuelPriceManualOverrideCadPerLitre!,
            })
          : null;

    const historicalFuelStatus =
      estimatedFuel && estimatedFuel.missingMonths.length > 0 ? 'missing_prices' : 'ready';

    const rangeOdometerReadings = allOdometer.filter(
      (reading) => (from === undefined || reading.date >= from) && (to === undefined || reading.date <= to),
    );
    const odometerReadings = sortOdometerReadings(rangeOdometerReadings as OdometerPoint[]);
    const rawKmDriven =
      odometerReadings.length >= 2
        ? odometerReadings[odometerReadings.length - 1].odometer - odometerReadings[0].odometer
        : null;
    const kmDriven = estimatedFuel ? estimatedFuel.totalKm : rawKmDriven;

    const operatingCostTotal =
      historicalFuelStatus === 'missing_prices'
        ? null
        : filteredSessions.reduce((sum, session) => sum + session.cost, 0) +
          (estimatedFuel
            ? estimatedFuel.totalCost
            : filteredFillUps.reduce((sum, fillUp) => sum + fillUp.cost, 0)) +
          filteredMaintenance.reduce((sum, item) => sum + item.cost, 0);

    const latestValuation = await ctx.db
      .query('marketValuations')
      .withIndex('by_vehicle', (q) => q.eq('vehicleId', vehicleId))
      .collect()
      .then((valuations) => (valuations.length > 0 ? valuations.sort((a, b) => b.date - a.date)[0] : null));

    const sortedAllOdometer = sortOdometerReadings(allOdometer as OdometerPoint[]);
    const totalKm =
      sortedAllOdometer.length >= 2
        ? sortedAllOdometer[sortedAllOdometer.length - 1].odometer - sortedAllOdometer[0].odometer
        : 0;

    const depreciation = latestValuation
      ? calcDepreciation({
          purchasePrice: vehicle.purchasePrice,
          purchaseDate: vehicle.purchaseDate,
          latestValuation: latestValuation.valuationCAD,
          latestValuationDate: latestValuation.date,
          kmDrivenTotal: totalKm,
        })
      : null;

    const dailyCosts =
      historicalFuelStatus === 'missing_prices'
        ? []
        : buildDailyCosts(
            filteredSessions,
            estimatedFuel?.dailyCosts ?? [],
            estimatedFuel ? [] : filteredFillUps,
            filteredMaintenance,
          );
    const mostRecentEvent = getMostRecentEvent(chargingSessions, fillUps);

    const operatingCostPerKm =
      kmDriven !== null && operatingCostTotal !== null ? calcCostPerKm(operatingCostTotal, kmDriven) : null;
    const totalCostPerKm =
      kmDriven !== null && depreciation !== null && operatingCostTotal !== null
        ? calcCostPerKm(operatingCostTotal + depreciation.totalCAD, kmDriven)
        : null;

    const latestCachedFuelPrice =
      cachedPrices.length > 0 ? cachedPrices.sort((a, b) => b.month.localeCompare(a.month))[0] : null;

    return {
      vehicle,
      kmDriven,
      totalKm,
      operatingCostTotal,
      operatingCostPerKm,
      depreciation,
      latestValuation,
      estimatedFuelPriceMarket: vehicle.fuelPriceMarket ?? null,
      estimatedFuelPricingMethod:
        vehicle.fuelPriceOverrideMode === 'fixed_manual' ? 'fixed_manual' : 'historical_market',
      estimatedFuelManualOverrideCadPerLitre: vehicle.fuelPriceManualOverrideCadPerLitre ?? null,
      estimatedFuelLatestCachedPriceCadPerLitre: latestCachedFuelPrice?.priceCadPerLitre ?? null,
      estimatedFuelLatestCachedMonth: latestCachedFuelPrice?.month ?? null,
      missingFuelPriceMonths: estimatedFuel?.missingMonths ?? [],
      fuelCostMode: vehicle.fuelCostMode ?? 'manual_fillups',
      historicalFuelStatus,
      totalCostPerKm,
      dailyCosts,
      mostRecentEvent,
    };
  },
});
