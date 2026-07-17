# Vendor Acceptance Lifecycle (issue #6)

This document describes the vendor acceptance lifecycle implemented for
SafePlate one-off and contract orders. See GitHub issue #6.

## Auto-accept

Sub-orders are auto-accepted at order creation when:

- The order is contract-like — carries a `contractId` or the legacy
  `contractDurationMonths` field (`isContractLikeOrder` in
  `lib/order-lifecycle.ts`); OR
- The owning vendor has `vendorSettings.autoAcceptOrders === true`.

When every sub-order is ACCEPTED the PaymentIntent is captured and per-vendor
Stripe Connect transfers fire. The parent Order transitions to CONFIRMED.

## Vendor decline

Endpoint: `POST /api/orders/:orderId/decline`

Body: `{ reason: 'out_of_stock' | 'closed' | 'capacity' | 'other', note?: string }`

Marks the vendor's PENDING sub-order as CANCELLED with `declineReason`,
`declineNote`, and `declinedAt`. If every sub-order ends up cancelled the parent
order is CANCELLED and the (uncaptured) PaymentIntent is released. Otherwise
the response instructs the caller to poll `/resolve-partial`.

## Consumer resolve-partial

Endpoint: `POST /api/orders/:orderId/resolve-partial`

Body: `{ action: 'proceed' | 'cancel_all' }`

- `cancel_all` — cancels any remaining pending/accepted sub-orders and
  releases the PaymentIntent (nothing was captured).
- `proceed` — captures the PaymentIntent, transfers ACCEPTED sub-order
  totals to their vendors, then issues Stripe partial refunds for every
  CANCELLED sub-order total. This preserves the existing manual-capture
  Connect flow instead of adjusting capture amounts.

## KDS countdown + sound

`GET /api/orders` now returns `platformRules.vendorAcceptanceTimeoutMinutes`
(default 30, configurable via `PlatformRule.deliveryTiming`) and
`vendor.kdsSoundEnabled` (mirrors `vendorSettings.kdsSoundEnabled`).

`app/(vendor)/kds/VendorKdsView.tsx` renders a live `mm:ss` countdown per
PENDING order based on `createdAt + timeout - now` and plays a WebAudio beep
whenever a new PENDING order arrives (only when sound is enabled).

## Escalation ladder + auto-expire

Job: `POST /api/jobs/vendor-acceptance` (`lib/jobs/vendor-acceptance.ts`)

For each PENDING sub-order on non-auto-accept orders:

| Age (min) | Action                                                        |
|-----------|---------------------------------------------------------------|
| 0         | push/email conceptually fires on create (logged today)        |
| ≥ 10      | SMS via `vendorSettings.contactPhone`                         |
| ≥ 15      | Voice call via `vendorSettings.contactPhone`                  |
| ≥ timeout | AUTO-EXPIRE → sub-order CANCELLED with reason `auto_expired`  |

State is tracked on `subOrder.acceptanceEscalation` (`smsSentAt`,
`voiceSentAt`, `expiredAt`) so re-runs don't double-notify.

The legacy `POST /api/jobs/vendor-wakeup` route delegates to the same job for
backward compatibility with existing schedulers.

## Production status transitions

`POST /api/orders/:orderId/status` now works in production for vendors moving
their own sub-order through PREPARING → READY → DELIVERED (previously it was
debug-only). Accept / decline still go through the dedicated endpoints and are
disallowed here.

## Notes on `PlatformRule`

- `deliveryTiming.vendorAcceptanceTimeoutMinutes` default bumped from 15 → 30
  to match the issue's "auto-expire at 30 min" language. Admins can override
  via the platform-rules doc.
