/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';

const modules = import.meta.glob('./**/*.*s');

async function seedAllowlist(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert('allowlist', {
      email: 'test@example.com',
      isAdmin: false,
      addedAt: Date.now(),
    });
  });
  return t.withIdentity({ email: 'test@example.com' });
}

test('addFillUp inserts odometer reading', async () => {
  const t = convexTest(schema, modules);
  const authed = await seedAllowlist(t);
  const vehicleId = await authed.mutation(api.vehicles.register, {
    type: 'gas', make: 'Toyota', model: 'Corolla', year: 2020,
    purchasePrice: 25000, purchaseDate: Date.now(), initialOdometer: 1000,
  });
  await authed.mutation(api.gasData.addFillUp, {
    vehicleId, date: Date.now(), odometer: 1200, volumeLitres: 40, cost: 80,
  });
  const readings = await t.run(async (ctx) => {
    return ctx.db
      .query('odometerReadings')
      .filter((q) => q.eq(q.field('vehicleId'), vehicleId))
      .collect();
  });
  // Should have 2: initial from register + 1 from fill-up
  expect(readings).toHaveLength(2);
  const fillUpReading = readings.find((r) => r.source === 'fill_up');
  expect(fillUpReading?.odometer).toBe(1200);
});

test('addMaintenance does not insert odometer reading', async () => {
  const t = convexTest(schema, modules);
  const authed = await seedAllowlist(t);
  const vehicleId = await authed.mutation(api.vehicles.register, {
    type: 'gas', make: 'Toyota', model: 'Corolla', year: 2020,
    purchasePrice: 25000, purchaseDate: Date.now(), initialOdometer: 1000,
  });
  await authed.mutation(api.gasData.addMaintenance, {
    vehicleId, date: Date.now(), odometer: 1200, description: 'Oil change', cost: 50,
  });
  const readings = await t.run(async (ctx) => {
    return ctx.db
      .query('odometerReadings')
      .filter((q) => q.eq(q.field('vehicleId'), vehicleId))
      .collect();
  });
  // Only the initial odometer from register — maintenance does NOT add one
  expect(readings).toHaveLength(1);
});
