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

test('dashboard estimates gas operating cost from a fixed manual price override', async () => {
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
    fuelCostMode: 'estimated_historical',
    fuelEfficiencyLPer100Km: 8,
    fuelPriceMarket: 'canada',
    fuelPriceOverrideMode: 'fixed_manual',
    fuelPriceManualOverrideCadPerLitre: 1.5,
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
  expect(dashboard.fuelCostMode).toBe('estimated_historical');
});

test('dashboard uses cached monthly fuel prices in historical market mode', async () => {
  const t = convexTest(schema, modules);
  const authed = t.withIdentity({ subject: 'user_test' });
  const purchaseDate = new Date('2025-01-01T00:00:00Z').getTime();
  const secondReadingDate = new Date('2025-02-01T00:00:00Z').getTime();

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
    fuelCostMode: 'estimated_historical',
    fuelEfficiencyLPer100Km: 8,
    fuelPriceMarket: 'canada',
    fuelPriceOverrideMode: 'historical_market',
    fuelType: 'regular',
  });

  await authed.mutation(api.odometer.addManualReading, {
    vehicleId,
    date: secondReadingDate,
    odometer: 1200,
  });

  await t.run(async (ctx) => {
    await ctx.db.insert('fuelPriceCache', {
      market: 'canada',
      fuelType: 'regular',
      month: '2025-01-01',
      priceCadPerLitre: 1.5,
      publishedAt: purchaseDate,
      fetchedAt: purchaseDate,
      source: 'statcan',
    });
  });

  const dashboard = await authed.query(api.dashboard.getVehicleDashboard, { vehicleId });
  expect(dashboard.historicalFuelStatus).toBe('ready');
  expect(dashboard.operatingCostTotal).toBeCloseTo(24, 5);
  expect(dashboard.missingFuelPriceMonths).toHaveLength(0);
});
