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

export const updateValuation = mutation({
  args: { id: v.id('marketValuations'), date: v.number(), valuationCAD: v.number() },
  handler: async (ctx, { id, ...fields }) => {
    await requireAuth(ctx);
    await ctx.db.patch(id, fields);
  },
});

export const deleteValuation = mutation({
  args: { id: v.id('marketValuations') },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    await ctx.db.delete(id);
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
