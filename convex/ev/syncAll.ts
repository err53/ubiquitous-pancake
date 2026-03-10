import { internalAction } from '../_generated/server';
import { internal } from '../_generated/api';

export const run = internalAction({
  args: {},
  handler: async (ctx) => {
    const vehicles = await ctx.runQuery(internal.vehicles.listElectric);
    for (const vehicle of vehicles) {
      if (vehicle.vin) {
        await ctx.runAction(internal.ev.sync.syncVehicle, {
          vehicleId: vehicle._id,
          vin: vehicle.vin,
        });
      }
    }
  },
});
