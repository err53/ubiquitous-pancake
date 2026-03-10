import { EVProvider, ChargeSession } from './provider';

interface TessieCharge {
  id: number;
  started_at: number; // Unix seconds
  ended_at: number;
  energy_added: number;
  cost: number | null;
  odometer: number | null;
  location: string | null;
}

export class TessieProvider implements EVProvider {
  constructor(private readonly apiToken: string) {}

  async getChargingSessions({
    vin,
    from,
    to,
  }: {
    vin: string;
    from?: number;
    to?: number;
  }): Promise<ChargeSession[]> {
    const url = new URL(`https://api.tessie.com/${vin}/charges`);
    url.searchParams.set('distance_format', 'km');
    if (from !== undefined) url.searchParams.set('from', String(Math.floor(from / 1000)));
    if (to !== undefined) url.searchParams.set('to', String(Math.floor(to / 1000)));

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.apiToken}` },
    });
    if (!res.ok) {
      throw new Error(`Tessie API error: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { results: TessieCharge[] };

    return data.results.map((c) => ({
      externalId: String(c.id),
      startedAt: c.started_at * 1000,
      endedAt: c.ended_at * 1000,
      energyAdded: c.energy_added,
      cost: c.cost ?? 0,
      odometer: c.odometer ?? null,
      location: c.location ?? null,
    }));
  }
}
