/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';

const modules = import.meta.glob('./**/*.*s');

async function seedAllowlist(t: ReturnType<typeof convexTest>) {
  return t.withIdentity({ subject: 'user_test' });
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

test('addMaintenance inserts odometer reading', async () => {
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
  expect(readings).toHaveLength(2);
  const maintenanceReading = readings.find((r) => r.source === 'maintenance');
  expect(maintenanceReading?.odometer).toBe(1200);
});

test('updating a fill-up updates its odometer reading', async () => {
  const t = convexTest(schema, modules);
  const authed = await seedAllowlist(t);
  const vehicleId = await authed.mutation(api.vehicles.register, {
    type: 'gas', make: 'Toyota', model: 'Corolla', year: 2020,
    purchasePrice: 25000, purchaseDate: Date.now(), initialOdometer: 1000,
  });
  const fillUpId = await authed.mutation(api.gasData.addFillUp, {
    vehicleId, date: Date.now(), odometer: 1200, volumeLitres: 40, cost: 80,
  });

  await authed.mutation(api.gasData.updateFillUp, {
    id: fillUpId,
    date: Date.now() + 1000,
    odometer: 1300,
    volumeLitres: 42,
    cost: 84,
  });

  const readings = await t.run(async (ctx) => {
    return ctx.db
      .query('odometerReadings')
      .filter((q) => q.eq(q.field('vehicleId'), vehicleId))
      .collect();
  });
  const fillUpReadings = readings.filter((r) => r.source === 'fill_up');
  expect(fillUpReadings).toHaveLength(1);
  expect(fillUpReadings[0].odometer).toBe(1300);
});

test('deleting maintenance removes its odometer reading', async () => {
  const t = convexTest(schema, modules);
  const authed = await seedAllowlist(t);
  const vehicleId = await authed.mutation(api.vehicles.register, {
    type: 'gas', make: 'Toyota', model: 'Corolla', year: 2020,
    purchasePrice: 25000, purchaseDate: Date.now(), initialOdometer: 1000,
  });
  const maintenanceId = await authed.mutation(api.gasData.addMaintenance, {
    vehicleId, date: Date.now(), odometer: 1200, description: 'Oil change', cost: 50,
  });

  await authed.mutation(api.gasData.deleteMaintenance, { id: maintenanceId });

  const readings = await t.run(async (ctx) => {
    return ctx.db
      .query('odometerReadings')
      .filter((q) => q.eq(q.field('vehicleId'), vehicleId))
      .collect();
  });
  expect(readings).toHaveLength(1);
  expect(readings.every((r) => r.source !== 'maintenance')).toBe(true);
});

test('addFillUp rejects vehicles in estimated fuel mode', async () => {
  const t = convexTest(schema, modules);
  const authed = await seedAllowlist(t);
  const vehicleId = await authed.mutation(api.vehicles.register, {
    type: 'gas', make: 'Toyota', model: 'Corolla', year: 2020,
    purchasePrice: 25000, purchaseDate: Date.now(), initialOdometer: 1000,
  });

  await authed.mutation(api.vehicles.updateFuelPreferences, {
    id: vehicleId,
    fuelCostMode: 'estimated',
    fuelEfficiencyLPer100Km: 7.5,
    fuelPriceCadPerLitre: 1.6,
    fuelPriceSource: 'manual',
    fuelPriceUpdatedAt: Date.now(),
    fuelPriceMarket: 'canada',
    fuelType: 'regular',
  });

  await expect(
    authed.mutation(api.gasData.addFillUp, {
      vehicleId, date: Date.now(), odometer: 1200, volumeLitres: 40, cost: 80,
    }),
  ).rejects.toThrow('Manual fill-ups are disabled for this vehicle');
});
