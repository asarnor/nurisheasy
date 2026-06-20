import {
  mergeConsumerSettings,
  type ConsumerSettings,
} from '@/lib/consumer-settings';

export type ConsumerOnboardingStep = 'facility' | 'safety' | 'ordering';

export interface ConsumerOnboardingChecklistItem {
  id: string;
  label: string;
  description: string;
  complete: boolean;
  href: string;
}

export interface ConsumerOnboardingStatus {
  isComplete: boolean;
  completedAt?: string;
  checklist: ConsumerOnboardingChecklistItem[];
  nextStep: ConsumerOnboardingStep;
  progressPercent: number;
}

interface EvaluateConsumerOnboardingInput {
  name?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  safetyProfile?: {
    criticalAllergens?: string[];
    preferences?: string[];
    confirmedNoCriticalAllergens?: boolean;
  } | null;
  consumerSettings?: Partial<ConsumerSettings> | null;
  onboardingCompletedAt?: string | Date | null;
  orderingStepAcknowledged?: boolean;
}

export const evaluateConsumerOnboarding = (
  input: EvaluateConsumerOnboardingInput
): ConsumerOnboardingStatus => {
  const settings = mergeConsumerSettings(input.consumerSettings);
  const hasFacilityName = Boolean(input.name?.trim());
  const hasContactPhone = Boolean(settings.contactPhone?.trim());
  const hasAddress = Boolean(
    input.address?.street &&
      input.address?.city &&
      input.address?.state &&
      input.address?.zipCode
  );
  const facilityComplete = hasFacilityName && hasContactPhone && hasAddress;

  const allergens = input.safetyProfile?.criticalAllergens || [];
  const safetyComplete =
    allergens.length > 0 || Boolean(input.safetyProfile?.confirmedNoCriticalAllergens);

  const contract = settings.defaultContractOptions;
  const orderingComplete =
    Boolean(input.orderingStepAcknowledged) &&
    contract.mealPeriods.length > 0 &&
    contract.preparationDayOfWeek >= 0 &&
    contract.preparationDayOfWeek <= 6;

  const completedAt = input.onboardingCompletedAt
    ? new Date(input.onboardingCompletedAt).toISOString()
    : undefined;

  const isComplete =
    Boolean(completedAt) || (facilityComplete && safetyComplete && orderingComplete);

  const checklist: ConsumerOnboardingChecklistItem[] = [
    {
      id: 'facility',
      label: 'Facility profile',
      description: 'Group home name, contact, and delivery address',
      complete: facilityComplete,
      href: '/onboarding?step=facility',
    },
    {
      id: 'safety',
      label: 'Safety restrictions',
      description: 'Critical allergens that must be blocked from orders',
      complete: safetyComplete,
      href: '/onboarding?step=safety',
    },
    {
      id: 'ordering',
      label: 'How you order',
      description: 'Default contract schedule and platform walkthrough',
      complete: orderingComplete,
      href: '/onboarding?step=ordering',
    },
  ];

  const requiredComplete = [facilityComplete, safetyComplete, orderingComplete].filter(
    Boolean
  ).length;
  const progressPercent = Math.round((requiredComplete / 3) * 100);

  let nextStep: ConsumerOnboardingStep = 'facility';
  if (facilityComplete && !safetyComplete) nextStep = 'safety';
  else if (facilityComplete && safetyComplete && !orderingComplete) nextStep = 'ordering';
  else if (isComplete) nextStep = 'ordering';

  return {
    isComplete,
    completedAt,
    checklist,
    nextStep,
    progressPercent,
  };
};
