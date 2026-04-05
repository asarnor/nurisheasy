# Run SafePlate locally

## 1. Start MongoDB and Redis

**Option A — Docker (recommended)**

```bash
docker compose up -d
```

This exposes MongoDB on `localhost:27017` and Redis on `localhost:6379`.

**Option B — Install locally**

- MongoDB: `brew install mongodb-community` (or use MongoDB Atlas URL in `.env.local`)
- Redis: `brew install redis && brew services start redis`

## 2. Environment variables

Copy the example and fill in your Clerk keys (from [Clerk Dashboard](https://dashboard.clerk.com) → API Keys):

```bash
cp .env.local.example .env.local
```

Minimum for the UI and API:

| Variable | Example |
|----------|---------|
| `MONGO_URI` | `mongodb://127.0.0.1:27017/safeplate_dev` |
| `REDIS_URL` | `redis://127.0.0.1:6379` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` |
| `CLERK_SECRET_KEY` | `sk_test_...` |

Stripe can stay as placeholders for browsing; payment flows need real [Stripe test keys](https://dashboard.stripe.com/test/apikeys).

## 3. Install and run

```bash
npm install
npm run dev
```

If the home page returns **404** while `next dev` logs `EMFILE: too many open files`, the file watcher could not watch the app tree (common on macOS with a low descriptor limit). Fix it using **one** of:

- **Raise the limit** in the same terminal, then start dev: `ulimit -n 10240` (or higher), then `npm run dev`.
- **Use polling** (fewer watches, slightly slower rebuilds): `npm run dev:poll`.

Open [http://localhost:3000](http://localhost:3000). If port 3000 is already in use, Next.js picks the next port (for example 3001); check the terminal for `Local:`.

**Production smoke test** (no file watcher): `npm run build && PORT=3005 npm run start`, then open `http://localhost:3005`.

Health check: [http://localhost:3000/api/health](http://localhost:3000/api/health) (expects MongoDB + Redis up).

## 4. Test accounts

See `QUICK_START.md` and `TEST_ACCOUNTS.md` for creating Clerk users and setting organization types.
