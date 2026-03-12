import { expect, test } from 'vitest';
import { buildHistoricalFuelEstimate } from './historicalFuel';

test('buildHistoricalFuelEstimate splits interval cost across months', () => {
  const estimate = buildHistoricalFuelEstimate({
    readings: [
      {
        date: new Date('2025-01-31T00:00:00Z').getTime(),
        odometer: 1000,
        _creationTime: 1,
      },
      {
        date: new Date('2025-02-02T00:00:00Z').getTime(),
        odometer: 1300,
        _creationTime: 2,
      },
    ],
    from: undefined,
    to: undefined,
    fuelEfficiencyLPer100Km: 10,
    getPriceForMonth: (month) => {
      if (month === '2025-01-01') return 1;
      if (month === '2025-02-01') return 2;
      return undefined;
    },
  });

  expect(estimate.missingMonths).toEqual([]);
  expect(estimate.monthsNeeded).toEqual(['2025-01-01', '2025-02-01']);
  expect(estimate.totalCost).toBeCloseTo(45, 5);
  expect(estimate.dailyCosts).toHaveLength(2);
});

test('buildHistoricalFuelEstimate reports missing months', () => {
  const estimate = buildHistoricalFuelEstimate({
    readings: [
      {
        date: new Date('2025-01-01T00:00:00Z').getTime(),
        odometer: 1000,
        _creationTime: 1,
      },
      {
        date: new Date('2025-02-01T00:00:00Z').getTime(),
        odometer: 1100,
        _creationTime: 2,
      },
    ],
    from: undefined,
    to: undefined,
    fuelEfficiencyLPer100Km: 8,
    getPriceForMonth: () => undefined,
  });

  expect(estimate.totalCost).toBe(0);
  expect(estimate.missingMonths).toEqual(['2025-01-01']);
});
