import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import connectDB from '@/lib/mongodb';
import Organization, { type IOrganization } from '@/lib/models/organization.model';
import { geocodeAddress } from '@/lib/utils/geospatial';
import { shouldUseMockData, getDebugRoleFromRequest } from '@/lib/utils/debug';
import {
  bootstrapMockConsumerOnboarding,
  completeMockConsumerOnboarding,
  getMockConsumerOnboarding,
  updateMockConsumerOnboarding,
} from '@/lib/mock-data';
import {
  DEFAULT_CONSUMER_SETTINGS,
  mergeConsumerSettings,
  type ConsumerSettings,
} from '@/lib/consumer-settings';
import { evaluateConsumerOnboarding } from '@/lib/consumer-onboarding';

const facilityStepSchema = z.object({
  step: z.literal('facility'),
  name: z.string().min(1),
  contactName: z.string().min(1),
  contactEmail: z.string().optional(),
  contactPhone: z.string().min(7),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zipCode: z.string().min(1),
  }),
});

const safetyStepSchema = z.object({
  step: z.literal('safety'),
  criticalAllergens: z.array(z.string()),
  preferences: z.array(z.string()),
  confirmedNoCriticalAllergens: z.boolean(),
});

const orderingStepSchema = z.object({
  step: z.literal('ordering'),
  defaultContractOptions: z.object({
    contractDurationMonths: z.union([
      z.literal(3),
      z.literal(6),
      z.literal(9),
      z.literal(12),
    ]),
    preparationDayOfWeek: z.number().min(0).max(6),
    mealPeriods: z.array(z.enum(['breakfast', 'lunch', 'dinner'])).min(1),
    fulfillmentMethod: z.enum(['pickup', 'delivery']),
  }),
  orderingStepAcknowledged: z.literal(true),
});

const updateSchema = z.discriminatedUnion('step', [
  facilityStepSchema,
  safetyStepSchema,
  orderingStepSchema,
]);

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48) || 'group-home';

async function buildOnboardingPayload(organization: IOrganization) {
  const consumerSettings = organization.consumerSettings as Partial<ConsumerSettings> | undefined;
  const settings = mergeConsumerSettings(consumerSettings);
  const status = evaluateConsumerOnboarding({
    name: organization.name,
    address: organization.address,
    safetyProfile: organization.safetyProfile,
    consumerSettings,
    onboardingCompletedAt: organization.onboardingCompletedAt,
    orderingStepAcknowledged: settings.orderingStepAcknowledged,
  });

  return {
    organization: {
      id: organization._id.toString(),
      name: organization.name,
      address: organization.address,
      safetyProfile: organization.safetyProfile,
      settings,
    },
    status,
  };
}

async function ensureConsumerOrganization(facilityName?: string) {
  const { userId, orgId } = await auth();
  if (!userId) return { error: 'Unauthorized', status: 401 as const };

  await connectDB();

  if (orgId) {
    const organization = await Organization.findOne({ clerkOrgId: orgId });
    if (organization) {
      if (organization.type !== 'consumer') {
        organization.type = 'consumer';
        organization.consumerSettings =
          organization.consumerSettings || DEFAULT_CONSUMER_SETTINGS;
        await organization.save();
      }
      return { organization };
    }
  }

  const user = await currentUser();
  const name =
    facilityName?.trim() ||
    user?.fullName ||
    user?.firstName ||
    'My Group Home';

  let clerkOrgId = orgId;

  if (!clerkOrgId) {
    try {
      const client = await clerkClient();
      const created = await client.organizations.createOrganization({
        name,
        slug: `${slugify(name)}-${Date.now().toString(36)}`,
        createdBy: userId,
        publicMetadata: { safeplateType: 'consumer' },
      });
      clerkOrgId = created.id;
    } catch (error) {
      console.error('Failed to create Clerk organization:', error);
      return {
        error: 'Could not create group home organization. Please try again.',
        status: 500 as const,
      };
    }
  }

  let organization = await Organization.findOne({ clerkOrgId });
  if (!organization) {
    organization = await Organization.create({
      clerkOrgId,
      name,
      type: 'consumer',
      consumerSettings: DEFAULT_CONSUMER_SETTINGS,
      safetyProfile: {
        criticalAllergens: [],
        preferences: [],
        taxExempt: false,
        confirmedNoCriticalAllergens: false,
      },
    });
  }

  return { organization, clerkOrgId };
}

