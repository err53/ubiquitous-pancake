export interface OdometerPoint {
  date: number;
  odometer: number;
  _creationTime: number;
}

export interface DailyFuelCost {
  date: string;
  cost: number;
}

export interface HistoricalFuelEstimate {
  dailyCosts: DailyFuelCost[];
  totalCost: number;
  totalKm: number;
  monthsNeeded: string[];
  missingMonths: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function sortOdometerReadings<T extends OdometerPoint>(readings: T[]) {
  return [...readings].sort((a, b) => a.date - b.date || a._creationTime - b._creationTime);
}

function getUtcDayStart(ts: number) {
  const date = new Date(ts);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function getNextUtcDayStart(ts: number) {
  return getUtcDayStart(ts) + DAY_MS;
}

export function getMonthKey(ts: number) {
  const date = new Date(ts);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function iterateIntervalSegments(
  intervalStart: number,
  intervalEnd: number,
  from: number | undefined,
  to: number | undefined,
  callback: (segmentStart: number, segmentEnd: number, weight: number) => void,
) {
  const effectiveStart = Math.max(intervalStart, from ?? intervalStart);
  const effectiveEnd = Math.min(intervalEnd, to ?? intervalEnd);

  if (intervalEnd <= intervalStart) {
    if (intervalEnd >= (from ?? Number.MIN_SAFE_INTEGER) && intervalEnd <= (to ?? Number.MAX_SAFE_INTEGER)) {
      callback(intervalEnd, intervalEnd, 1);
    }
    return;
  }

  if (effectiveEnd <= effectiveStart) {
    return;
  }

  let cursor = effectiveStart;
  const duration = intervalEnd - intervalStart;

  while (cursor < effectiveEnd) {
    const nextBoundary = Math.min(getNextUtcDayStart(cursor), effectiveEnd);
    callback(cursor, nextBoundary, (nextBoundary - cursor) / duration);
    cursor = nextBoundary;
  }
}

export function collectHistoricalFuelMonths(
  readings: OdometerPoint[],
  from: number | undefined,
  to: number | undefined,
) {
  const months = new Set<string>();
  const sorted = sortOdometerReadings(readings);

  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    if (current.odometer - previous.odometer <= 0) continue;

    iterateIntervalSegments(previous.date, current.date, from, to, (segmentStart) => {
      months.add(getMonthKey(segmentStart));
    });
  }

  return [...months].sort();
}

export function buildHistoricalFuelEstimate(args: {
  readings: OdometerPoint[];
  from: number | undefined;
  to: number | undefined;
  fuelEfficiencyLPer100Km: number;
  getPriceForMonth: (month: string) => number | undefined;
}) : HistoricalFuelEstimate {
  const monthsNeeded = new Set<string>();
  const missingMonths = new Set<string>();
  const dailyCosts = new Map<string, number>();
  let totalKm = 0;
  const sorted = sortOdometerReadings(args.readings);

  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    const deltaKm = current.odometer - previous.odometer;
    if (deltaKm <= 0) continue;

    iterateIntervalSegments(previous.date, current.date, args.from, args.to, (segmentStart, _segmentEnd, weight) => {
      const month = getMonthKey(segmentStart);
      monthsNeeded.add(month);
      const price = args.getPriceForMonth(month);
      if (price === undefined) {
        missingMonths.add(month);
        return;
      }

      const segmentKm = deltaKm * weight;
      totalKm += segmentKm;
      const cost = ((segmentKm * args.fuelEfficiencyLPer100Km) / 100) * price;
      const day = new Date(getUtcDayStart(segmentStart)).toISOString().slice(0, 10);
      dailyCosts.set(day, (dailyCosts.get(day) ?? 0) + cost);
    });
  }

  const daily = [...dailyCosts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cost]) => ({ date, cost }));

  return {
    dailyCosts: daily,
    totalCost: daily.reduce((sum, entry) => sum + entry.cost, 0),
    totalKm,
    monthsNeeded: [...monthsNeeded].sort(),
    missingMonths: [...missingMonths].sort(),
  };
}
