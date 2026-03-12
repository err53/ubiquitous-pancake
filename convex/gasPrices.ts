import { action, internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { collectHistoricalFuelMonths, type OdometerPoint } from './lib/historicalFuel';

const GAS_MARKETS = {
  canada: { label: 'Canada average', geographyMember: '20' },
  st_johns: { label: "St. John's, NL", geographyMember: '2' },
  pei: { label: 'Charlottetown and Summerside, PE', geographyMember: '3' },
  halifax: { label: 'Halifax, NS', geographyMember: '4' },
  saint_john: { label: 'Saint John, NB', geographyMember: '5' },
  quebec_city: { label: 'Quebec City, QC', geographyMember: '6' },
  montreal: { label: 'Montreal, QC', geographyMember: '7' },
  ottawa_gatineau: { label: 'Ottawa-Gatineau', geographyMember: '8' },
  toronto: { label: 'Toronto, ON', geographyMember: '9' },
  thunder_bay: { label: 'Thunder Bay, ON', geographyMember: '10' },
  winnipeg: { label: 'Winnipeg, MB', geographyMember: '11' },
  regina: { label: 'Regina, SK', geographyMember: '12' },
  saskatoon: { label: 'Saskatoon, SK', geographyMember: '13' },
  edmonton: { label: 'Edmonton, AB', geographyMember: '14' },
  calgary: { label: 'Calgary, AB', geographyMember: '15' },
  vancouver: { label: 'Vancouver, BC', geographyMember: '16' },
  victoria: { label: 'Victoria, BC', geographyMember: '17' },
  whitehorse: { label: 'Whitehorse, YT', geographyMember: '18' },
  yellowknife: { label: 'Yellowknife, NT', geographyMember: '19' },
} as const;

type GasMarketKey = keyof typeof GAS_MARKETS;
type FuelType = 'regular' | 'premium' | 'diesel';

const FUEL_MEMBER_BY_TYPE: Record<FuelType, string> = {
  regular: '2',
  premium: '4',
  diesel: '6',
};

type StatCanSeriesInfoResponse = Array<{
  status?: 'SUCCESS' | 'FAIL';
  object?: {
    vectorId?: number;
  };
}>;

type StatCanCoordinateLatestResponse = Array<{
  status?: 'SUCCESS' | 'FAIL';
  object?: {
    vectorDataPoint?: Array<{
      refPerRaw?: string;
      value?: number;
      releaseTime?: string;
    }>;
  };
}>;

type StatCanVectorRangeResponse = Array<{
  status?: 'SUCCESS' | 'FAIL';
  object?: {
    vectorDataPoint?: Array<{
      refPerRaw?: string;
      value?: number;
      releaseTime?: string;
    }>;
  };
}>;

function buildCoordinate(geographyMember: string, fuelMember: string) {
  return `${geographyMember}.${fuelMember}.0.0.0.0.0.0.0.0`;
}

function getSortedMonthRange(months: string[]) {
  return [...months].sort((a, b) => a.localeCompare(b));
}

async function getVectorId(market: string, fuelType: FuelType) {
  const selectedMarket = GAS_MARKETS[market as GasMarketKey];
  if (!selectedMarket) {
    throw new Error('Unsupported fuel market');
  }

  const seriesInfoResponse = await fetch('https://www150.statcan.gc.ca/t1/wds/rest/getSeriesInfoFromCubePidCoord', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([
      {
        productId: 18100001,
        coordinate: buildCoordinate(selectedMarket.geographyMember, FUEL_MEMBER_BY_TYPE[fuelType]),
      },
    ]),
  });

  if (!seriesInfoResponse.ok) {
    throw new Error(`Statistics Canada series lookup failed (${seriesInfoResponse.status})`);
  }

  const payload = (await seriesInfoResponse.json()) as StatCanSeriesInfoResponse;
  const vectorId = payload[0]?.object?.vectorId;
  if (!vectorId) {
    throw new Error('Statistics Canada series lookup did not return a vector');
  }

  return { vectorId, marketLabel: selectedMarket.label };
}

async function fetchHistoricalRange(market: string, fuelType: FuelType, months: string[]) {
  const requestedMonths = getSortedMonthRange(months);
  if (requestedMonths.length === 0) return [];

  const { vectorId } = await getVectorId(market, fuelType);
  const firstMonth = requestedMonths[0];
  const lastMonth = requestedMonths[requestedMonths.length - 1];
  const url =
    `https://www150.statcan.gc.ca/t1/wds/rest/getDataFromVectorByReferencePeriodRange` +
    `?vectorIds=%22${vectorId}%22&startRefPeriod=${firstMonth}&endReferencePeriod=${lastMonth}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Statistics Canada historical lookup failed (${response.status})`);
  }

  const payload = (await response.json()) as StatCanVectorRangeResponse;
  const points = payload[0]?.object?.vectorDataPoint ?? [];
  const requestedMonthSet = new Set(requestedMonths);
  const rows = points
    .filter((point) => point.refPerRaw && requestedMonthSet.has(point.refPerRaw) && point.value !== undefined)
    .map((point) => ({
      market,
      fuelType,
      month: point.refPerRaw as string,
      priceCadPerLitre: (point.value as number) / 100,
      publishedAt: point.releaseTime ? new Date(point.releaseTime).getTime() : Date.now(),
      fetchedAt: Date.now(),
      source: 'statcan' as const,
    }));

  const foundMonths = new Set(rows.map((row) => row.month));
  const missingMonths = requestedMonths.filter((month) => !foundMonths.has(month));
  if (missingMonths.length > 0) {
    throw new Error(`Statistics Canada did not return monthly prices for: ${missingMonths.join(', ')}`);
  }

  return rows;
}

