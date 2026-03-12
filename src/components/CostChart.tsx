import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { cad } from '@/lib/formatters';

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
        <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          axisLine={{ stroke: 'var(--color-border)' }}
          tickLine={{ stroke: 'var(--color-border)' }}
          tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
          tickFormatter={(v: string) => v.slice(5)} // Show MM-DD only
        />
        <YAxis
          axisLine={{ stroke: 'var(--color-border)' }}
          tickLine={{ stroke: 'var(--color-border)' }}
          tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
          tickFormatter={(v: number) => cad(v)}
          width={56}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-popover)',
            border: '1px solid var(--color-border)',
            borderRadius: 'calc(var(--radius) * 0.8)',
            color: 'var(--color-popover-foreground)',
          }}
          cursor={{ fill: 'var(--color-muted)', opacity: 0.35 }}
          formatter={(v) => [cad(Number(v)), 'Cost']}
          itemStyle={{ color: 'var(--color-popover-foreground)' }}
          labelFormatter={(l) => String(l)}
          labelStyle={{ color: 'var(--color-popover-foreground)', fontWeight: 600 }}
        />
        <Bar dataKey="cost" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
