import { action } from './_generated/server';
import { v } from 'convex/values';

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

type StatCanSeriesResponse = Array<{
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

    const coordinate = buildCoordinate(selectedMarket.geographyMember, FUEL_MEMBER_BY_TYPE[fuelType]);
    const response = await fetch('https://www150.statcan.gc.ca/t1/wds/rest/getDataFromCubePidCoordAndLatestNPeriods', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        {
          productId: 18100001,
          coordinate,
          latestN: 1,
        },
      ]),
    });

    if (!response.ok) {
      throw new Error(`Statistics Canada lookup failed (${response.status})`);
    }

    const payload = (await response.json()) as StatCanSeriesResponse;
    const series = payload[0];
    if (series?.status !== 'SUCCESS' || !series.object?.vectorDataPoint?.length) {
      throw new Error('No Canadian fuel price average was available for that market');
    }

    const latestPoint = series.object.vectorDataPoint[series.object.vectorDataPoint.length - 1];
    if (latestPoint.value === undefined) {
      throw new Error('Canadian fuel price average was missing a value');
    }

    return {
      priceCadPerLitre: latestPoint.value / 100,
      updatedAt: latestPoint.releaseTime ? new Date(latestPoint.releaseTime).getTime() : Date.now(),
      effectiveMonth: latestPoint.refPerRaw ?? '',
      market,
      marketLabel: selectedMarket.label,
      source: 'statcan' as const,
    };
  },
});
