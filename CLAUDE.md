# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A vehicle operating cost tracker for a small group of Canadian users. Tracks cost per km (CAD/km) as the primary metric across electric and gas vehicles, including operating costs and depreciation. All data is shared across authenticated users (no per-user isolation).

## Commands

```bash
bun run dev          # Start both frontend (Vite) and Convex backend in parallel
bun run dev:frontend # Vite dev server only (localhost:5173)
bun run dev:backend  # Convex local backend only
bun run build        # tsc -b && vite build (full type check + bundle)
bun run lint         # TypeScript + ESLint (strict, warnings-as-errors)
bun run format       # Prettier formatting
bun run preview      # Preview production build
```

## Architecture

**Frontend:** React 19 + Vite + Tailwind CSS 4 + WorkOS AuthKit
**Backend:** Convex (serverless queries, mutations, actions + database)
**Auth:** WorkOS magic link → JWT validated by Convex

### Key directories

- `src/` — React frontend
- `convex/` — Backend functions (queries, mutations, actions) and schema
- `convex/_generated/` — Auto-generated types; never edit manually
- `docs/REQUIREMENTS.md` — Full product requirements

### Auth flow

1. WorkOS AuthKit handles magic-link login for invited users
2. `src/ConvexProviderWithAuthKit.tsx` bridges `useAuth()` from WorkOS to Convex
3. `convex/auth.config.ts` configures two WorkOS JWT providers (SSO + User Management)
4. Convex functions access the user via `ctx.auth.getUserIdentity()`

### Data model

Defined in `convex/schema.ts`. Currently a template (`numbers` table). The full schema will need tables for: vehicles, charging sessions, gas fill-ups, maintenance records, odometer readings, market valuations, sync logs, and EV provider credentials.

### EV provider integration

Per requirements, the EV provider integration must be isolated behind an interface (`convex/`) so it can be swapped without touching cost/km logic. Sync runs on a schedule (Convex cron) and persists locally — the UI reads from local storage, never live from the provider.

## Environment Variables

See `.env.local.example`. Required:
- `VITE_WORKOS_CLIENT_ID` — WorkOS client ID (frontend)
- `VITE_WORKOS_REDIRECT_URI` — OAuth callback (default: `http://localhost:5173/callback`)
- `VITE_CONVEX_URL` — Convex deployment URL
- `WORKOS_CLIENT_ID` — WorkOS client ID (Convex backend)

## Key Constraints (from requirements)

- Cost/km must exclude periods with no odometer data; show as incalculable if km = 0 or unknown
- EV data must never be fetched live at page load — always from local storage
- No duplicate charging sessions regardless of sync frequency
- EV provider credentials stored encrypted, never exposed in UI after entry
- Depreciation = purchase price − most recent market value (manual entry only)
- Currency: CAD; Distance: km; Default time range: 30 days

## Code Style

- Path alias: `@/` → `src/`
- Prettier: single quotes, trailing commas, 120 char line width
- TypeScript strict mode with `noUnusedLocals` and `noUnusedParameters`
