import { internalAction, internalMutation, internalQuery } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { TessieProvider } from './tessie';

export const sessionExists = internalQuery({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) => {
    const existing = await ctx.db
      .query('chargingSessions')
      .withIndex('by_external_id', (q) => q.eq('externalId', externalId))
      .unique();
    return existing !== null;
  },
});

export const insertSession = internalMutation({
  args: {
    vehicleId: v.id('vehicles'),
    externalId: v.string(),
    startedAt: v.number(),
    endedAt: v.number(),
    energyAdded: v.number(),
    cost: v.number(),
    odometer: v.optional(v.number()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('chargingSessions', args);
    if (args.odometer !== undefined) {
      await ctx.db.insert('odometerReadings', {
        vehicleId: args.vehicleId,
        date: args.startedAt,
        odometer: args.odometer,
        source: 'charging_session',
      });
    }
  },
});

export const syncVehicle = internalAction({
  args: { vehicleId: v.id('vehicles'), vin: v.string() },
  handler: async (ctx, { vehicleId, vin }) => {
    const startedAt = Date.now();
    try {
      const token = await ctx.runAction(internal.settingsActions.getDecryptedToken);
      const provider = new TessieProvider(token);
      const sessions = await provider.getChargingSessions({ vin });

      let added = 0;
      for (const session of sessions) {
        const exists = await ctx.runQuery(internal.ev.sync.sessionExists, {
          externalId: session.externalId,
        });
        if (!exists) {
          await ctx.runMutation(internal.ev.sync.insertSession, {
            vehicleId,
            externalId: session.externalId,
            startedAt: session.startedAt,
            endedAt: session.endedAt,
            energyAdded: session.energyAdded,
            cost: session.cost,
            odometer: session.odometer ?? undefined,
            location: session.location ?? undefined,
          });
          added++;
        }
      }

      await ctx.runMutation(internal.syncLogs.insert, {
        vehicleId,
        startedAt,
        outcome: 'success',
        sessionsAdded: added,
      });
    } catch (err) {
      await ctx.runMutation(internal.syncLogs.insert, {
        vehicleId,
        startedAt,
        outcome: 'failure',
        message: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },
});
