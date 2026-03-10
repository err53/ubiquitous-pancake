import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAuth } from './lib/auth';

export const listReadings = query({
  args: { vehicleId: v.id('vehicles') },
  handler: async (ctx, { vehicleId }) => {
    await requireAuth(ctx);
    return ctx.db
      .query('odometerReadings')
      .withIndex('by_vehicle_date', (q) => q.eq('vehicleId', vehicleId))
      .order('asc')
      .collect();
  },
});

export const addManualReading = mutation({
  args: { vehicleId: v.id('vehicles'), date: v.number(), odometer: v.number() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return ctx.db.insert('odometerReadings', { ...args, source: 'manual' });
  },
});

// Returns earliest and latest odometer in a date range
export const getRange = query({
  args: {
    vehicleId: v.id('vehicles'),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, { vehicleId, from, to }) => {
    await requireAuth(ctx);
    let readings = await ctx.db
      .query('odometerReadings')
      .withIndex('by_vehicle_date', (q) => q.eq('vehicleId', vehicleId))
      .order('asc')
      .collect();
    if (from !== undefined) readings = readings.filter((r) => r.date >= from);
    if (to !== undefined) readings = readings.filter((r) => r.date <= to);
    if (readings.length < 2) return null;
    return {
      earliest: readings[0].odometer,
      latest: readings[readings.length - 1].odometer,
      kmDriven: readings[readings.length - 1].odometer - readings[0].odometer,
    };
  },
});
