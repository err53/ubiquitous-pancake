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

test('dashboard estimates gas operating cost from efficiency and fuel price', async () => {
  const t = convexTest(schema, modules);
  const authed = t.withIdentity({ subject: 'user_test' });
  const purchaseDate = new Date('2025-01-01').getTime();
  const secondReadingDate = new Date('2025-01-10').getTime();

  const vehicleId = await authed.mutation(api.vehicles.register, {
    type: 'gas',
    make: 'Honda',
    model: 'Civic',
    year: 2022,
    purchasePrice: 30000,
    purchaseDate,
    initialOdometer: 1000,
  });

  await authed.mutation(api.vehicles.updateFuelPreferences, {
    id: vehicleId,
    fuelCostMode: 'estimated',
    fuelEfficiencyLPer100Km: 8,
    fuelPriceCadPerLitre: 1.5,
    fuelPriceSource: 'manual',
    fuelPriceUpdatedAt: purchaseDate,
    fuelPriceMarket: 'canada',
    fuelType: 'regular',
  });

  await authed.mutation(api.odometer.addManualReading, {
    vehicleId,
    date: secondReadingDate,
    odometer: 1200,
  });

  const dashboard = await authed.query(api.dashboard.getVehicleDashboard, { vehicleId });
  expect(dashboard.operatingCostTotal).toBeCloseTo(24, 5);
  expect(dashboard.operatingCostPerKm).toBeCloseTo(0.12, 5);
  expect(dashboard.fuelCostMode).toBe('estimated');
});
