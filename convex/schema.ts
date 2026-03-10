import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // Auth
  allowlist: defineTable({
    email: v.string(),
    isAdmin: v.boolean(),
    addedAt: v.number(), // Unix ms
  }).index('by_email', ['email']),

  // Vehicles
  vehicles: defineTable({
    type: v.union(v.literal('electric'), v.literal('gas')),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    purchasePrice: v.number(), // CAD
    purchaseDate: v.number(), // Unix ms
    initialOdometer: v.number(), // km
    vin: v.optional(v.string()), // VIN for EV vehicles (Tessie)
    removedAt: v.optional(v.number()), // soft delete
  }),

  // EV charging sessions (fetched from Tessie)
  chargingSessions: defineTable({
    vehicleId: v.id('vehicles'),
    externalId: v.string(), // Tessie charge id (for deduplication)
    startedAt: v.number(), // Unix ms
    endedAt: v.number(), // Unix ms
    energyAdded: v.number(), // kWh
    cost: v.number(), // CAD
    odometer: v.optional(v.number()), // km — may be null if not returned
    location: v.optional(v.string()),
  })
    .index('by_vehicle', ['vehicleId'])
    .index('by_external_id', ['externalId']),

  // Gas fill-ups
  gasFillUps: defineTable({
    vehicleId: v.id('vehicles'),
    date: v.number(), // Unix ms
    odometer: v.number(), // km
    volumeLitres: v.number(),
    cost: v.number(), // CAD
  }).index('by_vehicle', ['vehicleId']),

  // Maintenance records
  maintenanceRecords: defineTable({
    vehicleId: v.id('vehicles'),
    date: v.number(), // Unix ms
    odometer: v.number(), // km
    description: v.string(),
    cost: v.number(), // CAD
  }).index('by_vehicle', ['vehicleId']),

  // Odometer readings (time series — any vehicle type)
  odometerReadings: defineTable({
    vehicleId: v.id('vehicles'),
    date: v.number(), // Unix ms
    odometer: v.number(), // km
    source: v.union(v.literal('manual'), v.literal('charging_session'), v.literal('fill_up')),
  })
    .index('by_vehicle', ['vehicleId'])
    .index('by_vehicle_date', ['vehicleId', 'date']),

  // Market valuations (depreciation input)
  marketValuations: defineTable({
    vehicleId: v.id('vehicles'),
    date: v.number(), // Unix ms
    valuationCAD: v.number(),
  }).index('by_vehicle', ['vehicleId']),

  // EV sync logs
  syncLogs: defineTable({
    vehicleId: v.optional(v.id('vehicles')), // null = global sync
    startedAt: v.number(),
    outcome: v.union(v.literal('success'), v.literal('partial'), v.literal('failure')),
    message: v.optional(v.string()),
    sessionsAdded: v.optional(v.number()),
  })
    .index('by_vehicle', ['vehicleId'])
    .index('by_started_at', ['startedAt']),

  // EV provider credentials (single row — shared across all users)
  evCredentials: defineTable({
    provider: v.string(), // 'tessie'
    encryptedToken: v.string(), // AES-256-GCM encrypted
    iv: v.string(), // base64 IV
    authTag: v.string(), // base64 auth tag (for GCM)
    lastUpdatedAt: v.number(),
  }),
});