export async function GET(request: NextRequest) {
  try {
    if (await shouldUseMockData(request)) {
      const role = await getDebugRoleFromRequest(request);
      if (role !== 'consumer') {
        return NextResponse.json({ error: 'Consumer access required' }, { status: 403 });
      }

      const data = getMockConsumerOnboarding() || bootstrapMockConsumerOnboarding();
      if (!data) {
        return NextResponse.json({ error: 'Consumer not found' }, { status: 404 });
      }

      return NextResponse.json(data);
    }

    const ensured = await ensureConsumerOrganization();
    if ('error' in ensured) {
      return NextResponse.json({ error: ensured.error }, { status: ensured.status });
    }

    const payload = await buildOnboardingPayload(ensured.organization);
    return NextResponse.json({
      ...payload,
      clerkOrgId: ensured.clerkOrgId,
    });
  } catch (error) {
    console.error('Error fetching consumer onboarding:', error);
    return NextResponse.json({ error: 'Failed to fetch onboarding status' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (await shouldUseMockData(request)) {
      const role = await getDebugRoleFromRequest(request);
      if (role !== 'consumer') {
        return NextResponse.json({ error: 'Consumer access required' }, { status: 403 });
      }

      if (action === 'bootstrap') {
        return NextResponse.json(bootstrapMockConsumerOnboarding());
      }

      if (action === 'reset-demo') {
        const { resetMockConsumerOnboarding } = await import('@/lib/mock-data');
        const data = resetMockConsumerOnboarding();
        return NextResponse.json(data);
      }

      if (action === 'complete') {
        const result = completeMockConsumerOnboarding();
        if (!result) {
          return NextResponse.json({ error: 'Consumer not found' }, { status: 404 });
        }
        if ('error' in result) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        return NextResponse.json(result);
      }

      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (action === 'bootstrap') {
      const body = await request.json().catch(() => ({}));
      const ensured = await ensureConsumerOrganization(body?.facilityName);
      if ('error' in ensured) {
        return NextResponse.json({ error: ensured.error }, { status: ensured.status });
      }

      const payload = await buildOnboardingPayload(ensured.organization);
      return NextResponse.json({
        ...payload,
        clerkOrgId: ensured.clerkOrgId,
      });
    }

    if (action === 'complete') {
      const ensured = await ensureConsumerOrganization();
      if ('error' in ensured) {
        return NextResponse.json({ error: ensured.error }, { status: ensured.status });
      }

      const organization = ensured.organization;
      const settings = mergeConsumerSettings(
        organization.consumerSettings as Partial<ConsumerSettings> | undefined
      );
      const status = evaluateConsumerOnboarding({
        name: organization.name,
        address: organization.address,
        safetyProfile: organization.safetyProfile,
        consumerSettings: organization.consumerSettings as Partial<ConsumerSettings> | undefined,
        onboardingCompletedAt: organization.onboardingCompletedAt,
        orderingStepAcknowledged: settings.orderingStepAcknowledged,
      });

      if (!status.isComplete) {
        return NextResponse.json(
          { error: 'Complete all onboarding steps before continuing.' },
          { status: 400 }
        );
      }

      organization.onboardingCompletedAt = new Date();
      await organization.save();

      const payload = await buildOnboardingPayload(organization);
      return NextResponse.json(payload);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in consumer onboarding POST:', error);
    return NextResponse.json({ error: 'Failed to process onboarding action' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = updateSchema.parse(body);

    if (await shouldUseMockData(request)) {
      const role = await getDebugRoleFromRequest(request);
      if (role !== 'consumer') {
        return NextResponse.json({ error: 'Consumer access required' }, { status: 403 });
      }

      if (validated.step === 'facility') {
        const data = updateMockConsumerOnboarding({
          name: validated.name,
          contactName: validated.contactName,
          contactEmail: validated.contactEmail || '',
          contactPhone: validated.contactPhone,
          address: {
            ...validated.address,
            coordinates: { lat: 30.261, lng: -97.73 },
          },
        });
        return NextResponse.json(data);
      }

      if (validated.step === 'safety') {
        if (
          !validated.confirmedNoCriticalAllergens &&
          validated.criticalAllergens.length === 0
        ) {
          return NextResponse.json(
            { error: 'Select critical allergens or confirm there are none.' },
            { status: 400 }
          );
        }

        const data = updateMockConsumerOnboarding({
          criticalAllergens: validated.criticalAllergens,
          preferences: validated.preferences,
          confirmedNoCriticalAllergens: validated.confirmedNoCriticalAllergens,
        });
        return NextResponse.json(data);
      }

      const data = updateMockConsumerOnboarding({
        defaultContractOptions: validated.defaultContractOptions,
        orderingStepAcknowledged: validated.orderingStepAcknowledged,
      });
      return NextResponse.json(data);
    }

    const ensured = await ensureConsumerOrganization();
    if ('error' in ensured) {
      return NextResponse.json({ error: ensured.error }, { status: ensured.status });
    }

    const organization = ensured.organization;

    if (validated.step === 'facility') {
      organization.name = validated.name;
      organization.address = { ...validated.address };
      const fullAddress = `${validated.address.street}, ${validated.address.city}, ${validated.address.state} ${validated.address.zipCode}`;
      const coordinates = await geocodeAddress(fullAddress);
      if (coordinates) {
        organization.address.coordinates = coordinates;
      }

      organization.consumerSettings = {
        ...mergeConsumerSettings(
          organization.consumerSettings as Partial<ConsumerSettings> | undefined
        ),
        contactName: validated.contactName,
        contactEmail: validated.contactEmail || '',
        contactPhone: validated.contactPhone,
      };
      await organization.save();
    }

    if (validated.step === 'safety') {
      if (
        !validated.confirmedNoCriticalAllergens &&
        validated.criticalAllergens.length === 0
      ) {
        return NextResponse.json(
          { error: 'Select critical allergens or confirm there are none.' },
          { status: 400 }
        );
      }

      organization.safetyProfile.criticalAllergens = validated.criticalAllergens;
      organization.safetyProfile.preferences = validated.preferences;
      organization.safetyProfile.confirmedNoCriticalAllergens =
        validated.confirmedNoCriticalAllergens;
      await organization.save();
    }

    if (validated.step === 'ordering') {
      organization.consumerSettings = {
        ...mergeConsumerSettings(
          organization.consumerSettings as Partial<ConsumerSettings> | undefined
        ),
        defaultContractOptions: validated.defaultContractOptions,
        orderingStepAcknowledged: validated.orderingStepAcknowledged,
      };
      await organization.save();
    }

    const payload = await buildOnboardingPayload(organization);
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error updating consumer onboarding:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to update onboarding' }, { status: 500 });
  }
}
