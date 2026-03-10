export interface ChargeSession {
  externalId: string; // Provider's unique ID for deduplication
  startedAt: number; // Unix ms
  endedAt: number;
  energyAdded: number; // kWh
  cost: number; // CAD
  odometer: number | null; // km, may be null
  location: string | null;
}

export interface EVProvider {
  getChargingSessions(params: {
    vin: string;
    from?: number;
    to?: number;
  }): Promise<ChargeSession[]>;
}
