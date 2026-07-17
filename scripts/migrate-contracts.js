/**
 * scripts/migrate-contracts.js
 *
 * One-time backfill for issue #4 — "Extract Contract into its own model".
 *
 * Historically, Order carried these contract fields directly:
 *   - contractDurationMonths (3|6|9|12)
 *   - preparationDayOfWeek   (0..6)
 *   - mealPeriods            (['breakfast'|'lunch'|'dinner']+)
 *   - fulfillmentMethod      ('pickup'|'delivery')
 *   - contractStartDate / contractEndDate
 *
 * After this change:
 *   - Order = one delivery. It keeps `deliveryFeeCents` and gains an optional
 *     `contractId` (ref Contract). One-off orders use `deliveryDetails`.
 *   - Contract (`lib/models/contract.model.ts`) represents the recurring
 *     consumer↔vendor agreement.
 *
 * What this script does (idempotent):
 *   1. For every legacy Order that has `contractDurationMonths` and no
 *      `contractId`, find-or-create an ACTIVE Contract matching the terms
 *      (grouped by consumerId + vendorId + terms).
 *   2. Point the Order at that Contract via `contractId`.
 *   3. Unset the legacy Order fields.
 *
 * Usage:
 *   node scripts/migrate-contracts.js
 *
 * Requires MONGO_URI to be set (defaults to local dev DB).
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const mongoose = require('mongoose');

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/safeplate_dev';

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const orders = db.collection('orders');
  const contracts = db.collection('contracts');

  const legacyCursor = orders.find({
    contractDurationMonths: { $exists: true },
    contractId: { $exists: false },
  });

  let migrated = 0;
  let skipped = 0;

  while (await legacyCursor.hasNext()) {
    const order = await legacyCursor.next();

    const subOrder = Array.isArray(order.subOrders) ? order.subOrders[0] : null;
    if (!subOrder) {
      skipped += 1;
      continue;
    }

    const terms = {
      consumerId: order.consumerId,
      vendorId: subOrder.vendorId,
      durationMonths: order.contractDurationMonths,
      preparationDayOfWeek: order.preparationDayOfWeek,
      fulfillmentMethod: order.fulfillmentMethod,
    };

    let contract = await contracts.findOne({ ...terms, status: 'ACTIVE' });

    if (!contract) {
      const startDate = order.contractStartDate || order.createdAt || new Date();
      const endDate =
        order.contractEndDate ||
        new Date(
          new Date(startDate).setMonth(
            new Date(startDate).getMonth() +
              Number(order.contractDurationMonths || 3)
          )
        );

      const inserted = await contracts.insertOne({
        consumerId: order.consumerId,
        vendorId: subOrder.vendorId,
        durationMonths: order.contractDurationMonths,
        startDate,
        endDate,
        preparationDayOfWeek: order.preparationDayOfWeek,
        mealPeriods: order.mealPeriods || [],
        fulfillmentMethod: order.fulfillmentMethod || 'pickup',
        pricingTerms: {
          platformFeePercent: 10,
          minimumOrderCents: 2000,
          contractFeeCents: 0,
        },
        status: 'ACTIVE',
        items: (subOrder.items || []).map((item) => ({
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        lastGeneratedPrepDate: startDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      contract = { _id: inserted.insertedId };
    }

    await orders.updateOne(
      { _id: order._id },
      {
        $set: { contractId: contract._id },
        $unset: {
          contractDurationMonths: '',
          preparationDayOfWeek: '',
          mealPeriods: '',
          fulfillmentMethod: '',
          contractStartDate: '',
          contractEndDate: '',
        },
      }
    );

    migrated += 1;
  }

  console.log(
    JSON.stringify({
      migrated,
      skipped,
      message: 'Contract migration complete.',
    })
  );

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('Migration failed:', error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
