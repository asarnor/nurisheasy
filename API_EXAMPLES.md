# API Usage Examples

This document provides practical examples of how to use the SafePlate API.

## Authentication

All endpoints (except webhooks and health check) require Clerk authentication. Include the session token in your requests.

```typescript
// Using fetch with Clerk session
const response = await fetch('/api/menus', {
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
  },
});
```

## Consumer Flow

### 1. Get Available Menus (Safety-Filtered)

```typescript
// GET /api/menus
const response = await fetch('/api/menus');
const data = await response.json();

// Returns only items that:
// - Are available
// - Don't contain critical allergens from your safety profile
// - Are from vendors within delivery radius

console.log(data.items);
// [
//   {
//     id: "...",
//     vendorId: "...",
//     vendorName: "Joe's Pizza",
//     name: "Margherita Pizza",
//     price: 1200, // $12.00 in cents
//     allergenTags: ["DAIRY", "GLUTEN"],
//     ingredients: ["mozzarella", "tomato", "basil"],
//   },
//   ...
// ]
```

### 2. Get Vendors Within Delivery Radius

```typescript
// GET /api/vendors
const response = await fetch('/api/vendors');
const data = await response.json();

console.log(data.vendors);
// [
//   {
//     id: "...",
//     name: "Joe's Pizza",
//     address: { ... },
//     menuItemCount: 15,
//   },
//   ...
// ]
```

### 3. Create Order

```typescript
// POST /api/orders
const response = await fetch('/api/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    items: [
      {
        menuItemId: "menu_item_123",
        quantity: 2,
      },
      {
        menuItemId: "menu_item_456",
        quantity: 1,
      },
    ],
  }),
});

const order = await response.json();
// {
//   orderId: "...",
//   paymentIntentId: "pi_...",
//   clientSecret: "pi_..._secret_...",
//   totalAmount: 3500, // $35.00
//   platformFee: 350, // $3.50 (10%)
//   subOrders: [
//     {
//       vendorId: "...",
//       status: "PENDING",
//       items: [...],
//       vendorTotal: 2400,
//     },
//     {
//       vendorId: "...",
//       status: "PENDING",
//       items: [...],
//       vendorTotal: 1100,
//     },
//   ],
// }

// Use clientSecret with Stripe.js to confirm payment
```

### 4. Get Orders

```typescript
// GET /api/orders?status=CONFIRMED&limit=10
const response = await fetch('/api/orders?status=CONFIRMED&limit=10');
const data = await response.json();

console.log(data.orders);
```

## Vendor Flow

### 1. Accept Order

```typescript
// POST /api/orders/{orderId}/accept
const response = await fetch(`/api/orders/${orderId}/accept`, {
  method: 'POST',
});

const result = await response.json();
// {
//   order: { ... },
//   message: "Sub-order accepted successfully",
// }

// If all vendors accept, payment is automatically captured
// and funds are transferred to each vendor
```

### 2. Get Vendor Orders

```typescript
// GET /api/orders
// Returns orders where this vendor has a sub-order
const response = await fetch('/api/orders');
const data = await response.json();

// Filter for pending orders
const pendingOrders = data.orders.filter(
  (order) => order.subOrders.some(
    (so) => so.vendorId === myVendorId && so.status === 'PENDING'
  )
);
```

## Admin Flow

### 1. Refund Sub-Order

```typescript
// POST /api/orders/{orderId}/refund
const response = await fetch(`/api/orders/${orderId}/refund`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    subOrderIndex: 1, // Index of sub-order to refund
  }),
});

const result = await response.json();
// {
//   order: { ... },
//   message: "Sub-order refunded successfully",
// }

// Stripe refund is processed automatically
```

## Organization Management

### 1. Get Current Organization

```typescript
// GET /api/organizations
const response = await fetch('/api/organizations');
const data = await response.json();

console.log(data.organization);
// {
//   id: "...",
//   name: "Sunnyvale Care",
//   type: "consumer",
//   safetyProfile: {
//     criticalAllergens: ["PEANUT", "SHELLFISH"],
//     preferences: ["LOW_SODIUM"],
//     taxExempt: true,
//   },
//   address: {
//     street: "123 Main St",
//     city: "San Francisco",
//     state: "CA",
//     zipCode: "94102",
//     coordinates: { lat: 37.7749, lng: -122.4194 },
//   },
// }
```

### 2. Update Organization Safety Profile

```typescript
// PATCH /api/organizations
const response = await fetch('/api/organizations', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    safetyProfile: {
      criticalAllergens: ["PEANUT", "SHELLFISH", "EGG"],
      preferences: ["LOW_SODIUM", "VEGETARIAN"],
      taxExempt: true,
    },
  }),
});

// Address is automatically geocoded if provided
```

## Error Handling

All endpoints return standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (wrong role/organization)
- `404` - Not Found
- `429` - Too Many Requests (order lock in progress)
- `500` - Internal Server Error

Example error response:

```json
{
  "error": "SAFETY BLOCK: Item \"Shrimp Pad Thai\" contains SHELLFISH which violates restriction: PEANUT, SHELLFISH"
}
```

## Webhook Examples

### Stripe Webhook (Automatic)

Stripe automatically calls your webhook endpoint. No manual action needed.

### Clerk Webhook (Automatic)

Clerk automatically syncs organization data. No manual action needed.

### Vendor Wake-Up Job (Scheduled)

Set up a cron job to call:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_API_KEY" \
  https://your-app.up.railway.app/api/jobs/vendor-wakeup
```

## Complete Order Flow Example

```typescript
// 1. Consumer browses menus (automatically filtered)
const menus = await fetch('/api/menus').then(r => r.json());

// 2. Consumer adds items to cart
const cartItems = [
  { menuItemId: "item_1", quantity: 2 },
  { menuItemId: "item_2", quantity: 1 },
];

// 3. Consumer creates order
const order = await fetch('/api/orders', {
  method: 'POST',
  body: JSON.stringify({ items: cartItems }),
}).then(r => r.json());

// 4. Consumer pays via Stripe.js
// (Use order.clientSecret with Stripe Elements)

// 5. Vendors receive notifications (automatic)
// - Email via Resend
// - SMS/Voice via Twilio (if not accepted in 15 min)

// 6. Vendor accepts order
await fetch(`/api/orders/${order.orderId}/accept`, {
  method: 'POST',
});

// 7. When all vendors accept:
// - Payment is captured
// - Funds are transferred to vendors (minus platform fee)
// - Order status becomes "CONFIRMED"

// 8. If issue occurs, admin refunds:
await fetch(`/api/orders/${order.orderId}/refund`, {
  method: 'POST',
  body: JSON.stringify({ subOrderIndex: 0 }),
});
```
