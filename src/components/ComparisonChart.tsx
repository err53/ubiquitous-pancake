import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { cad } from '@/lib/formatters';

interface DailyCost {
  date: string;
  cost: number;
}

interface ComparisonChartProps {
  labelA: string;
  dataA: DailyCost[];
  labelB: string;
  dataB: DailyCost[];
}

function mergeByDate(dataA: DailyCost[], dataB: DailyCost[]): { date: string; a: number; b: number }[] {
  const dates = new Set([...dataA.map((d) => d.date), ...dataB.map((d) => d.date)]);
  const mapA = new Map(dataA.map((d) => [d.date, d.cost]));
  const mapB = new Map(dataB.map((d) => [d.date, d.cost]));
  return [...dates]
    .sort()
    .map((date) => ({ date, a: mapA.get(date) ?? 0, b: mapB.get(date) ?? 0 }));
}

export function ComparisonChart({ labelA, dataA, labelB, dataB }: ComparisonChartProps) {
  const merged = mergeByDate(dataA, dataB);
  if (merged.length === 0) {
    return <p className="text-muted-foreground text-sm py-4">No cost data to compare.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={merged} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
        <XAxis
          axisLine={{ stroke: 'var(--color-border)' }}
          dataKey="date"
          tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
          tickFormatter={(v: string) => v.slice(5)}
          tickLine={{ stroke: 'var(--color-border)' }}
        />
        <YAxis
          axisLine={{ stroke: 'var(--color-border)' }}
          tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
          tickFormatter={(v: number) => cad(v)}
          tickLine={{ stroke: 'var(--color-border)' }}
          width={56}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-popover)',
            border: '1px solid var(--color-border)',
            borderRadius: 'calc(var(--radius) * 0.8)',
            color: 'var(--color-popover-foreground)',
          }}
          cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }}
          formatter={(v) => [cad(Number(v)), '']}
          itemStyle={{ color: 'var(--color-popover-foreground)' }}
          labelFormatter={(l) => String(l)}
          labelStyle={{ color: 'var(--color-popover-foreground)', fontWeight: 600 }}
        />
        <Legend wrapperStyle={{ color: 'var(--color-foreground)', fontSize: '12px' }} />
        <Line dataKey="a" name={labelA} stroke="var(--color-chart-1)" dot={false} strokeWidth={2.5} type="monotone" />
        <Line dataKey="b" name={labelB} stroke="var(--color-chart-2)" dot={false} strokeWidth={2.5} type="monotone" />
      </LineChart>
    </ResponsiveContainer>
  );
}
