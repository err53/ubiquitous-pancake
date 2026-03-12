/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';

const modules = import.meta.glob('./**/*.*s');

test('register vehicle inserts initial odometer reading', async () => {
  const t = convexTest(schema, modules);
  const authed = t.withIdentity({ subject: 'user_test' });
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
  const authed = t.withIdentity({ subject: 'user_test' });
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

test('triggerSync rejects unauthenticated users', async () => {
  const t = convexTest(schema, modules);
  const allowedUser = t.withIdentity({ subject: 'user_test' });
  const vehicleId = await allowedUser.mutation(api.vehicles.register, {
    type: 'electric',
    make: 'Tesla',
    model: 'Model 3',
    year: 2024,
    purchasePrice: 50000,
    purchaseDate: Date.now(),
    initialOdometer: 100,
    vin: '5YJ3E1EA0JF000001',
  });

  await expect(t.action(api.vehicles.triggerSync, { vehicleId })).rejects.toThrow('Unauthenticated');
});
