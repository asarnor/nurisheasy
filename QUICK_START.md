# Quick Start Guide - Test Accounts

## 🚀 Fastest Way to Get Started

### Optional: Debug Mode (Mock Data)

Set `NEXT_PUBLIC_DEBUG_MODE=true` (and `DEBUG_MODE=true`) in `.env.local` to use mock data across Admin, Consumer, and Vendor sections in development.

### Step 1: Create Accounts in Clerk Dashboard

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Users** → Create three users:

   | Email | Password | Purpose |
   |-------|----------|---------|
   | `consumer@test.com` | `Test123!@#` | Client/Consumer |
   | `vendor@test.com` | `Test123!@#` | Vendor |
   | `admin@test.com` | `Test123!@#` | Admin |

### Step 2: Create Organizations in Clerk

For each user, create an organization:

1. Go to **Organizations** → **Create Organization**

   **Consumer Org:**
   - Name: `Sunnyvale Care`
   - Add `consumer@test.com` as member
   - Copy Organization ID (starts with `org_`)

   **Vendor Org:**
   - Name: `Joe's Pizza`
   - Add `vendor@test.com` as member
   - Copy Organization ID

   **Admin Org:**
   - Name: `SafePlate Admin`
   - Add `admin@test.com` as **org:admin** (IMPORTANT!)
   - Copy Organization ID

### Step 3: Update Organization Types

After organizations are created (they'll sync via webhook), update their types:

**Option A: Via API (Recommended)**

1. Start your dev server: `npm run dev`
2. Sign in as `consumer@test.com`
3. Open browser console and run:
   ```javascript
   fetch('/api/organizations', {
     method: 'PATCH',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ type: 'consumer' })
   }).then(r => r.json()).then(console.log)
   ```
4. Sign out, sign in as `vendor@test.com`
5. Run the same with `type: 'vendor'`

**Option B: Via MongoDB**

Connect to MongoDB and run:

```javascript
// Update consumer
db.organizations.updateOne(
  { clerkOrgId: "org_YOUR_CONSUMER_ORG_ID" },
  { $set: { type: "consumer" } }
)

// Update vendor
db.organizations.updateOne(
  { clerkOrgId: "org_YOUR_VENDOR_ORG_ID" },
  { $set: { type: "vendor" } }
)
```

### Step 4: Test Login

1. Visit `http://localhost:3000`
2. Click "Sign In as Client" → Use `consumer@test.com` / `Test123!@#`
3. Should redirect to `/marketplace` ✅

4. Logout → Click "Sign In as Vendor" → Use `vendor@test.com` / `Test123!@#`
5. Should redirect to `/vendor/kds` ✅

6. Logout → Click "Sign In as Admin" → Use `admin@test.com` / `Test123!@#`
7. Should redirect to `/admin/dashboard` ✅

---

## 📋 Test Credentials Summary

| Role | Email | Password | Access |
|------|-------|----------|--------|
| **Client** | `consumer@test.com` | `Test123!@#` | Marketplace |
| **Vendor** | `vendor@test.com` | `Test123!@#` | KDS |
| **Admin** | `admin@test.com` | `Test123!@#` | Admin Dashboard |

---

## 🔧 Troubleshooting

### "Organization not found"
- Check MongoDB has the organization with correct `clerkOrgId`
- Verify webhook synced the organization

### Wrong redirect after login
- Check MongoDB: `db.organizations.find({ clerkOrgId: "org_..." })`
- Verify `type` field is set correctly (`consumer` or `vendor`)
- For admin, check Clerk role is `org:admin`

### Can't update organization type
- Make sure you're signed in
- Check you're updating your own organization
- Verify MongoDB connection

---

## 💡 Pro Tip

You can also use the setup endpoint (development only):

```bash
# After signing in as consumer@test.com
curl -X POST http://localhost:3000/api/admin/setup-test-orgs \
  -H "Content-Type: application/json" \
  -d '{"clerkOrgId": "org_YOUR_ID", "type": "consumer"}'
```

See `TEST_ACCOUNTS.md` for detailed instructions.
