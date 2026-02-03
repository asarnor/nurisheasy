# Environment Variables Setup Guide

This guide explains how to set up environment variables for SafePlate across different environments.

## Quick Start

1. **For Local Development:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

2. **For Railway Deployment:**
   - Set variables in Railway Dashboard → Your Service → Variables
   - Or use Railway CLI: `railway variables set KEY=value`

## Environment Files

- `.env.example` - Template with documentation
- `.env.development` - Development environment template
- `.env.staging` - Staging environment template  
- `.env.production` - Production environment template
- `.env.local` - Your local development file (gitignored)

## Required API Keys

### 1. MongoDB (Required)
**Where to get:** [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) or Railway MongoDB Plugin

**Development:**
- Use local MongoDB: `mongodb://localhost:27017/safeplate_dev`
- Or Atlas free tier: `mongodb+srv://user:pass@cluster.mongodb.net/safeplate_dev`

**Production:**
- Use MongoDB Atlas with VPC peering
- Enable IP whitelist or VPC peering with Railway

---

### 2. Clerk Authentication (Required)
**Where to get:** [Clerk Dashboard](https://dashboard.clerk.com)

**Steps:**
1. Create a new application
2. Go to **API Keys** → Copy Publishable Key and Secret Key
3. Go to **Webhooks** → Add endpoint → Copy Signing Secret

**Keys needed:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Starts with `pk_test_` or `pk_live_`
- `CLERK_SECRET_KEY` - Starts with `sk_test_` or `sk_live_`
- `CLERK_WEBHOOK_SECRET` - Starts with `whsec_`

**Webhook Setup:**
- URL: `https://your-domain.com/api/webhooks/clerk`
- Events: `organization.created`, `organization.updated`, `organization.deleted`

---

### 3. Stripe Payments (Required)
**Where to get:** [Stripe Dashboard](https://dashboard.stripe.com)

**Steps:**
1. Go to **Developers** → **API Keys**
2. Copy Secret Key and Publishable Key
3. Go to **Developers** → **Webhooks** → Add endpoint
4. Copy Webhook Signing Secret

**Keys needed:**
- `STRIPE_SECRET_KEY` - Starts with `sk_test_` or `sk_live_`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Starts with `pk_test_` or `pk_live_`
- `STRIPE_WEBHOOK_SECRET` - Starts with `whsec_`

**Webhook Setup:**
- URL: `https://your-domain.com/api/webhooks/stripe`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`

**Important:**
- Use **Test Mode** keys (`sk_test_`, `pk_test_`) for development/staging
- Use **Live Mode** keys (`sk_live_`, `pk_live_`) only for production

---

### 4. Redis (Required)
**Where to get:** Railway Redis Plugin or [Redis Cloud](https://redis.com/cloud)

**Development:**
- Local: `redis://localhost:6379`
- Or Railway Redis Plugin URL

**Production:**
- Railway Redis Plugin: Get URL from Railway dashboard
- Or Redis Cloud: Get connection string from dashboard

---

### 5. Twilio (Optional - for SMS/Voice)
**Where to get:** [Twilio Console](https://console.twilio.com)

**Steps:**
1. Sign up for Twilio account
2. Get Account SID and Auth Token from dashboard
3. Buy a phone number: **Phone Numbers** → **Buy a Number**

**Keys needed:**
- `TWILIO_ACCOUNT_SID` - Starts with `AC`
- `TWILIO_AUTH_TOKEN` - Your auth token
- `TWILIO_PHONE_NUMBER` - Format: `+1234567890`

**Note:** Can be left empty for development if you don't need SMS/voice features

---

### 6. Resend (Optional - for Email)
**Where to get:** [Resend](https://resend.com/api-keys)

**Steps:**
1. Sign up for Resend account
2. Go to **API Keys** → Create new key
3. Copy the API key

**Keys needed:**
- `RESEND_API_KEY` - Starts with `re_`

**Note:** Can be left empty for development if you don't need email features

---

### 7. Google Maps API (Optional - for Geocoding)
**Where to get:** [Google Cloud Console](https://console.cloud.google.com)

**Steps:**
1. Create a Google Cloud project
2. Enable **Maps JavaScript API** and **Geocoding API**
3. Go to **Credentials** → Create API Key
4. Restrict the key to your domain (production)

**Keys needed:**
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Your Google Maps API key

**Note:** Can be left empty if you don't need geocoding/delivery radius features

---

### 8. Cron API Key (Required for Production)
**Generate secure key:**
```bash
openssl rand -hex 32
```

**Usage:**
- Protects `/api/jobs/vendor-wakeup` endpoint
- Set in cron job headers: `Authorization: Bearer YOUR_CRON_API_KEY`

---

## Environment-Specific Notes

### Development
- Use **test** keys for all services
- Local MongoDB and Redis are fine
- Optional services can be skipped

### Staging
- Use **test** Stripe keys (safe testing)
- Use **live** Clerk keys (real orgs)
- Use staging databases
- Test all integrations

### Production
- Use **live** keys for all services
- Use production databases
- Enable all security restrictions
- Monitor all API usage

---

## Security Best Practices

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Use different keys** for each environment
3. **Rotate keys regularly** - Especially production keys
4. **Restrict API keys** - Use IP whitelisting, domain restrictions
5. **Use secrets management** - Railway variables, AWS Secrets Manager, etc.
6. **Monitor usage** - Set up alerts for unusual API usage

---

## Railway Deployment

### Setting Variables in Railway Dashboard:
1. Go to your Railway project
2. Select your service
3. Click **Variables** tab
4. Click **+ New Variable**
5. Add each key-value pair

### Using Railway CLI:
```bash
railway variables set MONGO_URI="mongodb+srv://..."
railway variables set CLERK_SECRET_KEY="sk_live_..."
# etc.
```

### Bulk Import:
Railway supports importing from a `.env` file:
```bash
railway variables < .env.production
```

---

## Troubleshooting

### "Missing environment variable" errors
- Check that all required variables are set
- Verify variable names match exactly (case-sensitive)
- Restart your development server after adding variables

### Webhook failures
- Verify webhook URLs are accessible
- Check webhook secrets match
- Ensure webhook endpoints are in public routes

### Database connection issues
- Verify MongoDB URI is correct
- Check IP whitelist (if using Atlas)
- Ensure VPC peering is set up (production)

---

## Quick Reference

| Variable | Required | Where to Get |
|----------|----------|--------------|
| `MONGO_URI` | ✅ Yes | MongoDB Atlas |
| `CLERK_SECRET_KEY` | ✅ Yes | Clerk Dashboard |
| `STRIPE_SECRET_KEY` | ✅ Yes | Stripe Dashboard |
| `REDIS_URL` | ✅ Yes | Railway/Redis Cloud |
| `TWILIO_ACCOUNT_SID` | ⚠️ Optional | Twilio Console |
| `RESEND_API_KEY` | ⚠️ Optional | Resend Dashboard |
| `GOOGLE_MAPS_API_KEY` | ⚠️ Optional | Google Cloud Console |
| `CRON_API_KEY` | ✅ Yes (Prod) | Generate with openssl |

---

For more details, see the [Deployment Guide](./DEPLOYMENT.md).
