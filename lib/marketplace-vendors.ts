import {
  CONTRACT_DURATIONS_MONTHS,
  getPreparationDayLabel,
  type ContractDurationMonths,
  type FulfillmentMethod,
} from '@/lib/contract-options';
import { isMealCategory, itemMatchesMeal, type MealCategory } from '@/lib/meal-categories';
import {
  mergeVendorSettings,
  VENDOR_CERTIFICATIONS,
  type AllergenTag,
  type CertificationsReviewStatus,
  type VendorCertification,
  type VendorSettings,
} from '@/lib/vendor-settings';
import type { Address } from '@/lib/types';

export interface MarketplaceMenuSnapshot {
  id: string;
  vendorId: string;
  name: string;
  description?: string;
  allergenTags: string[];
  ingredients: string[];
  mealCategories?: string[] | null;
  category?: string | null;
  isAvailable?: boolean;
}

export interface MarketplaceVendorListing {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  address?: Address;
  menuItemCount: number;
  averageRating: number | null;
  reviewCount: number;
  certifications: VendorCertification[];
  certificationsReviewStatus: CertificationsReviewStatus;
  facilityAllergensHandled: AllergenTag[];
  preparationDays: number[];
  mealPeriods: MealCategory[];
  offeredContractDurations: ContractDurationMonths[];
  offersPickup: boolean;
  offersDelivery: boolean;
  acceptingNewContracts: boolean;
  minimumOrderCents: number;
  deliveryFeeCents: number;
}

export interface MarketplaceVendorFilters {
  q?: string;
  meal?: MealCategory;
  dietary?: string[];
  certification?: VendorCertification[];
  preparationDay?: number;
  contractMonths?: ContractDurationMonths;
  fulfillment?: FulfillmentMethod;
  acceptingContractsOnly?: boolean;
}

export const MARKETPLACE_DIETARY_FILTERS = [
  { id: 'HALAL', label: 'Halal' },
  { id: 'KOSHER', label: 'Kosher' },
  { id: 'LOW_SODIUM', label: 'Low sodium' },
  { id: 'VEGETARIAN', label: 'Vegetarian' },
  { id: 'VEGAN', label: 'Vegan' },
  { id: 'NUT_FREE', label: 'Nut-free' },
  { id: 'GLUTEN_FREE', label: 'Gluten-free' },
  { id: 'DAIRY_FREE', label: 'Dairy-free' },
] as const;

export type MarketplaceDietaryFilterId =
  (typeof MARKETPLACE_DIETARY_FILTERS)[number]['id'];

const DIETARY_CERTIFICATION_MAP: Partial<
  Record<MarketplaceDietaryFilterId, VendorCertification>
> = {
  HALAL: 'HALAL',
  KOSHER: 'KOSHER',
  NUT_FREE: 'NUT_FREE_KITCHEN',
  GLUTEN_FREE: 'GLUTEN_FREE_FACILITY',
};

const DIETARY_KEYWORDS: Partial<Record<MarketplaceDietaryFilterId, string[]>> = {
  LOW_SODIUM: ['low sodium', 'low-sodium', 'heart healthy'],
  VEGETARIAN: ['vegetarian', 'veggie', 'plant-based'],
  VEGAN: ['vegan', 'plant-based', 'dairy-free'],
};

const certificationLabel = (id: VendorCertification) =>
  VENDOR_CERTIFICATIONS.find((entry) => entry.id === id)?.label || id;

const vendorMenuItems = (
  vendorId: string,
  menuItems: MarketplaceMenuSnapshot[]
) =>
  menuItems.filter(
    (item) => item.vendorId === vendorId && item.isAvailable !== false
  );

const textIncludesAny = (haystack: string, needles: string[]) => {
  const normalized = haystack.toLowerCase();
  return needles.some((needle) => normalized.includes(needle));
};

const menuTextBlob = (items: MarketplaceMenuSnapshot[]) =>
  items
    .map(
      (item) =>
        `${item.name} ${item.description || ''} ${(item.ingredients || []).join(' ')}`
    )
    .join(' ')
    .toLowerCase();

