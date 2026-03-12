import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cadPerKm, cad, km } from '@/lib/formatters';

interface MetricsPanelProps {
  kmDriven: number | null;
  operatingCostTotal: number | null;
  operatingCostPerKm: number | null;
  depreciationPerKm: number | null;
  totalCostPerKm: number | null;
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function MetricsPanel({
  kmDriven,
  operatingCostTotal,
  operatingCostPerKm,
  depreciationPerKm,
  totalCostPerKm,
}: MetricsPanelProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <MetricCard label="km driven" value={kmDriven !== null ? km(kmDriven) : 'N/A'} />
      <MetricCard
        label="Operating cost/km"
        value={cadPerKm(operatingCostPerKm)}
        sub={operatingCostTotal !== null ? `${cad(operatingCostTotal)} total` : undefined}
      />
      <MetricCard label="Lifetime depreciation/km" value={cadPerKm(depreciationPerKm)} />
      <MetricCard label="Blended total cost/km" value={cadPerKm(totalCostPerKm)} />
    </div>
  );
}
