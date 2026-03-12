# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the React + Vite frontend. Use `src/pages/` for route-level screens, `src/components/` for reusable UI and forms, `src/layouts/` for page shells, and `src/lib/` for shared helpers such as date and formatting utilities. Static assets live in `public/`. Product notes and requirements belong in `docs/`.

`convex/` contains the backend: schema, queries, mutations, actions, cron jobs, and provider integrations. Keep generated files under `convex/_generated/` untouched. Backend tests live beside the code they cover, for example `convex/lib/costCalc.test.ts`.

## Build, Test, and Development Commands
Use the existing npm scripts:

- `npm run dev` starts Vite and `convex dev` together for full-stack local work.
- `npm run dev:frontend` runs only the frontend on `localhost:5173`.
- `npm run dev:backend` runs only the Convex dev server.
- `npm run build` runs TypeScript project builds and produces the Vite production bundle.
- `npm run lint` runs `tsc` plus ESLint with zero warnings allowed.
- `npm run format` applies Prettier across the repo.
- `npx vitest run` executes the current test suite.

## Coding Style & Naming Conventions
Write TypeScript with 2-space indentation-free formatting handled by Prettier defaults; do not hand-format around the formatter. Prettier enforces single quotes, trailing commas, semicolons, and `printWidth: 120`. React components and pages use `PascalCase` file names such as `VehiclesPage.tsx`; helpers and Convex modules use `camelCase` names such as `costCalc.ts`.

Follow the existing ESLint setup: prefer type-safe code, keep unused variables prefixed with `_`, and do not edit ignored generated files.

## Testing Guidelines
Vitest is configured with the `edge-runtime` environment. Add tests next to the backend module they validate using `*.test.ts`. Focus on deterministic unit tests for calculations, auth helpers, provider adapters, and Convex functions with business logic. No formal coverage threshold is configured, but new behavior should ship with tests when logic changes.

## Commit & Pull Request Guidelines
Recent history uses Conventional Commit prefixes such as `feat:`, `fix:`, and `chore:`. Keep messages imperative and scoped to one change. Pull requests should include a concise summary, testing notes, linked issues if applicable, and screenshots for UI changes affecting `src/pages/` or shared components.

## Security & Configuration Tips
Copy `.env.local.example` to `.env.local` for local setup. Never commit secrets, provider credentials, or generated deployment values. Treat WorkOS and Convex configuration as environment-specific, and keep encryption/auth changes aligned with the requirements in `docs/REQUIREMENTS.md`.
