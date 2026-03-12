import { mutation, query, type MutationCtx } from './_generated/server';
import { v } from 'convex/values';
import { requireAuth } from './lib/auth';
import type { Id } from './_generated/dataModel';

async function deleteMatchingOdometerReading(
  ctx: MutationCtx,
  args: { vehicleId: Id<'vehicles'>; date: number; odometer: number; source: 'fill_up' | 'maintenance' },
) {
  const readings = await ctx.db
    .query('odometerReadings')
    .withIndex('by_vehicle_date', (q) => q.eq('vehicleId', args.vehicleId).eq('date', args.date))
    .collect();

  const match = readings.find((reading) => reading.source === args.source && reading.odometer === args.odometer);
  if (match) {
    await ctx.db.delete(match._id);
  }
}

export const listFillUps = query({
  args: {
    vehicleId: v.id('vehicles'),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, { vehicleId, from, to }) => {
    await requireAuth(ctx);
    const results = await ctx.db
      .query('gasFillUps')
      .withIndex('by_vehicle', (q) => q.eq('vehicleId', vehicleId))
      .collect();
    return results.filter(
      (r) => (from === undefined || r.date >= from) && (to === undefined || r.date <= to),
    );
  },
});

export const addFillUp = mutation({
  args: {
    vehicleId: v.id('vehicles'),
    date: v.number(),
    odometer: v.number(),
    volumeLitres: v.number(),
    cost: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle) throw new Error('Vehicle not found');
    if (vehicle.type !== 'gas') throw new Error('Fill-ups are only supported for gas vehicles');
    if ((vehicle.fuelCostMode ?? 'manual_fillups') === 'estimated_historical') {
      throw new Error('Manual fill-ups are disabled for this vehicle');
    }
    const id = await ctx.db.insert('gasFillUps', args);
    await ctx.db.insert('odometerReadings', {
      vehicleId: args.vehicleId,
      date: args.date,
      odometer: args.odometer,
      source: 'fill_up',
    });
    return id;
  },
});

export const updateFillUp = mutation({
  args: {
    id: v.id('gasFillUps'),
    date: v.number(),
    odometer: v.number(),
    volumeLitres: v.number(),
    cost: v.number(),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAuth(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error('Fill-up not found');
    const vehicle = await ctx.db.get(existing.vehicleId);
    if (!vehicle) throw new Error('Vehicle not found');
    if ((vehicle.fuelCostMode ?? 'manual_fillups') === 'estimated_historical') {
      throw new Error('Manual fill-ups are disabled for this vehicle');
    }
    await deleteMatchingOdometerReading(ctx, {
      vehicleId: existing.vehicleId,
      date: existing.date,
      odometer: existing.odometer,
      source: 'fill_up',
    });
    await ctx.db.patch(id, fields);
    await ctx.db.insert('odometerReadings', {
      vehicleId: existing.vehicleId,
      date: fields.date,
      odometer: fields.odometer,
      source: 'fill_up',
    });
  },
});

export const deleteFillUp = mutation({
  args: { id: v.id('gasFillUps') },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error('Fill-up not found');
    await deleteMatchingOdometerReading(ctx, {
      vehicleId: existing.vehicleId,
      date: existing.date,
      odometer: existing.odometer,
      source: 'fill_up',
    });
    await ctx.db.delete(id);
  },
});

export const listMaintenance = query({
  args: {
    vehicleId: v.id('vehicles'),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, { vehicleId, from, to }) => {
    await requireAuth(ctx);
    const results = await ctx.db
      .query('maintenanceRecords')
      .withIndex('by_vehicle', (q) => q.eq('vehicleId', vehicleId))
      .collect();
    return results.filter(
      (r) => (from === undefined || r.date >= from) && (to === undefined || r.date <= to),
    );
  },
});

export const addMaintenance = mutation({
  args: {
    vehicleId: v.id('vehicles'),
    date: v.number(),
    odometer: v.number(),
    description: v.string(),
    cost: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const id = await ctx.db.insert('maintenanceRecords', args);
    await ctx.db.insert('odometerReadings', {
      vehicleId: args.vehicleId,
      date: args.date,
      odometer: args.odometer,
      source: 'maintenance',
    });
    return id;
  },
});

export const updateMaintenance = mutation({
  args: {
    id: v.id('maintenanceRecords'),
    date: v.number(),
    odometer: v.number(),
    description: v.string(),
    cost: v.number(),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAuth(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error('Maintenance record not found');
    await deleteMatchingOdometerReading(ctx, {
      vehicleId: existing.vehicleId,
      date: existing.date,
      odometer: existing.odometer,
      source: 'maintenance',
    });
    await ctx.db.patch(id, fields);
    await ctx.db.insert('odometerReadings', {
      vehicleId: existing.vehicleId,
      date: fields.date,
      odometer: fields.odometer,
      source: 'maintenance',
    });
  },
});

export const deleteMaintenance = mutation({
  args: { id: v.id('maintenanceRecords') },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error('Maintenance record not found');
    await deleteMatchingOdometerReading(ctx, {
      vehicleId: existing.vehicleId,
      date: existing.date,
      odometer: existing.odometer,
      source: 'maintenance',
    });
    await ctx.db.delete(id);
  },
});
