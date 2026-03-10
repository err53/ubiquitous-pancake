import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAuth } from './lib/auth';

export const addValuation = mutation({
  args: { vehicleId: v.id('vehicles'), date: v.number(), valuationCAD: v.number() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return ctx.db.insert('marketValuations', args);
  },
});

export const listValuations = query({
  args: { vehicleId: v.id('vehicles') },
  handler: async (ctx, { vehicleId }) => {
    await requireAuth(ctx);
    const valuations = await ctx.db
      .query('marketValuations')
      .withIndex('by_vehicle', (q) => q.eq('vehicleId', vehicleId))
      .collect();
    return valuations.sort((a, b) => b.date - a.date);
  },
});

export const getLatestValuation = query({
  args: { vehicleId: v.id('vehicles') },
  handler: async (ctx, { vehicleId }) => {
    await requireAuth(ctx);
    const valuations = await ctx.db
      .query('marketValuations')
      .withIndex('by_vehicle', (q) => q.eq('vehicleId', vehicleId))
      .collect();
    if (!valuations.length) return null;
    return valuations.sort((a, b) => b.date - a.date)[0];
  },
});
