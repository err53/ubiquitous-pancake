import { query, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';
import { requireAuth } from './lib/auth';
import { calcCostPerKm, calcDepreciation } from './lib/costCalc';
import { buildHistoricalFuelEstimate, sortOdometerReadings, type OdometerPoint } from './lib/historicalFuel';

function buildDailyCosts(
  sessions: { startedAt: number; cost: number }[],
  fuelEvents: { date: string; cost: number }[],
  fillUps: { date: number; cost: number }[],
  maintenance: { date: number; cost: number }[],
) {
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

async function getVehicleMetrics(
  ctx: QueryCtx,
  vehicleId: string,
  from: number | undefined,
  to: number | undefined,
) {
  const vid = vehicleId as Id<'vehicles'>;
  const vehicle = await ctx.db.get(vid);
  if (!vehicle) return null;

  const [chargingSessions, fillUps, maintenance, allOdometerReadings] = await Promise.all([
    vehicle.type === 'electric'
      ? ctx.db.query('chargingSessions').withIndex('by_vehicle', (q) => q.eq('vehicleId', vid)).collect()
      : Promise.resolve([]),
    ctx.db.query('gasFillUps').withIndex('by_vehicle', (q) => q.eq('vehicleId', vid)).collect(),
    ctx.db.query('maintenanceRecords').withIndex('by_vehicle', (q) => q.eq('vehicleId', vid)).collect(),
    ctx.db
      .query('odometerReadings')
      .withIndex('by_vehicle_date', (q) => q.eq('vehicleId', vid))
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
  const rangeOdometerReadings = allOdometerReadings.filter(
    (reading) => (from === undefined || reading.date >= from) && (to === undefined || reading.date <= to),
  );
  const odometerReadings = sortOdometerReadings(rangeOdometerReadings as OdometerPoint[]);

  const kmDriven =
    odometerReadings.length >= 2
      ? odometerReadings[odometerReadings.length - 1].odometer - odometerReadings[0].odometer
      : null;

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
  const priceByMonth = new Map(cachedPrices.map((row) => [row.month, row.priceCadPerLitre]));

  const estimatedFuel =
    usesHistoricalEstimate
      ? buildHistoricalFuelEstimate({
          readings: allOdometerReadings as OdometerPoint[],
          from,
          to,
          fuelEfficiencyLPer100Km: vehicle.fuelEfficiencyLPer100Km!,
          getPriceForMonth: (month) => priceByMonth.get(month),
        })
      : usesManualEstimate
        ? buildHistoricalFuelEstimate({
            readings: allOdometerReadings as OdometerPoint[],
            from,
            to,
            fuelEfficiencyLPer100Km: vehicle.fuelEfficiencyLPer100Km!,
            getPriceForMonth: () => vehicle.fuelPriceManualOverrideCadPerLitre!,
          })
        : null;

  const historicalFuelStatus =
    estimatedFuel && estimatedFuel.missingMonths.length > 0 ? 'missing_prices' : 'ready';

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
    .withIndex('by_vehicle', (q) => q.eq('vehicleId', vid))
    .collect()
    .then((valuations) => (valuations.length > 0 ? valuations.sort((a, b) => b.date - a.date)[0] : null));

  const sortedAllOdometer = sortOdometerReadings(allOdometerReadings as OdometerPoint[]);
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

  return {
    vehicle,
    kmDriven,
    operatingCostTotal,
    operatingCostPerKm:
      kmDriven !== null && operatingCostTotal !== null ? calcCostPerKm(operatingCostTotal, kmDriven) : null,
    depreciationPerKm: depreciation?.perKm ?? null,
    totalCostPerKm:
      kmDriven !== null && depreciation !== null && operatingCostTotal !== null
        ? calcCostPerKm(operatingCostTotal + depreciation.totalCAD, kmDriven)
        : null,
    dailyCosts:
      historicalFuelStatus === 'missing_prices'
        ? []
        : buildDailyCosts(
            filteredSessions,
            estimatedFuel?.dailyCosts ?? [],
            estimatedFuel ? [] : filteredFillUps,
            filteredMaintenance,
          ),
    historicalFuelStatus,
    missingFuelPriceMonths: estimatedFuel?.missingMonths ?? [],
  };
}

export const compare = query({
  args: {
    vehicleIdA: v.id('vehicles'),
    vehicleIdB: v.id('vehicles'),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, { vehicleIdA, vehicleIdB, from, to }) => {
    await requireAuth(ctx);
    const [vehicleA, vehicleB] = await Promise.all([
      getVehicleMetrics(ctx, vehicleIdA, from, to),
      getVehicleMetrics(ctx, vehicleIdB, from, to),
    ]);
    return { vehicleA, vehicleB };
  },
});
