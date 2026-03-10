import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
        <YAxis tickFormatter={(v: number) => `$${v}`} width={50} tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(v) => [`$${Number(v).toFixed(2)}`, '']}
          labelFormatter={(l) => String(l)}
        />
        <Legend />
        <Line dataKey="a" name={labelA} stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
        <Line dataKey="b" name={labelB} stroke="hsl(var(--destructive))" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
