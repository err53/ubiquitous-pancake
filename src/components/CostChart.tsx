import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface CostChartProps {
  data: { date: string; cost: number }[];
}

export function CostChart({ data }: CostChartProps) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-sm py-4">No cost data for this period.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => v.slice(5)} // Show MM-DD only
        />
        <YAxis tickFormatter={(v: number) => `$${v}`} width={50} tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Cost']}
          labelFormatter={(l) => String(l)}
        />
        <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
