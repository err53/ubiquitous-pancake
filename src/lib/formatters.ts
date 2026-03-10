export const cad = (amount: number) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);

export const km = (distance: number) =>
  `${distance.toLocaleString('en-CA')} km`;

export const cadPerKm = (value: number | null) =>
  value === null ? 'N/A' : `${cad(value)}/km`;
