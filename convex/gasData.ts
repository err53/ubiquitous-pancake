import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAuth } from './lib/auth';

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
    await ctx.db.patch(id, fields);
  },
});

export const deleteFillUp = mutation({
  args: { id: v.id('gasFillUps') },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
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
    return ctx.db.insert('maintenanceRecords', args);
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
    await ctx.db.patch(id, fields);
  },
});

export const deleteMaintenance = mutation({
  args: { id: v.id('maintenanceRecords') },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    await ctx.db.delete(id);
  },
});
