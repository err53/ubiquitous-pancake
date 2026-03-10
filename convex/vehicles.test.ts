import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';

const modules = import.meta.glob('./**/*.*s');

test('register vehicle inserts initial odometer reading', async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert('allowlist', {
      email: 'test@example.com',
      isAdmin: false,
      addedAt: Date.now(),
    });
  });
  const authed = t.withIdentity({ email: 'test@example.com' });
  const vehicleId = await authed.mutation(api.vehicles.register, {
    type: 'gas',
    make: 'Toyota',
    model: 'Corolla',
    year: 2020,
    purchasePrice: 25000,
    purchaseDate: Date.now(),
    initialOdometer: 1000,
  });
  const readings = await t.run(async (ctx) => {
    return ctx.db
      .query('odometerReadings')
      .filter((q) => q.eq(q.field('vehicleId'), vehicleId))
      .collect();
  });
  expect(readings).toHaveLength(1);
  expect(readings[0].odometer).toBe(1000);
  expect(readings[0].source).toBe('manual');
});

test('soft delete sets removedAt', async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert('allowlist', {
      email: 'test@example.com',
      isAdmin: false,
      addedAt: Date.now(),
    });
  });
  const authed = t.withIdentity({ email: 'test@example.com' });
  const vehicleId = await authed.mutation(api.vehicles.register, {
    type: 'gas',
    make: 'Toyota',
    model: 'Corolla',
    year: 2020,
    purchasePrice: 25000,
    purchaseDate: Date.now(),
    initialOdometer: 0,
  });
  await authed.mutation(api.vehicles.remove, { id: vehicleId });
  const vehicles = await authed.query(api.vehicles.list);
  expect(vehicles.find((v) => v._id === vehicleId)).toBeUndefined();
});
