# Vehicle Operating Cost Tracker — Requirements

## Product Goal
A tool that tracks and compares the total cost of ownership of a user's vehicles,
with cost per kilometre as the primary metric. Designed for Canadian users tracking
a mix of electric and gas vehicles.

## Users
A small closed group of trusted users sharing a single pool of vehicle and cost data.
Access is controlled by admin-issued invitations through the auth provider.

---

## Functional Requirements

### Authentication & Access Control
- FR1: The app is accessible only to authenticated users; all pages redirect to a login screen if no valid session exists
- FR2: Login is via magic link — the user enters their email and receives a time-limited login link; no password is required
- FR3: Self-service signup is disabled; only users invited by an admin through the auth provider can create accounts
- FR4: Admins can create and revoke invitations for new users outside the app through the auth provider
- FR5: Sessions expire after 30 days of inactivity
- FR6: All vehicle, cost, and depreciation data is shared across all authenticated users — there is no per-user data isolation

### Vehicle Management
- FR7: The user can register one or more vehicles
- FR8: Each vehicle has a type: Electric or Gas
- FR9: At registration, the user provides: make, model, year, purchase price, purchase date, and current odometer reading (km)
- FR10: The user can view a list of registered vehicles
- FR11: The user can remove a vehicle from tracking

### Cost Data — Electric Vehicles
- FR12: The system fetches charging session data from an external EV data provider on a recurring schedule
- FR13: Each charging session record must capture: date, energy consumed (kWh), cost (CAD), and odometer reading if available from the provider
- FR14: If odometer data is not available from the provider, the user can manually enter an odometer reading at any time
- FR15: Fetched data is persisted locally so it remains available if the external provider is unreachable
- FR16: If a session has already been recorded, re-fetching it must not create a duplicate

### Cost Data — Gas Vehicles
- FR17: The user can manually log a fuel fill-up, capturing: date, odometer reading (km), volume (litres), and total cost (CAD)
- FR18: The user can manually log a maintenance expense, capturing: date, odometer reading (km), description, and cost (CAD)
- FR19: All manually entered records can be edited or deleted

### Depreciation
- FR20: The user can enter a current estimated market value (CAD) for any vehicle at any time
- FR21: The system calculates depreciation as the difference between purchase price and the most recently entered market value
- FR22: Depreciation is expressed as: total amount (CAD), monthly average since purchase, and cost per km since purchase

### Distance Tracking
- FR23: Total kilometres driven is derived from odometer readings — the difference between the earliest and most recent recorded values for a given time range
- FR24: The system tracks odometer readings as a time series so km driven can be calculated for any selected date range

### Per-Vehicle Dashboard
- FR25: The primary metric displayed for each vehicle is cost per km (CAD/km), calculated as total costs (operating + depreciation) divided by km driven over the selected time range
- FR26: The user can see a breakdown of cost/km by category: operating cost/km, depreciation cost/km, and combined total cost/km
- FR27: The user can view a chart of daily operating costs over the selected time range
- FR28: The user can see the most recent cost event (charge session or fill-up) with its date, cost, and odometer reading

### Comparison View
- FR29: The user can select any two registered vehicles to compare side by side
- FR30: The comparison view shows for each vehicle over the selected time range: operating cost/km, depreciation cost/km, total cost/km, total km driven, and total cost (CAD)
- FR31: The comparison view renders a combined chart overlaying both vehicles' daily cost/km
- FR32: The default time range for all views is the past 30 days; the user can adjust to 7 days, 90 days, 6 months, 1 year, or all time

### Sync & Settings
- FR33: The system automatically syncs EV data on a recurring schedule
- FR34: The user can manually trigger a data sync for electric vehicles at any time
- FR35: The UI indicates when EV data was last successfully synced
- FR36: If the external provider was unreachable during the last sync, the UI displays a stale data warning with the timestamp of the last successful sync
- FR37: The user can provide and update their API credentials for the EV data provider
- FR38: Credentials are stored securely and never exposed in the UI after entry

---

## Non-Functional Requirements

### Reliability
- NFR1: The system must not lose previously synced or manually entered data if the external provider becomes unavailable
- NFR2: Duplicate session records must never appear regardless of how many times a sync runs

### Performance
- NFR3: The dashboard and comparison view must load in under 2 seconds under normal conditions
- NFR4: EV data displayed to the user is always read from local storage, never live from the external provider at page load

### Correctness
- NFR5: Cost/km calculations must exclude periods where no odometer data exists, rather than silently producing misleading results
- NFR6: If km driven for a selected time range is zero or unknown, cost/km must be displayed as incalculable rather than zero or infinity

### Security
- NFR7: API credentials must be stored encrypted at rest, not in plaintext
- NFR8: The sync endpoint must be protected against unauthenticated external invocation regardless of the session auth mechanism
- NFR9: Magic links must be single-use and expire after 15 minutes
- NFR10: Invitation management must not be available to non-admin users
- NFR11: No information about whether an email is eligible for an invitation should be exposed to unauthenticated users

### Maintainability
- NFR12: The data model must support additional vehicle types beyond Electric and Gas without destructive migrations
- NFR13: The EV provider integration must be isolated behind an interface so it can be swapped without changes to the rest of the system
- NFR14: Cost event records must use a vehicle-type-agnostic schema where possible so that cost/km logic does not branch by vehicle type

### Observability
- NFR15: Each sync attempt must be logged with its outcome (success, partial, or failure) and a timestamp
- NFR16: Errors from the external provider must be recorded in enough detail to diagnose integration issues

---

## Resolved Decisions
- **Currency:** CAD throughout
- **Distance unit:** Kilometres throughout
- **Primary metric:** Cost per km (CAD/km) inclusive of operating costs and depreciation
- **Depreciation source:** Manual market value entry only; no automated valuation API
- **Default time range:** 30 days, with user-selectable presets (7d, 90d, 6mo, 1yr, all time)
- **Gas vehicle data entry:** Manual only
- **Auth method:** Magic link (email)
- **Access control:** Admin-issued invitations via auth provider
- **Data visibility:** Shared across all authenticated users

---

## Open Questions
- OQ1: Does the EV data provider expose odometer readings per charging session? (Determines whether FR14 is needed in practice — to be confirmed during API research)

---

## Out of Scope (MVP)
- Automated market value / depreciation estimation
- Mobile app
- Exporting data (CSV, PDF, etc.)
- Notifications or alerts
- Miles or USD support
