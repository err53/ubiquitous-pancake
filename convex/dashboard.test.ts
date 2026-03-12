/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';

const modules = import.meta.glob('./**/*.*s');

test('dashboard depreciation uses same-day odometer readings deterministically', async () => {
  const t = convexTest(schema, modules);
  const authed = t.withIdentity({ subject: 'user_test' });
  const sameDay = new Date('2025-03-12').getTime();

  const vehicleId = await authed.mutation(api.vehicles.register, {
    type: 'gas',
    make: 'Toyota',
    model: 'Corolla',
    year: 2020,
    purchasePrice: 25000,
    purchaseDate: sameDay,
    initialOdometer: 1000,
  });

  await authed.mutation(api.odometer.addManualReading, {
    vehicleId,
    date: sameDay,
    odometer: 1500,
  });

  await authed.mutation(api.depreciation.addValuation, {
    vehicleId,
    date: sameDay,
    valuationCAD: 20000,
  });

  const dashboard = await authed.query(api.dashboard.getVehicleDashboard, { vehicleId });
  expect(dashboard.totalKm).toBe(500);
  expect(dashboard.depreciation?.perKm).toBe(10);
});
