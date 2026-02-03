# Environment Variables Reference

This document lists all environment variables used by SafePlate and where they are referenced in the codebase.

## Required Variables

These variables **must** be set for the application to run:

| Variable | Used In | Description |
|---------|---------|-------------|
| `MONGO_URI` | `lib/mongodb.ts` | MongoDB connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `app/layout.tsx` | Clerk publishable key (exposed to browser) |
| `CLERK_SECRET_KEY` | `lib/utils/clerk.ts` | Clerk secret key (server-only) |
| `STRIPE_SECRET_KEY` | `lib/utils/stripe.ts`, `app/api/webhooks/stripe/route.ts` | Stripe secret key (server-only) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `app/(consumer)/cart/page.tsx` | Stripe publishable key (exposed to browser) |
| `REDIS_URL` | `lib/redis.ts` | Redis connection URL |

## Optional Variables

These variables have defaults or are optional:

### Application Configuration

| Variable | Default | Used In | Description |
|---------|---------|---------|-------------|
| `NODE_ENV` | `development` | `lib/mongodb.ts`, `lib/utils/env.ts` | Environment mode |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `lib/utils/resend.ts`, `middleware.ts` | Application base URL |

### Clerk Configuration

| Variable | Default | Used In | Description |
|---------|---------|---------|-------------|
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | `app/layout.tsx`, `middleware.ts` | Sign-in page URL |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | `app/layout.tsx` | Sign-up page URL |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/` | `app/layout.tsx` | Redirect after sign-in |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/` | `app/layout.tsx` | Redirect after sign-up |
| `CLERK_WEBHOOK_SECRET` | - | `app/api/webhooks/clerk/route.ts` | Clerk webhook signing secret |

### Stripe Configuration

| Variable | Default | Used In | Description |
|---------|---------|---------|-------------|
| `STRIPE_WEBHOOK_SECRET` | - | `app/api/webhooks/stripe/route.ts` | Stripe webhook signing secret |

### Twilio (Optional Service)

| Variable | Default | Used In | Description |
|---------|---------|---------|-------------|
| `TWILIO_ACCOUNT_SID` | - | `lib/utils/twilio.ts` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | - | `lib/utils/twilio.ts` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | - | `lib/utils/twilio.ts` | Twilio phone number |

### Resend (Optional Service)

| Variable | Default | Used In | Description |
|---------|---------|---------|-------------|
| `RESEND_API_KEY` | - | `lib/utils/resend.ts` | Resend API key |
| `RESEND_FROM_EMAIL` | `SafePlate <orders@safeplate.com>` | `lib/utils/resend.ts` | Email sender address |

### Google Maps (Optional Service)

| Variable | Default | Used In | Description |
|---------|---------|---------|-------------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | - | `lib/utils/geospatial.ts` | Google Maps API key |

### Cron Jobs

| Variable | Default | Used In | Description |
|---------|---------|---------|-------------|
| `CRON_API_KEY` | - | `app/api/jobs/vendor-wakeup/route.ts` | API key for protecting cron endpoints |

## Usage in Code

### Server-Side (API Routes, Server Components)

```typescript
// Direct access
const mongoUri = process.env.MONGO_URI;

// Using env utility (recommended)
import { env } from '@/lib/utils/env';
const mongoUri = env.MONGO_URI;
```

### Client-Side (React Components)

Only variables prefixed with `NEXT_PUBLIC_` are available in the browser:

```typescript
// ✅ Works - exposed to browser
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// ❌ Won't work - server-only
const secretKey = process.env.STRIPE_SECRET_KEY; // undefined in browser
```

## Validation

The app validates required environment variables at startup. To enable validation:

```typescript
import { validateEnvVars } from '@/lib/utils/env';

// Call at application startup
validateEnvVars();
```

## Environment-Specific Values

### Development
- Use test keys for all services
- Local MongoDB and Redis URLs
- `NODE_ENV=development`

### Staging
- Use test Stripe keys (safe testing)
- Use live Clerk keys (real organizations)
- Staging database URLs
- `NODE_ENV=production`

### Production
- Use live keys for all services
- Production database URLs
- `NODE_ENV=production`
- All webhook secrets configured

## Security Notes

1. **Never expose secrets to browser** - Only use `NEXT_PUBLIC_` prefix for public keys
2. **Rotate keys regularly** - Especially in production
3. **Use different keys per environment** - Never reuse production keys in development
4. **Validate at startup** - Catch missing variables early
5. **Use secrets management** - Railway variables, AWS Secrets Manager, etc.

## Quick Checklist

Before deploying, ensure:

- [ ] All required variables are set
- [ ] `NEXT_PUBLIC_APP_URL` matches your domain
- [ ] Webhook secrets are configured
- [ ] `CRON_API_KEY` is set (production)
- [ ] Email sender address is configured
- [ ] All API keys are for the correct environment (test vs live)