const vendorSearchBlob = (
  vendor: MarketplaceVendorListing,
  menuItems: MarketplaceMenuSnapshot[],
  settings?: Partial<VendorSettings>
) => {
  const menus = vendorMenuItems(vendor.id, menuItems);
  return [
    vendor.name,
    vendor.description,
    settings?.allergenPolicyNotes,
    settings?.ingredientSourcingNotes,
    vendor.certifications.map(certificationLabel).join(' '),
    menus.map((item) => item.name).join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};

const matchesDietaryFilter = (
  dietaryId: MarketplaceDietaryFilterId,
  vendor: MarketplaceVendorListing,
  menuItems: MarketplaceMenuSnapshot[],
  settings?: Partial<VendorSettings>
) => {
  const menus = vendorMenuItems(vendor.id, menuItems);
  const menuAllergens = new Set(menus.flatMap((item) => item.allergenTags || []));
  const textBlob = [
    vendor.description,
    settings?.allergenPolicyNotes,
    settings?.ingredientSourcingNotes,
    menuTextBlob(menus),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const mappedCert = DIETARY_CERTIFICATION_MAP[dietaryId];
  if (mappedCert && vendor.certifications.includes(mappedCert)) {
    return true;
  }

  const keywords = DIETARY_KEYWORDS[dietaryId];
  if (keywords && textIncludesAny(textBlob, keywords)) {
    return true;
  }

  switch (dietaryId) {
    case 'NUT_FREE':
      return !menuAllergens.has('PEANUT') && !menuAllergens.has('TREE_NUT');
    case 'GLUTEN_FREE':
      return !menuAllergens.has('WHEAT') && !menuAllergens.has('GLUTEN');
    case 'DAIRY_FREE':
      return !menuAllergens.has('DAIRY');
    default:
      return false;
  }
};

export const parseMarketplaceVendorFilters = (
  searchParams: URLSearchParams
): MarketplaceVendorFilters => {
  const meal = searchParams.get('meal');
  const contractMonths = Number(searchParams.get('contractMonths'));
  const preparationDay = Number(searchParams.get('preparationDay'));

  return {
    q: searchParams.get('q')?.trim() || undefined,
    meal: meal && isMealCategory(meal) ? meal : undefined,
    dietary: searchParams
      .get('dietary')
      ?.split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
    certification: searchParams
      .get('certification')
      ?.split(',')
      .map((entry) => entry.trim())
      .filter((entry): entry is VendorCertification =>
        VENDOR_CERTIFICATIONS.some((cert) => cert.id === entry)
      ),
    preparationDay:
      Number.isInteger(preparationDay) && preparationDay >= 0 && preparationDay <= 6
        ? preparationDay
        : undefined,
    contractMonths: CONTRACT_DURATIONS_MONTHS.includes(
      contractMonths as ContractDurationMonths
    )
      ? (contractMonths as ContractDurationMonths)
      : undefined,
    fulfillment:
      searchParams.get('fulfillment') === 'pickup' ||
      searchParams.get('fulfillment') === 'delivery'
        ? (searchParams.get('fulfillment') as FulfillmentMethod)
        : undefined,
    acceptingContractsOnly: searchParams.get('acceptingContractsOnly') === '1',
  };
};

export const buildMarketplaceVendorListing = (input: {
  id: string;
  name: string;
  address?: Address;
  vendorSettings?: Partial<VendorSettings> | null;
  menuItems: MarketplaceMenuSnapshot[];
  averageRating?: number | null;
  reviewCount?: number;
}): MarketplaceVendorListing => {
  const settings = mergeVendorSettings(input.vendorSettings);
  const availableMenus = vendorMenuItems(input.id, input.menuItems);

  return {
    id: input.id,
    name: input.name,
    description: settings.description,
    logoUrl: settings.logoUrl || undefined,
    address: input.address,
    menuItemCount: availableMenus.length,
    averageRating: input.averageRating ?? null,
    reviewCount: input.reviewCount ?? 0,
    certifications: settings.certifications,
    certificationsReviewStatus: settings.certificationsReviewStatus,
    facilityAllergensHandled: settings.facilityAllergensHandled,
    preparationDays: settings.preparationDays,
    mealPeriods: settings.mealPeriods,
    offeredContractDurations: settings.offeredContractDurations,
    offersPickup: settings.offersPickup,
    offersDelivery: settings.offersDelivery,
    acceptingNewContracts: settings.acceptingNewContracts,
    minimumOrderCents: settings.minimumOrderCents,
    deliveryFeeCents: settings.deliveryFeeCents,
  };
};

export const matchesMarketplaceVendorFilters = (
  vendor: MarketplaceVendorListing,
  menuItems: MarketplaceMenuSnapshot[],
  filters: MarketplaceVendorFilters,
  settings?: Partial<VendorSettings>
) => {
  if (vendor.menuItemCount <= 0) return false;
  if (filters.acceptingContractsOnly && !vendor.acceptingNewContracts) return false;

  if (filters.fulfillment === 'pickup' && !vendor.offersPickup) return false;
  if (filters.fulfillment === 'delivery' && !vendor.offersDelivery) return false;

  if (
    filters.contractMonths &&
    !vendor.offeredContractDurations.includes(filters.contractMonths)
  ) {
    return false;
  }

  if (
    filters.preparationDay !== undefined &&
    !vendor.preparationDays.includes(filters.preparationDay)
  ) {
    return false;
  }

  if (filters.meal) {
    if (!vendor.mealPeriods.includes(filters.meal)) return false;
    const menus = vendorMenuItems(vendor.id, menuItems);
    if (!menus.some((item) => itemMatchesMeal(item, filters.meal!))) {
      return false;
    }
  }

  if (filters.certification?.length) {
    const hasAllCerts = filters.certification.every((cert) =>
      vendor.certifications.includes(cert)
    );
    if (!hasAllCerts) return false;
  }

  if (filters.dietary?.length) {
    const hasAllDietary = filters.dietary.every((dietaryId) =>
      matchesDietaryFilter(
        dietaryId as MarketplaceDietaryFilterId,
        vendor,
        menuItems,
        settings
      )
    );
    if (!hasAllDietary) return false;
  }

  if (filters.q) {
    const blob = vendorSearchBlob(vendor, menuItems, settings);
    const terms = filters.q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.every((term) => blob.includes(term))) return false;
  }

  return true;
};

export const filterMarketplaceVendors = (
  vendors: MarketplaceVendorListing[],
  menuItems: MarketplaceMenuSnapshot[],
  filters: MarketplaceVendorFilters,
  settingsByVendorId?: Record<string, Partial<VendorSettings> | undefined>
) =>
  vendors.filter((vendor) =>
    matchesMarketplaceVendorFilters(
      vendor,
      menuItems,
      filters,
      settingsByVendorId?.[vendor.id]
    )
  );

export const formatPreparationDays = (days: number[]) =>
  days.length
    ? days.map((day) => getPreparationDayLabel(day).slice(0, 3)).join(', ')
    : '—';

export const formatContractDurations = (durations: ContractDurationMonths[]) =>
  durations.length ? durations.map((months) => `${months} mo`).join(', ') : '—';
