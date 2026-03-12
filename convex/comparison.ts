import { query, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';
import { requireAuth } from './lib/auth';
import { calcCostPerKm, calcDepreciation } from './lib/costCalc';

function sortOdometerReadings<T extends { date: number; _creationTime: number }>(readings: T[]) {
  return [...readings].sort((a, b) => a.date - b.date || a._creationTime - b._creationTime);
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

  const [chargingSessions, fillUps, maintenance] = await Promise.all([
    vehicle.type === 'electric'
      ? ctx.db.query('chargingSessions').withIndex('by_vehicle', (q) => q.eq('vehicleId', vid)).collect()
      : Promise.resolve([]),
    ctx.db.query('gasFillUps').withIndex('by_vehicle', (q) => q.eq('vehicleId', vid)).collect(),
    ctx.db.query('maintenanceRecords').withIndex('by_vehicle', (q) => q.eq('vehicleId', vid)).collect(),
  ]);

  const inRange = <T extends { date?: number; startedAt?: number }>(items: T[]) =>
    items.filter((i) => {
      const d = (i as { startedAt?: number }).startedAt ?? (i as { date?: number }).date ?? 0;
      return (from === undefined || d >= from) && (to === undefined || d <= to);
    });

  const filteredSessions = inRange(chargingSessions);
  const filteredFillUps = inRange(fillUps);
  const filteredMaintenance = inRange(maintenance);

  const operatingCostTotal =
    filteredSessions.reduce((s, c) => s + c.cost, 0) +
    filteredFillUps.reduce((s, f) => s + f.cost, 0) +
    filteredMaintenance.reduce((s, m) => s + m.cost, 0);

  let odometerReadings = await ctx.db
    .query('odometerReadings')
    .withIndex('by_vehicle_date', (q) => q.eq('vehicleId', vid))
    .order('asc')
    .collect();
  if (from !== undefined) odometerReadings = odometerReadings.filter((r) => r.date >= from);
  if (to !== undefined) odometerReadings = odometerReadings.filter((r) => r.date <= to);
  odometerReadings = sortOdometerReadings(odometerReadings);

  const kmDriven =
    odometerReadings.length >= 2
      ? odometerReadings[odometerReadings.length - 1].odometer - odometerReadings[0].odometer
      : null;

  const latestValuation = await ctx.db
    .query('marketValuations')
    .withIndex('by_vehicle', (q) => q.eq('vehicleId', vid))
    .collect()
    .then((vs) => (vs.length > 0 ? vs.sort((a, b) => b.date - a.date)[0] : null));

  const allOdometer = await ctx.db
    .query('odometerReadings')
    .withIndex('by_vehicle_date', (q) => q.eq('vehicleId', vid))
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

  // Build daily costs
  const map = new Map<string, number>();
  const addCost = (ts: number, cost: number) => {
    const day = new Date(ts).toISOString().slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + cost);
  };
  filteredSessions.forEach((s) => addCost(s.startedAt, s.cost));
  filteredFillUps.forEach((f) => addCost(f.date, f.cost));
  filteredMaintenance.forEach((m) => addCost(m.date, m.cost));
  const dailyCosts = [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cost]) => ({ date, cost }));

  return {
    vehicle,
    kmDriven,
    operatingCostTotal,
    operatingCostPerKm: kmDriven !== null ? calcCostPerKm(operatingCostTotal, kmDriven) : null,
    depreciationPerKm: depreciation?.perKm ?? null,
    totalCostPerKm:
      kmDriven !== null && depreciation !== null
        ? calcCostPerKm(operatingCostTotal + depreciation.totalCAD, kmDriven)
        : null,
    dailyCosts,
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
