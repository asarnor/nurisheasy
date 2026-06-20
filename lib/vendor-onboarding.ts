import type { VendorSettings } from '@/lib/vendor-settings';
import { mergeVendorSettings } from '@/lib/vendor-settings';

export const MIN_ONBOARDING_MENU_ITEMS = 3;

export type VendorOnboardingStep = 'kitchen' | 'menu' | 'launch';

export interface VendorOnboardingChecklistItem {
  id: string;
  label: string;
  description: string;
  complete: boolean;
  href: string;
}

export interface VendorOnboardingStatus {
  isComplete: boolean;
  marketplaceVisible: boolean;
  completedAt?: string;
  menuItemCount: number;
  checklist: VendorOnboardingChecklistItem[];
  nextStep: VendorOnboardingStep;
  progressPercent: number;
}

interface EvaluateOnboardingInput {
  name?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  vendorSettings?: Partial<VendorSettings> | null;
  marketplaceVisible?: boolean;
  onboardingCompletedAt?: string | Date | null;
  menuItemCount: number;
  stripeConnected?: boolean;
}

export const evaluateVendorOnboarding = (
  input: EvaluateOnboardingInput
): VendorOnboardingStatus => {
  const settings = mergeVendorSettings(input.vendorSettings);
  const hasAddress = Boolean(
    input.address?.street &&
      input.address?.city &&
      input.address?.state &&
      input.address?.zipCode
  );
  const hasKitchenName = Boolean(input.name?.trim());
  const hasContactPhone = Boolean(settings.contactPhone?.trim());
  const hasPrepDays = settings.preparationDays.length > 0;
  const hasMealPeriods = settings.mealPeriods.length > 0;
  const hasFulfillment = settings.offersPickup || settings.offersDelivery;
  const hasEnoughMenu = input.menuItemCount >= MIN_ONBOARDING_MENU_ITEMS;

  const kitchenComplete =
    hasKitchenName &&
    hasContactPhone &&
    hasAddress &&
    hasPrepDays &&
    hasMealPeriods &&
    hasFulfillment;

  const menuComplete = hasEnoughMenu;
  const marketplaceVisible = Boolean(input.marketplaceVisible);
  const completedAt = input.onboardingCompletedAt
    ? new Date(input.onboardingCompletedAt).toISOString()
    : undefined;

  const isComplete = Boolean(completedAt) || (kitchenComplete && menuComplete && marketplaceVisible);

  const checklist: VendorOnboardingChecklistItem[] = [
    {
      id: 'kitchen',
      label: 'Kitchen profile',
      description: 'Business name, phone, address, and weekly schedule',
      complete: kitchenComplete,
      href: '/vendor/onboarding?step=kitchen',
    },
    {
      id: 'menu',
      label: 'First menu items',
      description: `Add at least ${MIN_ONBOARDING_MENU_ITEMS} items with meal periods and allergens`,
      complete: menuComplete,
      href: '/vendor/onboarding?step=menu',
    },
    {
      id: 'launch',
      label: 'Go live on marketplace',
      description: 'Publish your kitchen to group homes in your area',
      complete: marketplaceVisible,
      href: '/vendor/onboarding?step=launch',
    },
    {
      id: 'stripe',
      label: 'Connect payouts (optional)',
      description: 'Link Stripe to receive payments — can be done later',
      complete: Boolean(input.stripeConnected),
      href: '/vendor/settings',
    },
  ];

  const requiredComplete = [kitchenComplete, menuComplete, marketplaceVisible].filter(Boolean).length;
  const progressPercent = Math.round((requiredComplete / 3) * 100);

  let nextStep: VendorOnboardingStep = 'kitchen';
  if (kitchenComplete && !menuComplete) nextStep = 'menu';
  else if (kitchenComplete && menuComplete && !marketplaceVisible) nextStep = 'launch';
  else if (isComplete) nextStep = 'launch';

  return {
    isComplete,
    marketplaceVisible,
    completedAt,
    menuItemCount: input.menuItemCount,
    checklist,
    nextStep,
    progressPercent,
  };
};
