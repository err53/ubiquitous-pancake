import { query } from './_generated/server';
import { v } from 'convex/values';
import { requireAuth } from './lib/auth';
import { calcCostPerKm, calcDepreciation } from './lib/costCalc';

function sortOdometerReadings<T extends { date: number; _creationTime: number }>(readings: T[]) {
  return [...readings].sort((a, b) => a.date - b.date || a._creationTime - b._creationTime);
}

function buildDailyCosts(
  sessions: { startedAt: number; cost: number }[],
  fillUps: { date: number; cost: number }[],
  maintenance: { date: number; cost: number }[],
): { date: string; cost: number }[] {
  const map = new Map<string, number>();
  const add = (ts: number, cost: number) => {
    const day = new Date(ts).toISOString().slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + cost);
  };
  sessions.forEach((s) => add(s.startedAt, s.cost));
  fillUps.forEach((f) => add(f.date, f.cost));
  maintenance.forEach((m) => add(m.date, m.cost));
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cost]) => ({ date, cost }));
}

function buildEstimatedFuelCosts(
  readings: { date: number; odometer: number; _creationTime: number }[],
  fuelEfficiencyLPer100Km: number,
  fuelPriceCadPerLitre: number,
  from: number | undefined,
  to: number | undefined,
) {
  const sorted = sortOdometerReadings(readings)
    .filter((reading) => to === undefined || reading.date <= to);
  const estimatedEvents: { date: number; cost: number }[] = [];

  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    if (from !== undefined && current.date < from) continue;
    const deltaKm = current.odometer - previous.odometer;
    if (deltaKm <= 0) continue;
    const litres = (deltaKm * fuelEfficiencyLPer100Km) / 100;
    estimatedEvents.push({
      date: current.date,
      cost: litres * fuelPriceCadPerLitre,
    });
  }

  return estimatedEvents;
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

    // Collect all cost events
    const [chargingSessions, fillUps, maintenance] = await Promise.all([
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
    ]);

    // Filter by date range
    const inRange = <T extends { date?: number; startedAt?: number }>(items: T[]) =>
      items.filter((i) => {
        const d = (i as { startedAt?: number }).startedAt ?? (i as { date?: number }).date ?? 0;
        return (from === undefined || d >= from) && (to === undefined || d <= to);
      });

    const filteredSessions = inRange(chargingSessions);
    const filteredFillUps = inRange(fillUps);
    const filteredMaintenance = inRange(maintenance);
    const estimatedFuelEvents =
      vehicle.type === 'gas' &&
      vehicle.fuelCostMode === 'estimated' &&
      vehicle.fuelEfficiencyLPer100Km !== undefined &&
      vehicle.fuelPriceCadPerLitre !== undefined
        ? buildEstimatedFuelCosts(
            await ctx.db
              .query('odometerReadings')
              .withIndex('by_vehicle_date', (q) => q.eq('vehicleId', vehicleId))
              .order('asc')
              .collect(),
            vehicle.fuelEfficiencyLPer100Km,
            vehicle.fuelPriceCadPerLitre,
            from,
            to,
          )
        : [];

    const operatingCostTotal =
      filteredSessions.reduce((s, c) => s + c.cost, 0) +
      (vehicle.type === 'gas' && vehicle.fuelCostMode === 'estimated'
        ? estimatedFuelEvents.reduce((sum, event) => sum + event.cost, 0)
        : filteredFillUps.reduce((s, f) => s + f.cost, 0)) +
      filteredMaintenance.reduce((s, m) => s + m.cost, 0);

    // Odometer range in the selected time window
    let odometerReadings = await ctx.db
      .query('odometerReadings')
      .withIndex('by_vehicle_date', (q) => q.eq('vehicleId', vehicleId))
      .order('asc')
      .collect();
    if (from !== undefined) odometerReadings = odometerReadings.filter((r) => r.date >= from);
    if (to !== undefined) odometerReadings = odometerReadings.filter((r) => r.date <= to);
    odometerReadings = sortOdometerReadings(odometerReadings);

    const kmDriven =
      odometerReadings.length >= 2
        ? odometerReadings[odometerReadings.length - 1].odometer - odometerReadings[0].odometer
        : null;

    // Depreciation uses all-time odometer (not range-limited)
    const latestValuation = await ctx.db
      .query('marketValuations')
      .withIndex('by_vehicle', (q) => q.eq('vehicleId', vehicleId))
      .collect()
      .then((vs) => (vs.length > 0 ? vs.sort((a, b) => b.date - a.date)[0] : null));

    const allOdometer = await ctx.db
      .query('odometerReadings')
      .withIndex('by_vehicle_date', (q) => q.eq('vehicleId', vehicleId))
      .order('asc')
      .collect();
    const sortedAllOdometer = sortOdometerReadings(allOdometer);
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

    const dailyCosts = buildDailyCosts(
      filteredSessions,
      vehicle.type === 'gas' && vehicle.fuelCostMode === 'estimated'
        ? estimatedFuelEvents.map((event) => ({ date: event.date, cost: event.cost }))
        : filteredFillUps,
      filteredMaintenance,
    );
    const mostRecentEvent = getMostRecentEvent(chargingSessions, fillUps);

    const operatingCostPerKm = kmDriven !== null ? calcCostPerKm(operatingCostTotal, kmDriven) : null;
    const totalCostPerKm =
      kmDriven !== null && depreciation !== null
        ? calcCostPerKm(operatingCostTotal + depreciation.totalCAD, kmDriven)
        : null;

    return {
      vehicle,
      kmDriven,
      totalKm,
      operatingCostTotal,
      operatingCostPerKm,
      depreciation,
      latestValuation,
      estimatedFuelPriceCadPerLitre: vehicle.fuelPriceCadPerLitre ?? null,
      estimatedFuelPriceUpdatedAt: vehicle.fuelPriceUpdatedAt ?? null,
      estimatedFuelPriceMarket: vehicle.fuelPriceMarket ?? null,
      fuelCostMode: vehicle.fuelCostMode ?? 'manual_fillups',
      totalCostPerKm,
      dailyCosts,
      mostRecentEvent,
    };
  },
});