export const getHydrationInputs = internalQuery({
  args: {
    vehicleIds: v.array(v.id('vehicles')),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, { vehicleIds, from, to }) => {
    const results: Array<{
      vehicleId: string;
      market: string;
      fuelType: FuelType;
      months: string[];
    }> = [];

    for (const vehicleId of vehicleIds) {
      const vehicle = await ctx.db.get(vehicleId);
      if (
        !vehicle ||
        vehicle.type !== 'gas' ||
        vehicle.fuelCostMode !== 'estimated_historical' ||
        vehicle.fuelPriceOverrideMode !== 'historical_market' ||
        !vehicle.fuelPriceMarket ||
        !vehicle.fuelType
      ) {
        continue;
      }

      const readings = (await ctx.db
        .query('odometerReadings')
        .withIndex('by_vehicle_date', (q) => q.eq('vehicleId', vehicleId))
        .order('asc')
        .collect()) as OdometerPoint[];

      results.push({
        vehicleId,
        market: vehicle.fuelPriceMarket,
        fuelType: vehicle.fuelType,
        months: collectHistoricalFuelMonths(readings, from, to),
      });
    }

    return results;
  },
});

export const getCachedPrices = internalQuery({
  args: {
    market: v.string(),
    fuelType: v.union(v.literal('regular'), v.literal('premium'), v.literal('diesel')),
    months: v.array(v.string()),
  },
  handler: async (ctx, { market, fuelType, months }) => {
    const monthSet = new Set(months);
    const rows = await ctx.db
      .query('fuelPriceCache')
      .withIndex('by_market_fuel_type', (q) => q.eq('market', market).eq('fuelType', fuelType))
      .collect();

    return rows.filter((row) => monthSet.has(row.month));
  },
});

export const upsertCachedPrices = internalMutation({
  args: {
    rows: v.array(
      v.object({
        market: v.string(),
        fuelType: v.union(v.literal('regular'), v.literal('premium'), v.literal('diesel')),
        month: v.string(),
        priceCadPerLitre: v.number(),
        publishedAt: v.number(),
        fetchedAt: v.number(),
        source: v.literal('statcan'),
      }),
    ),
  },
  handler: async (ctx, { rows }) => {
    for (const row of rows) {
      const existing = await ctx.db
        .query('fuelPriceCache')
        .withIndex('by_lookup', (q) =>
          q.eq('market', row.market).eq('fuelType', row.fuelType).eq('month', row.month),
        )
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, row);
      } else {
        await ctx.db.insert('fuelPriceCache', row);
      }
    }
  },
});

export const ensureHistoricalPrices = action({
  args: {
    vehicleIds: v.array(v.id('vehicles')),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, { vehicleIds, from, to }) => {
    const hydrationInputs = await ctx.runQuery(internal.gasPrices.getHydrationInputs, {
      vehicleIds,
      from,
      to,
    });

    const bySeries = new Map<string, { market: string; fuelType: FuelType; months: Set<string> }>();
    for (const input of hydrationInputs) {
      const key = `${input.market}:${input.fuelType}`;
      const existing = bySeries.get(key) ?? {
        market: input.market,
        fuelType: input.fuelType,
        months: new Set<string>(),
      };
      input.months.forEach((month) => existing.months.add(month));
      bySeries.set(key, existing);
    }

    let hydratedMonths = 0;
    for (const series of bySeries.values()) {
      const months = [...series.months].sort();
      if (months.length === 0) continue;

      const cached = await ctx.runQuery(internal.gasPrices.getCachedPrices, {
        market: series.market,
        fuelType: series.fuelType,
        months,
      });
      const cachedMonths = new Set(cached.map((row) => row.month));
      const missingMonths = months.filter((month) => !cachedMonths.has(month));
      if (missingMonths.length === 0) continue;

      const rows = await fetchHistoricalRange(series.market, series.fuelType, missingMonths);
      hydratedMonths += rows.length;
      await ctx.runMutation(internal.gasPrices.upsertCachedPrices, { rows });
    }

    return { hydratedMonths };
  },
});

export const fetchCanadianAverage = action({
  args: {
    market: v.string(),
    fuelType: v.union(v.literal('regular'), v.literal('premium'), v.literal('diesel')),
  },
  handler: async (_ctx, { market, fuelType }) => {
    const selectedMarket = GAS_MARKETS[market as GasMarketKey];
    if (!selectedMarket) {
      throw new Error('Unsupported fuel market');
    }

    const response = await fetch('https://www150.statcan.gc.ca/t1/wds/rest/getDataFromCubePidCoordAndLatestNPeriods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        {
          productId: 18100001,
          coordinate: buildCoordinate(selectedMarket.geographyMember, FUEL_MEMBER_BY_TYPE[fuelType]),
          latestN: 1,
        },
      ]),
    });

    if (!response.ok) {
      throw new Error(`Statistics Canada lookup failed (${response.status})`);
    }

    const payload = (await response.json()) as StatCanCoordinateLatestResponse;
    const latestPoint = payload[0]?.object?.vectorDataPoint?.[0];
    if (!latestPoint?.refPerRaw || latestPoint.value === undefined) {
      throw new Error('No Canadian fuel price average was available for that market');
    }

    return {
      priceCadPerLitre: latestPoint.value / 100,
      updatedAt: latestPoint.releaseTime ? new Date(latestPoint.releaseTime).getTime() : Date.now(),
      effectiveMonth: latestPoint.refPerRaw,
      market,
      marketLabel: selectedMarket.label,
      source: 'statcan' as const,
    };
  },
});
