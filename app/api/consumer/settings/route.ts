import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/mongodb';
import Organization from '@/lib/models/organization.model';
import { getCurrentOrganization } from '@/lib/utils/clerk';
import { shouldUseMockData, getDebugRoleFromRequest } from '@/lib/utils/debug';
import {
  getMockConsumerSettings,
  updateMockConsumerSettings,
} from '@/lib/mock-data';
import { mergeConsumerSettings, type ConsumerSettings } from '@/lib/consumer-settings';

const consumerSettingsSchema = z.object({
  settings: z
    .object({
      defaultContractOptions: z
        .object({
          contractDurationMonths: z.union([
            z.literal(3),
            z.literal(6),
            z.literal(9),
            z.literal(12),
          ]),
          preparationDayOfWeek: z.number().min(0).max(6),
          mealPeriods: z.array(z.enum(['breakfast', 'lunch', 'dinner'])),
          fulfillmentMethod: z.enum(['pickup', 'delivery']),
        })
        .optional(),
      notifyOrderUpdates: z.boolean().optional(),
      notifyDeliveryReminders: z.boolean().optional(),
      notifyContractRenewal: z.boolean().optional(),
      notifyReviewReminders: z.boolean().optional(),
      notifyMarketing: z.boolean().optional(),
      notificationQuietHoursStart: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional(),
      notificationQuietHoursEnd: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional(),
    })
    .optional(),
});

const buildResponse = (payload: {
  organization: { id: string; name: string };
  settings: ConsumerSettings;
}) => NextResponse.json(payload);

export async function GET(request: NextRequest) {
  try {
    if (await shouldUseMockData(request)) {
      const role = await getDebugRoleFromRequest(request);
      if (role !== 'consumer') {
        return NextResponse.json({ error: 'Consumer access required' }, { status: 403 });
      }

      const data = getMockConsumerSettings();
      if (!data) {
        return NextResponse.json({ error: 'Consumer not found' }, { status: 404 });
      }

      return buildResponse(data);
    }

    await connectDB();
    const organization = await getCurrentOrganization();

    if (!organization || organization.type !== 'consumer') {
      return NextResponse.json({ error: 'Consumer organization required' }, { status: 403 });
    }

    return buildResponse({
      organization: { id: organization._id.toString(), name: organization.name },
      settings: mergeConsumerSettings(
        (organization as { consumerSettings?: Partial<ConsumerSettings> }).consumerSettings
      ),
    });
  } catch (error) {
    console.error('Error fetching consumer settings:', error);
    return NextResponse.json({ error: 'Failed to fetch consumer settings' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = consumerSettingsSchema.parse(body);

    if (await shouldUseMockData(request)) {
      const role = await getDebugRoleFromRequest(request);
      if (role !== 'consumer') {
        return NextResponse.json({ error: 'Consumer access required' }, { status: 403 });
      }

      const data = updateMockConsumerSettings(validated.settings);
      if (!data) {
        return NextResponse.json({ error: 'Consumer not found' }, { status: 404 });
      }

      return buildResponse(data);
    }

    await connectDB();
    const organization = await getCurrentOrganization();

    if (!organization || organization.type !== 'consumer') {
      return NextResponse.json({ error: 'Consumer organization required' }, { status: 403 });
    }

    if (validated.settings) {
      const org = organization as typeof organization & {
        consumerSettings?: Partial<ConsumerSettings>;
      };
      org.consumerSettings = {
        ...mergeConsumerSettings(org.consumerSettings),
        ...validated.settings,
      };
      await organization.save();
    }

    return buildResponse({
      organization: { id: organization._id.toString(), name: organization.name },
      settings: mergeConsumerSettings(
        (organization as { consumerSettings?: Partial<ConsumerSettings> }).consumerSettings
      ),
    });
  } catch (error) {
    console.error('Error updating consumer settings:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to update consumer settings' }, { status: 500 });
  }
}
