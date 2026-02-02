# Deployment Guide - Railway

This guide walks you through deploying SafePlate to Railway.

## Prerequisites

1. Railway account (sign up at [railway.app](https://railway.app))
2. GitHub repository with your code
3. Accounts for all third-party services:
   - MongoDB Atlas (or use Railway MongoDB plugin)
   - Clerk
   - Stripe
   - Redis (Railway plugin or external)
   - Twilio (optional)
   - Resend (optional)
   - Google Maps API (optional)

## Step 1: Set Up Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account and select the `nurisheasy` repository
5. Railway will automatically detect Next.js and start building

## Step 2: Add Services

### Main Application Service

Railway should auto-detect your Next.js app. Verify:
- Build Command: `npm run build`
- Start Command: `npm run start:prod`
- Health Check Path: `/api/health`

### MongoDB Service

**Option A: Railway MongoDB Plugin**
1. In your Railway project, click "+ New"
2. Select "MongoDB" from the plugins
3. Railway will provision a MongoDB instance
4. Copy the `MONGO_URI` from the MongoDB service variables

**Option B: MongoDB Atlas (Recommended for Production)**
1. Create cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Set up VPC peering with Railway (see Railway docs)
3. Get connection string from Atlas
4. Use as `MONGO_URI`

### Redis Service

1. In Railway project, click "+ New"
2. Select "Redis" from the plugins
3. Copy the `REDIS_URL` from the Redis service variables

## Step 3: Configure Environment Variables

In Railway, go to your main service → Variables tab and add:

### Required Variables

```bash
# MongoDB
MONGO_URI=mongodb+srv://...

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Redis
REDIS_URL=redis://default:password@redis.railway.internal:6379

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.up.railway.app
```

### Optional Variables

```bash
# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890

# Resend
RESEND_API_KEY=re_...

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...

# Cron Job Authentication
CRON_API_KEY=your-secure-random-key
```

## Step 4: Configure Webhooks

### Stripe Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. URL: `https://your-app.up.railway.app/api/webhooks/stripe`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copy the webhook signing secret → Add as `STRIPE_WEBHOOK_SECRET`

### Clerk Webhook

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → Webhooks
2. Click "Add Endpoint"
3. URL: `https://your-app.up.railway.app/api/webhooks/clerk`
4. Select events:
   - `organization.created`
   - `organization.updated`
   - `organization.deleted`
5. Copy the signing secret → Add as `CLERK_WEBHOOK_SECRET`

## Step 5: Set Up Cron Job (Vendor Wake-Up)

Railway doesn't have built-in cron, so use one of these options:

### Option A: External Cron Service

Use [cron-job.org](https://cron-job.org) or [EasyCron](https://www.easycron.com):

1. Create a cron job
2. URL: `https://your-app.up.railway.app/api/jobs/vendor-wakeup`
3. Method: POST
4. Headers: `Authorization: Bearer YOUR_CRON_API_KEY`
5. Schedule: Every 15 minutes (`*/15 * * * *`)

### Option B: Railway Cron Service

If Railway adds cron support, configure it in `railway.toml`:

```toml
[cron]
schedule = "*/15 * * * *"
command = "curl -X POST -H 'Authorization: Bearer $CRON_API_KEY' https://your-app.up.railway.app/api/jobs/vendor-wakeup"
```

## Step 6: Custom Domain (Optional)

1. In Railway, go to your service → Settings → Networking
2. Click "Generate Domain" or "Add Custom Domain"
3. For custom domain:
   - Add CNAME record in your DNS: `your-domain.com` → `your-app.up.railway.app`
   - Railway will provision SSL automatically

## Step 7: Monitor Deployment

1. Check Railway logs: Service → Deployments → View Logs
2. Test health endpoint: `curl https://your-app.up.railway.app/api/health`
3. Verify environment variables are set correctly

## Step 8: Post-Deployment Checklist

- [ ] Health endpoint returns 200
- [ ] Stripe webhook test succeeds
- [ ] Clerk webhook test succeeds
- [ ] MongoDB connection works (check logs)
- [ ] Redis connection works (check logs)
- [ ] Can create test order
- [ ] Can accept order as vendor
- [ ] Email notifications work (if configured)
- [ ] SMS notifications work (if configured)

## Troubleshooting

### Build Fails

- Check Railway logs for specific errors
- Verify `package.json` dependencies are correct
- Ensure Node.js version is compatible (18+)

### Database Connection Issues

- Verify `MONGO_URI` is correct
- Check MongoDB IP whitelist (if using Atlas)
- Ensure VPC peering is set up (if using Atlas)

### Webhook Failures

- Check webhook URL is accessible
- Verify webhook secrets match
- Check Railway logs for webhook errors
- Test webhook endpoints manually with curl

### Environment Variables Not Loading

- Ensure variables are set in Railway dashboard
- Check variable names match exactly (case-sensitive)
- Redeploy after adding new variables

## Scaling Considerations

- **Horizontal Scaling**: Railway auto-scales based on traffic
- **Database**: Use MongoDB Atlas for production (better scaling)
- **Redis**: Consider Redis Cloud for production (better persistence)
- **CDN**: Railway provides CDN automatically for static assets

## Cost Optimization

- Use Railway's free tier for development
- MongoDB Atlas free tier (512MB) is sufficient for MVP
- Redis Railway plugin is included in Railway plan
- Monitor usage in Railway dashboard

## Security Best Practices

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Use Railway secrets** - Store sensitive data in Railway variables
3. **Enable 2FA** on Railway account
4. **Rotate API keys** regularly
5. **Use production keys** only in production environment
6. **Monitor logs** for suspicious activity

## Support

- Railway Docs: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Project Issues: GitHub Issues
