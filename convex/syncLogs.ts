import { internalMutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAuth } from './lib/auth';

export const insert = internalMutation({
  args: {
    vehicleId: v.optional(v.id('vehicles')),
    startedAt: v.number(),
    outcome: v.union(v.literal('success'), v.literal('partial'), v.literal('failure')),
    message: v.optional(v.string()),
    sessionsAdded: v.optional(v.number()),
  },
  handler: async (ctx, args) => ctx.db.insert('syncLogs', args),
});

export const getLatest = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return ctx.db.query('syncLogs').withIndex('by_started_at').order('desc').first();
  },
});

export const listForVehicle = query({
  args: { vehicleId: v.id('vehicles') },
  handler: async (ctx, { vehicleId }) => {
    await requireAuth(ctx);
    return ctx.db
      .query('syncLogs')
      .withIndex('by_vehicle', (q) => q.eq('vehicleId', vehicleId))
      .order('desc')
      .take(10);
  },
});
