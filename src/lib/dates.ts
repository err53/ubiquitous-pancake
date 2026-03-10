import { subDays, subMonths, subYears, startOfDay, endOfDay } from 'date-fns';

export type TimeRange = '7d' | '30d' | '90d' | '6mo' | '1yr' | 'all';

export function getDateRange(range: TimeRange): { from: number; to: number } | null {
  const now = new Date();
  const to = endOfDay(now).getTime();
  switch (range) {
    case '7d': return { from: startOfDay(subDays(now, 7)).getTime(), to };
    case '30d': return { from: startOfDay(subDays(now, 30)).getTime(), to };
    case '90d': return { from: startOfDay(subDays(now, 90)).getTime(), to };
    case '6mo': return { from: startOfDay(subMonths(now, 6)).getTime(), to };
    case '1yr': return { from: startOfDay(subYears(now, 1)).getTime(), to };
    case 'all': return null;
  }
}
