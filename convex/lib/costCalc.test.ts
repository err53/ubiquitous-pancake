import { expect, test } from 'vitest';
import { calcDepreciation, calcCostPerKm } from './costCalc';

test('calcDepreciation returns total, monthly, and perKm', () => {
  const result = calcDepreciation({
    purchasePrice: 50000,
    purchaseDate: new Date('2023-01-01').getTime(),
    latestValuation: 40000,
    latestValuationDate: new Date('2024-01-01').getTime(),
    kmDrivenTotal: 20000,
  });
  expect(result.totalCAD).toBe(10000);
  expect(result.monthlyCAD).toBeCloseTo(833.97, 0);
  expect(result.perKm).toBe(0.5);
});

test('calcDepreciation returns null perKm when kmDrivenTotal is 0', () => {
  const result = calcDepreciation({
    purchasePrice: 50000,
    purchaseDate: new Date('2023-01-01').getTime(),
    latestValuation: 40000,
    latestValuationDate: new Date('2024-01-01').getTime(),
    kmDrivenTotal: 0,
  });
  expect(result.perKm).toBeNull();
});

test('calcCostPerKm returns null when kmDriven is 0', () => {
  expect(calcCostPerKm(500, 0)).toBeNull();
});

test('calcCostPerKm returns null when kmDriven is negative', () => {
  expect(calcCostPerKm(500, -10)).toBeNull();
});

test('calcCostPerKm calculates correctly', () => {
  expect(calcCostPerKm(1000, 2000)).toBe(0.5);
});
