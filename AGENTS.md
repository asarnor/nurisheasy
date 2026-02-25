# SafePlate - Agent Instructions

## Cursor Cloud specific instructions

### Overview

SafePlate is a Next.js 14 (App Router) monolith — a multi-vendor B2B food marketplace for group homes. It uses MongoDB, Redis, Clerk (auth), Stripe (payments), and optionally Twilio/Resend/Google Maps. All frontend and backend code lives in a single Next.js app.

### Running the dev server

Standard commands are documented in `README.md` and `package.json`. Key commands:

- `npm run dev` — starts dev server on port 3000
- `npm run lint` — runs `next lint`
- `npm run type-check` — runs `tsc --noEmit`

### Debug mode

Set `DEBUG_MODE=true` and `NEXT_PUBLIC_DEBUG_MODE=true` in `.env.local` to bypass Clerk authentication and use mock data. This is the recommended approach for local development without real external service credentials. The `.env.local` file must also include `MONGO_URI=mongodb://127.0.0.1:27017/safeplate_dev` and `REDIS_URL=redis://localhost:6379`.

API requests in debug mode can use `?debug=1&debugRole=consumer` (or `vendor`/`admin`) query parameters to simulate different user roles.

### Required local services

- **MongoDB**: Must be running on `mongodb://127.0.0.1:27017`. Start with `sudo mongod --dbpath /data/db --fork --logpath /var/log/mongod.log`.
- **Redis**: Must be running on `redis://localhost:6379`. Start with `sudo redis-server --daemonize yes`.

Both services must be started before running `npm run dev`. The `/api/health` endpoint verifies connectivity to both.

### Pre-existing codebase issues

- `npm run lint` fails because `.eslintrc.json` references `@typescript-eslint/no-unused-vars` and `@typescript-eslint/no-explicit-any` rules, but `@typescript-eslint/eslint-plugin` is not installed. These are configuration-level errors, not code errors.
- `npm run type-check` reports a few pre-existing TypeScript errors (e.g., type comparison mismatches in `app/page.tsx`, `app/(consumer)/layout.tsx`). These do not prevent the dev server from running.

### No automated test suite

There are no unit/integration tests (`*.test.*`, `*.spec.*`) or test framework (Jest/Vitest). Validation is limited to `npm run lint` and `npm run type-check`.
