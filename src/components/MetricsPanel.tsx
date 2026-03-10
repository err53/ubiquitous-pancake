import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cadPerKm, cad, km } from '@/lib/formatters';

interface MetricsPanelProps {
  kmDriven: number | null;
  operatingCostTotal: number;
  operatingCostPerKm: number | null;
  depreciationPerKm: number | null;
  totalCostPerKm: number | null;
}

export function MetricsPanel({
  kmDriven,
  operatingCostTotal,
  operatingCostPerKm,
  depreciationPerKm,
  totalCostPerKm,
}: MetricsPanelProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">km driven</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{kmDriven !== null ? km(kmDriven) : 'N/A'}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Operating cost/km</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{cadPerKm(operatingCostPerKm)}</p>
          <p className="text-xs text-muted-foreground mt-1">{cad(operatingCostTotal)} total</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Depreciation/km</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{cadPerKm(depreciationPerKm)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total cost/km</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{cadPerKm(totalCostPerKm)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
