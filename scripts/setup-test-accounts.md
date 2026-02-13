# Quick Setup Script for Test Accounts

This guide provides a quick way to set up test accounts for development.

## Prerequisites

1. Clerk account with API access
2. MongoDB connection
3. Running development server

## Method 1: Using Clerk Dashboard (Recommended)

### 1. Create Users

Go to Clerk Dashboard → Users → Create User:

**Consumer:**
- Email: `consumer@test.com`
- Password: `Test123!@#`

**Vendor:**
- Email: `vendor@test.com`
- Password: `Test123!@#`

**Admin:**
- Email: `admin@test.com`
- Password: `Test123!@#`

### 2. Create Organizations

Go to Clerk Dashboard → Organizations → Create Organization:

**Consumer Org:**
- Name: `Sunnyvale Care`
- Add user: `consumer@test.com` (as member)
- Copy Organization ID (starts with `org_`)

**Vendor Org:**
- Name: `Joe's Pizza`
- Add user: `vendor@test.com` (as member)
- Copy Organization ID

**Admin Org:**
- Name: `SafePlate Admin`
- Add user: `admin@test.com` (as **org:admin**)
- Copy Organization ID

### 3. Update Organization Types

After organizations are created (via webhook or manually), update their types:

**Using API (after signing in):**

```bash
# Sign in as consumer@test.com first, then:
curl -X POST http://localhost:3000/api/admin/setup-test-orgs \
  -H "Content-Type: application/json" \
  -d '{
    "clerkOrgId": "org_YOUR_CONSUMER_ORG_ID",
    "type": "consumer",
    "name": "Sunnyvale Care"
  }'

# Sign in as vendor@test.com, then:
curl -X POST http://localhost:3000/api/admin/setup-test-orgs \
  -H "Content-Type: application/json" \
  -d '{
    "clerkOrgId": "org_YOUR_VENDOR_ORG_ID",
    "type": "vendor",
    "name": "Joe'\''s Pizza"
  }'
```

**Or update via MongoDB directly:**

```javascript
// Connect to MongoDB
use safeplate_dev

// Update consumer organization
db.organizations.updateOne(
  { clerkOrgId: "org_YOUR_CONSUMER_ORG_ID" },
  { $set: { type: "consumer" } }
)

// Update vendor organization
db.organizations.updateOne(
  { clerkOrgId: "org_YOUR_VENDOR_ORG_ID" },
  { $set: { type: "vendor" } }
)
```

### 4. Or use the seed script (recommended)

```bash
MONGO_URI="mongodb://127.0.0.1:27017/safeplate_dev" \\
CLERK_CONSUMER_ORG_ID="org_YOUR_CONSUMER_ORG_ID" \\
CLERK_VENDOR_ORG_ID="org_YOUR_VENDOR_ORG_ID" \\
npm run seed:orgs
```

---

## Method 2: Using Clerk API (Advanced)

You can also create organizations programmatically using Clerk's API:

```bash
# Get your Clerk secret key from .env.local
CLERK_SECRET_KEY=sk_test_...

# Create Consumer Organization
curl -X POST https://api.clerk.com/v1/organizations \
  -H "Authorization: Bearer $CLERK_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sunnyvale Care",
    "slug": "sunnyvale-care",
    "created_by": "user_YOUR_CONSUMER_USER_ID"
  }'

# Create Vendor Organization
curl -X POST https://api.clerk.com/v1/organizations \
  -H "Authorization: Bearer $CLERK_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Joe'\''s Pizza",
    "slug": "joes-pizza",
    "created_by": "user_YOUR_VENDOR_USER_ID"
  }'
```

Then update MongoDB as shown above.

---

## Quick Reference

| Role | Email | Password | Clerk Org Role | MongoDB Type | Dashboard |
|------|-------|----------|----------------|--------------|-----------|
| Consumer | `consumer@test.com` | `Test123!@#` | `org:member` | `consumer` | `/marketplace` |
| Vendor | `vendor@test.com` | `Test123!@#` | `org:member` | `vendor` | `/vendor/kds` |
| Admin | `admin@test.com` | `Test123!@#` | `org:admin` | N/A | `/admin/dashboard` |

---

## Verification

After setup, verify each account:

1. **Consumer:** Sign in → Should see marketplace
2. **Vendor:** Sign in → Should see KDS (Kitchen Display System)
3. **Admin:** Sign in → Should see admin dashboard

If you see wrong pages, check:
- MongoDB organization `type` field
- Clerk organization role (for admin)
- Browser console for errors
