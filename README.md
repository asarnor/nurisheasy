# SafePlate - Multi-Vendor B2B Food Marketplace

A high-velocity food ordering platform built with **Railway + MongoDB + Next.js**, featuring hard-gate dietary compliance for group homes and multi-vendor order fulfillment.

## 🏗️ Architecture Overview

- **Frontend/Backend**: Next.js 14 (App Router) with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Clerk (B2B Multi-Tenancy)
- **Payments**: Stripe Connect (Express Accounts)
- **Notifications**: Twilio (SMS/Voice) + Resend (Email)
- **Geospatial**: Google Maps API
- **Caching/Locking**: Redis
- **Deployment**: Railway (PaaS)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB Atlas account or Railway MongoDB plugin
- Clerk account
- Stripe account
- Redis instance (Railway Redis or local)
- Twilio account (optional)
- Resend account (optional)
- Google Maps API key (optional)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Fill in your environment variables (see .env.example)
```

### Environment Variables

See `.env.example` for all required variables. Key ones:

- `MONGO_URI` - MongoDB connection string
- `CLERK_SECRET_KEY` - Clerk authentication secret
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `REDIS_URL` - Redis connection URL
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` - Twilio credentials
- `RESEND_API_KEY` - Resend email API key
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Google Maps API key

### Development

```bash
npm run dev
```

Visit `http://localhost:3000`

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── health/              # Health check endpoint
│   │   ├── menus/               # Menu browsing (safety-filtered)
│   │   ├── orders/              # Order creation & management
│   │   │   └── [orderId]/
│   │   │       ├── accept/      # Vendor order acceptance
│   │   │       └── refund/      # Admin refund processing
│   │   ├── vendors/             # Vendor listing
│   │   ├── organizations/       # Organization management
│   │   ├── webhooks/
│   │   │   └── stripe/          # Stripe webhook handler
│   │   └── jobs/
│   │       └── vendor-wakeup/   # Scheduled vendor notifications
├── lib/
│   ├── models/                  # Mongoose schemas
│   │   ├── organization.model.ts
│   │   ├── menu.model.ts
│   │   └── order.model.ts       # Includes safety middleware
│   ├── utils/
│   │   ├── clerk.ts             # Clerk helpers
│   │   ├── stripe.ts            # Stripe payment logic
│   │   ├── redis.ts             # Redis locking
│   │   ├── geospatial.ts        # Google Maps helpers
│   │   ├── twilio.ts            # Twilio notifications
│   │   └── resend.ts            # Email notifications
│   ├── jobs/
│   │   └── vendor-wakeup.ts     # Background job logic
│   └── mongodb.ts               # MongoDB connection
├── middleware.ts                # Clerk auth middleware
└── railway.toml                 # Railway deployment config
```

## 🔒 Safety Gate System

The core feature is the **hard-gate dietary compliance** system:

1. **Organization Safety Profile**: Each group home has `criticalAllergens` (hard block) and `preferences` (warn only)
2. **Menu Filtering**: API automatically filters out unsafe items before they reach the frontend
3. **Pre-Save Validation**: Mongoose middleware validates orders before saving to MongoDB
4. **Intersection Check**: If any menu item's `allergenTags` intersect with `criticalAllergens`, the order is blocked

Example:
```typescript
// Group Home Safety Profile
{
  criticalAllergens: ["PEANUT", "SHELLFISH"]
}

// Menu Item
{
  name: "Shrimp Pad Thai",
  allergenTags: ["SHELLFISH", "EGG"]
}

// Result: BLOCKED (SHELLFISH intersection)
```

## 💳 Payment Flow

1. **Order Creation**: Consumer creates order → PaymentIntent created (manual capture)
2. **Vendor Acceptance**: Each vendor accepts their sub-order
3. **Payment Capture**: When all vendors accept → PaymentIntent captured
4. **Split Transfer**: Funds transferred to each vendor (minus 10% platform fee)
5. **Refunds**: Admin can refund individual sub-orders via Stripe API

## 📱 Vendor Wake-Up System

If a vendor doesn't accept an order within 15 minutes:
1. Background job (`/api/jobs/vendor-wakeup`) triggers
2. Twilio sends SMS notification
3. If SMS fails, falls back to voice call
4. Vendor can then accept/decline via dashboard

## 🚢 Railway Deployment

1. **Connect Repository**: Link GitHub repo to Railway project
2. **Add Services**:
   - Main service (Next.js app)
   - MongoDB (plugin or Atlas with peering)
   - Redis (plugin)
3. **Set Environment Variables**: Add all variables from `.env.example`
4. **Deploy**: Railway auto-deploys on push to main branch

The `railway.toml` configures:
- Build command: `npm run build`
- Start command: `npm run start:prod`
- Health check: `/api/health`

## 🔧 API Endpoints

### Consumer Endpoints

- `GET /api/menus` - Get available menus (safety-filtered)
- `GET /api/vendors` - Get vendors within delivery radius
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user's orders

### Vendor Endpoints

- `POST /api/orders/[orderId]/accept` - Accept sub-order
- `GET /api/orders` - Get vendor's orders

### Admin Endpoints

- `POST /api/orders/[orderId]/refund` - Refund sub-order

### System Endpoints

- `GET /api/health` - Health check
- `POST /api/webhooks/stripe` - Stripe webhook handler
- `POST /api/jobs/vendor-wakeup` - Trigger vendor wake-up job

## 🧪 Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint
```

## 📝 Key Features

✅ Hard-gate dietary compliance  
✅ Multi-vendor order splitting  
✅ Geospatial delivery radius validation  
✅ Atomic order locking (Redis)  
✅ Stripe Connect split payments  
✅ Vendor wake-up notifications (SMS/Voice)  
✅ Email confirmations  
✅ Admin dispute resolution  
✅ Idempotent webhooks  

## 🔐 Security Considerations

- **Order Locking**: Redis atomic locks prevent double-ordering
- **Safety Validation**: Both API-level and database-level checks
- **Webhook Idempotency**: Stripe webhooks check for existing orders
- **Role-Based Access**: Clerk handles RBAC
- **Input Validation**: Zod schemas validate all API inputs

## 📚 Documentation

See the master technical documentation for detailed architecture decisions, edge case handling, and operational workflows.

## 📄 License

MIT License - see LICENSE file
