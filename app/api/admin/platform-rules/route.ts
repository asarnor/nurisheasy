import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/mongodb';
import PlatformRule from '@/lib/models/platform-rule.model';
import { shouldUseMockData, getDebugRoleFromRequest } from '@/lib/utils/debug';
import { DEFAULT_RULES, invalidateRulesCache } from '@/lib/platform-rules';

const updateRulesSchema = z.object({
  inventory: z.object({
    trackStock: z.boolean().optional(),
    lowStockThreshold: z.number().int().min(0).optional(),
    autoDisableAtZero: z.boolean().optional(),
    requireDailyVerification: z.boolean().optional(),
    verificationWindowHours: z.number().int().min(1).optional(),
  }).optional(),
  deliveryTiming: z.object({
    maxPrepTimeMinutes: z.number().int().min(1).optional(),
    defaultDeliveryWindowMinutes: z.number().int().min(1).optional(),
    orderCutoffTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    advanceOrderMinHours: z.number().min(0).optional(),
    vendorAcceptanceTimeoutMinutes: z.number().int().min(1).optional(),
    lateDeliveryThresholdMinutes: z.number().int().min(1).optional(),
  }).optional(),
  contractMinimums: z.object({
    minimumOrderAmountCents: z.number().int().min(0).optional(),
    minimumVendorSubOrderCents: z.number().int().min(0).optional(),
    minimumMonthlyOrderCount: z.number().int().min(0).optional(),
    minimumWeeklyMenuItems: z.number().int().min(0).optional(),
    contractRenewalDays: z.number().int().min(1).optional(),
  }).optional(),
  portionProtocols: z.object({
    maxPortionsPerItem: z.number().int().min(1).optional(),
    maxItemsPerOrder: z.number().int().min(1).optional(),
    maxOrdersPerDay: z.number().int().min(1).optional(),
    requirePortionJustification: z.boolean().optional(),
    portionJustificationThreshold: z.number().int().min(1).optional(),
    defaultServingSizeOz: z.number().min(1).optional(),
    maxServingSizeOz: z.number().min(1).optional(),
  }).optional(),
  platformFeePercent: z.number().min(0).max(100).optional(),
  deliveryRadiusKm: z.number().min(1).optional(),
});

/**
 * GET /api/admin/platform-rules
 * Retrieve the current active platform rules
 */
export async function GET(request: NextRequest) {
  try {
    if (await shouldUseMockData(request)) {
      const role = await getDebugRoleFromRequest(request);
      if (role !== 'admin') {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 },
        );
      }

      return NextResponse.json({
        rules: {
          ...DEFAULT_RULES,
          version: 1,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    }

    await connectDB();

    let rules = await PlatformRule.findOne({ isActive: true }).sort({ version: -1 });

    if (!rules) {
      rules = await PlatformRule.create({
        ...DEFAULT_RULES,
        version: 1,
        isActive: true,
      });
    }

    return NextResponse.json({ rules });
  } catch (error) {
    console.error('Error fetching platform rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch platform rules' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/platform-rules
 * Update platform rules (creates a new versioned record)
 */
export async function PUT(request: NextRequest) {
  try {
    if (await shouldUseMockData(request)) {
      const role = await getDebugRoleFromRequest(request);
      if (role !== 'admin') {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 },
        );
      }

      const body = await request.json();
      const validatedData = updateRulesSchema.parse(body);

      const merged = {
        ...DEFAULT_RULES,
        ...validatedData,
        inventory: { ...DEFAULT_RULES.inventory, ...validatedData.inventory },
        deliveryTiming: { ...DEFAULT_RULES.deliveryTiming, ...validatedData.deliveryTiming },
        contractMinimums: { ...DEFAULT_RULES.contractMinimums, ...validatedData.contractMinimums },
        portionProtocols: { ...DEFAULT_RULES.portionProtocols, ...validatedData.portionProtocols },
        version: 2,
        isActive: true,
        updatedAt: new Date().toISOString(),
      };

      return NextResponse.json({ rules: merged });
    }

    await connectDB();

    const body = await request.json();
    const validatedData = updateRulesSchema.parse(body);

    const current = await PlatformRule.findOne({ isActive: true }).sort({ version: -1 });
    const currentVersion = current?.version || 0;

    // Deactivate previous version
    if (current) {
      current.isActive = false;
      await current.save();
    }

    const newRules = await PlatformRule.create({
      inventory: { ...(current?.inventory || DEFAULT_RULES.inventory), ...validatedData.inventory },
      deliveryTiming: { ...(current?.deliveryTiming || DEFAULT_RULES.deliveryTiming), ...validatedData.deliveryTiming },
      contractMinimums: { ...(current?.contractMinimums || DEFAULT_RULES.contractMinimums), ...validatedData.contractMinimums },
      portionProtocols: { ...(current?.portionProtocols || DEFAULT_RULES.portionProtocols), ...validatedData.portionProtocols },
      platformFeePercent: validatedData.platformFeePercent ?? current?.platformFeePercent ?? DEFAULT_RULES.platformFeePercent,
      deliveryRadiusKm: validatedData.deliveryRadiusKm ?? current?.deliveryRadiusKm ?? DEFAULT_RULES.deliveryRadiusKm,
      version: currentVersion + 1,
      isActive: true,
    });

    invalidateRulesCache();

    return NextResponse.json({ rules: newRules });
  } catch (error) {
    console.error('Error updating platform rules:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid rules data', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to update platform rules' },
      { status: 500 },
    );
  }
}
