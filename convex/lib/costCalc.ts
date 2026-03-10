export interface DepreciationInput {
  purchasePrice: number;
  purchaseDate: number;
  latestValuation: number;
  latestValuationDate: number;
  kmDrivenTotal: number;
}

export interface DepreciationResult {
  totalCAD: number;
  monthlyCAD: number;
  perKm: number | null;
}

export function calcDepreciation(params: DepreciationInput): DepreciationResult {
  const { purchasePrice, purchaseDate, latestValuation, latestValuationDate, kmDrivenTotal } = params;
  const totalCAD = purchasePrice - latestValuation;
  const monthsSincePurchase =
    (latestValuationDate - purchaseDate) / (1000 * 60 * 60 * 24 * 30.44);
  const monthlyCAD = monthsSincePurchase > 0 ? totalCAD / monthsSincePurchase : 0;
  const perKm = kmDrivenTotal > 0 ? totalCAD / kmDrivenTotal : null;
  return { totalCAD, monthlyCAD, perKm };
}

export function calcCostPerKm(totalCost: number, kmDriven: number): number | null {
  if (kmDriven <= 0) return null;
  return totalCost / kmDriven;
}
