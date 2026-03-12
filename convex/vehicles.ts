import { action, mutation, query, internalQuery } from './_generated/server';
import { v } from 'convex/values';
import { requireAuth } from './lib/auth';
import { api, internal } from './_generated/api';

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return ctx.db
      .query('vehicles')
      .filter((q) => q.eq(q.field('removedAt'), undefined))
      .collect();
  },
});

export const get = query({
  args: { id: v.id('vehicles') },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    return ctx.db.get(id);
  },
});

export const register = mutation({
  args: {
    type: v.union(v.literal('electric'), v.literal('gas')),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    purchasePrice: v.number(),
    purchaseDate: v.number(),
    initialOdometer: v.number(),
    vin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const vehicleId = await ctx.db.insert('vehicles', args);
    // Record initial odometer reading
    await ctx.db.insert('odometerReadings', {
      vehicleId,
      date: args.purchaseDate,
      odometer: args.initialOdometer,
      source: 'manual',
    });
    return vehicleId;
  },
});

export const remove = mutation({
  args: { id: v.id('vehicles') },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    await ctx.db.patch(id, { removedAt: Date.now() });
  },
});

// Internal query used by EV sync to list electric vehicles
export const listElectric = internalQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query('vehicles')
      .filter((q) =>
        q.and(
          q.eq(q.field('type'), 'electric'),
          q.eq(q.field('removedAt'), undefined),
        ),
      )
      .collect();
  },
});

export const triggerSync = action({
  args: { vehicleId: v.id('vehicles') },
  handler: async (ctx, { vehicleId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');
    const vehicle = await ctx.runQuery(api.vehicles.get, { id: vehicleId });
    if (!vehicle) throw new Error('Vehicle not found');
    if (!vehicle.vin) throw new Error('Vehicle has no VIN configured');
    await ctx.runAction(internal.ev.sync.syncVehicle, {
      vehicleId,
      vin: vehicle.vin,
    });
  },
});
