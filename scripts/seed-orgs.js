#!/usr/bin/env node

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

const getArg = (flag) => {
  const index = process.argv.findIndex((arg) => arg === flag);
  if (index !== -1 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }

  const pair = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (pair) {
    return pair.split('=')[1];
  }

  return null;
};

const consumerOrgId = getArg('--consumer') || process.env.CLERK_CONSUMER_ORG_ID;
const vendorOrgId = getArg('--vendor') || process.env.CLERK_VENDOR_ORG_ID;
const consumerName = getArg('--consumer-name') || process.env.CLERK_CONSUMER_ORG_NAME || 'Sunnyvale Care';
const vendorName = getArg('--vendor-name') || process.env.CLERK_VENDOR_ORG_NAME || "Joe's Pizza";

if (!MONGO_URI) {
  console.error('Missing MONGO_URI in environment.');
  process.exit(1);
}

if (!consumerOrgId || !vendorOrgId) {
  console.error('Missing Clerk org ids. Provide --consumer and --vendor or set CLERK_CONSUMER_ORG_ID and CLERK_VENDOR_ORG_ID.');
  process.exit(1);
}

const OrganizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    clerkOrgId: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ['consumer', 'vendor'], required: true },
    safetyProfile: {
      criticalAllergens: { type: [String], default: [] },
      preferences: { type: [String], default: [] },
      taxExempt: { type: Boolean, default: false },
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    stripeAccountId: String,
  },
  { timestamps: true }
);

const Organization = mongoose.models.Organization || mongoose.model('Organization', OrganizationSchema);

const upsertOrganization = async ({ clerkOrgId, type, name, safetyProfile }) => {
  return Organization.findOneAndUpdate(
    { clerkOrgId },
    {
      clerkOrgId,
      type,
      name,
      safetyProfile,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI, { bufferCommands: false });

    const consumer = await upsertOrganization({
      clerkOrgId: consumerOrgId,
      type: 'consumer',
      name: consumerName,
      safetyProfile: {
        criticalAllergens: ['PEANUT'],
        preferences: ['LOW_SODIUM'],
        taxExempt: true,
      },
    });

    const vendor = await upsertOrganization({
      clerkOrgId: vendorOrgId,
      type: 'vendor',
      name: vendorName,
      safetyProfile: {
        criticalAllergens: [],
        preferences: [],
        taxExempt: false,
      },
    });

    console.log('Seeded organizations:');
    console.log(`- Consumer: ${consumer.name} (${consumer.clerkOrgId})`);
    console.log(`- Vendor: ${vendor.name} (${vendor.clerkOrgId})`);
  } catch (error) {
    console.error('Failed to seed organizations:', error.message || error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

run();
