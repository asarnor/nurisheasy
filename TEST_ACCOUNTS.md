# Test Accounts Setup Guide

This guide explains how to set up test accounts to access the Client (Consumer), Vendor, and Admin sections of SafePlate.

## Overview

SafePlate uses **Clerk** for authentication and **MongoDB** to store organization data. You need to:

1. Create user accounts in Clerk
2. Create organizations in Clerk
3. Sync organizations to MongoDB
4. Set organization types (consumer/vendor)
5. Assign admin roles in Clerk

> Debug note: When `NEXT_PUBLIC_DEBUG_MODE=true` (or `DEBUG_MODE=true`) the app will use in-memory mock data across Admin, Consumer, and Vendor sections. If you log in with the test emails in this guide, mock data is also used automatically.

---

## Step-by-Step Setup

### Step 1: Create User Accounts in Clerk

1. Go to your [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Users** → **Create User**
3. Create three test users:

   **Consumer User:**
   - Email: `consumer@test.com`
   - Password: `Test123!@#`
   - Name: `Test Consumer`

   **Vendor User:**
   - Email: `vendor@test.com`
   - Password: `Test123!@#`
   - Name: `Test Vendor`

   **Admin User:**
   - Email: `admin@test.com`
   - Password: `Test123!@#`
   - Name: `Test Admin`

---

### Step 2: Create Organizations in Clerk

For each user, create an organization:

#### Consumer Organization

1. In Clerk Dashboard, go to **Organizations**
2. Click **Create Organization**
3. **Name:** `Sunnyvale Care` (or any name)
4. **Slug:** `sunnyvale-care`
5. Add the consumer user (`consumer@test.com`) as a member
6. **Role:** `org:member` (default)
7. Copy the **Organization ID** (starts with `org_`)

#### Vendor Organization

1. Create another organization
2. **Name:** `Joe's Pizza` (or any name)
3. **Slug:** `joes-pizza`
4. Add the vendor user (`vendor@test.com`) as a member
5. **Role:** `org:member` (default)
6. Copy the **Organization ID**

#### Admin Organization

1. Create another organization
2. **Name:** `SafePlate Admin`
3. **Slug:** `safeplate-admin`
4. Add the admin user (`admin@test.com`) as a member
5. **Role:** `org:admin` (IMPORTANT: Set as admin)
6. Copy the **Organization ID**

---

### Step 3: Sync Organizations to MongoDB

Organizations are automatically synced via webhook when created. However, you can also manually create/update them using the API.

#### Option A: Use the API Endpoint (Recommended)

I'll create an API endpoint to update organization types. See below.

#### Option B: Use MongoDB Directly

Connect to your MongoDB and run:

```javascript
// Consumer Organization
db.organizations.insertOne({
  name: "Sunnyvale Care",
  clerkOrgId: "org_YOUR_CONSUMER_ORG_ID",
  type: "consumer",
  safetyProfile: {
    criticalAllergens: ["PEANUT", "SHELLFISH"],
    preferences: ["LOW_SODIUM"],
    taxExempt: true
  }
});

// Vendor Organization
db.organizations.insertOne({
  name: "Joe's Pizza",
  clerkOrgId: "org_YOUR_VENDOR_ORG_ID",
  type: "vendor",
  safetyProfile: {
    criticalAllergens: [],
    preferences: [],
    taxExempt: false
  }
});
```

---

### Step 4: Update Organization Types via API

After organizations are created, update their types:

**For Consumer:**
```bash
# First, sign in as consumer@test.com, then:
curl -X PATCH http://localhost:3000/api/organizations \
  -H "Content-Type: application/json" \
  -d '{"type": "consumer"}'
```

**For Vendor:**
```bash
# First, sign in as vendor@test.com, then:
curl -X PATCH http://localhost:3000/api/organizations \
  -H "Content-Type: application/json" \
  -d '{"type": "vendor"}'
```

---

## Quick Test Credentials Summary

| Role | Email | Password | Organization Type | Access |
|------|-------|----------|-------------------|--------|
| **Consumer** | `consumer@test.com` | `Test123!@#` | `consumer` | `/marketplace` |
| **Vendor** | `vendor@test.com` | `Test123!@#` | `vendor` | `/vendor/kds` |
| **Admin** | `admin@test.com` | `Test123!@#` | N/A (Clerk role) | `/admin/dashboard` |

---

## Testing the Flow

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Visit:** `http://localhost:3000`

3. **Test Consumer:**
   - Click "Sign In as Client"
   - Sign in with `consumer@test.com` / `Test123!@#`
   - Should redirect to `/marketplace`

4. **Test Vendor:**
   - Logout
   - Click "Sign In as Vendor"
   - Sign in with `vendor@test.com` / `Test123!@#`
   - Should redirect to `/vendor/kds`

5. **Test Admin:**
   - Logout
   - Click "Sign In as Admin"
   - Sign in with `admin@test.com` / `Test123!@#`
   - Should redirect to `/admin/dashboard`

---

## Troubleshooting

### "Organization not found" error
- Check that the organization exists in MongoDB
- Verify `clerkOrgId` matches the Clerk Organization ID
- Ensure webhook is configured correctly

### Wrong redirect after login
- Check organization `type` in MongoDB (should be `consumer` or `vendor`)
- For admin, verify Clerk role is `org:admin`
- Check browser console for errors

### Can't access admin dashboard
- Verify user has `org:admin` role in Clerk
- Check organization settings in Clerk Dashboard

### Webhook not syncing organizations
- Verify webhook URL is correct: `https://your-domain.com/api/webhooks/clerk`
- Check webhook secret matches `.env.local`
- View webhook logs in Clerk Dashboard

---

## Alternative: Development Seed Script

For easier testing, you can create a seed script to automatically set up test organizations. See `scripts/seed-test-orgs.ts` (if created).

---

## Notes

- **Admin access** is determined by Clerk's `org:admin` role, not MongoDB organization type
- **Consumer/Vendor** access is determined by MongoDB organization `type` field
- Organizations are automatically created via webhook, but you may need to update the `type` manually
- Use Clerk's test mode for development (no real emails sent)
