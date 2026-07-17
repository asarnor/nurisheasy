import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/mongodb';
import MenuItem from '@/lib/models/menu.model';
import { getCurrentOrganization } from '@/lib/utils/clerk';
import { auth } from '@clerk/nextjs/server';
import { isWithinDeliveryRadius } from '@/lib/utils/geospatial';
import { shouldUseMockData, getDebugRoleFromRequest } from '@/lib/utils/debug';
import { createMockMenuItem, getMockMenuItems, getMockVendorId } from '@/lib/mock-data';
import { getActivePlatformRules } from '@/lib/platform-rules';
import { isMenuItemStale, toStaleRules } from '@/lib/menu-verification';
import {
  assignGeneratedImageIfNeeded,
  resolveMenuItemImageUrl,
} from '@/lib/menu-item-images';
import {
  isMealCategory,
  itemMatchesMeal,
  normalizeMealCategories,
  normalizeMealCategoriesInput,
  type MealCategory,
} from '@/lib/meal-categories';

const mealCategorySchema = z.enum(['breakfast', 'lunch', 'dinner']);

const allergenAttestationSchema = z.object({
  confirmedTags: z.array(z.string()).default([]),
  confirmedAbsentTags: z.array(z.string()).default([]),
  attestedBy: z.string().optional(),
});

// Ensures the vendor has explicitly attested to every allergen they marked
// present (or absent). Callers pass `allergenTags` (present) and the full
// attestation payload. If the vendor tagged an item with an allergen but did
// not confirm it in `confirmedTags`, we reject the write so the safety gate
// never runs on unattested data.
function validateAttestationPayload(
  presentTags: string[] | undefined,
  attestation: { confirmedTags: string[]; confirmedAbsentTags: string[] } | undefined
) {
  const present = presentTags || [];
  const confirmed = attestation?.confirmedTags || [];
  const missing = present.filter((tag) => !confirmed.includes(tag));
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `Attestation required for allergens: ${missing.join(', ')}. Confirm each tag on the item.`,
      },
      { status: 400 }
    );
  }
  return null;
}

const menuItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  isAvailable: z.boolean().optional(),
  allergenTags: z.array(z.string()).optional(),
  ingredients: z.array(z.string()).optional(),
  imageUrl: z.string().optional(),
  mealCategories: z.array(mealCategorySchema).min(1).optional(),
  category: z.string().optional(),
  stockQuantity: z.number().int().min(0).nullable().optional(),
  servingSizeOz: z.number().min(0).nullable().optional(),
  maxPortionsPerOrder: z.number().int().min(1).nullable().optional(),
  allergenAttestation: allergenAttestationSchema,
});

const formatMenuItem = (item: any, organizationName?: string) => {
  const id = item.id || item._id?.toString?.() || item._id;
  const base = {
    id,
    _id: id,
    vendorId: item.vendorId?._id || item.vendorId,
    vendorName:
      organizationName || item.vendorName || (item.vendorId as any)?.name || 'Unknown Vendor',
    name: item.name,
    description: item.description,
    price: item.price,
    allergenTags: item.allergenTags || [],
    ingredients: item.ingredients || [],
    imageUrl: item.imageUrl,
    mealCategories: normalizeMealCategories(item),
    category: item.category,
    isAvailable: item.isAvailable,
    stockQuantity: item.stockQuantity ?? null,
    servingSizeOz: item.servingSizeOz ?? null,
    maxPortionsPerOrder: item.maxPortionsPerOrder ?? null,
    lastVerifiedAt: item.lastVerifiedAt || null,
    lastAttestedAt: item.lastAttestedAt || item.allergenAttestation?.attestedAt || null,
    lastAttestedBy: item.lastAttestedBy || item.allergenAttestation?.attestedBy || null,
    allergenAttestation: item.allergenAttestation
      ? {
          confirmedTags: item.allergenAttestation.confirmedTags || [],
          confirmedAbsentTags: item.allergenAttestation.confirmedAbsentTags || [],
          attestedBy: item.allergenAttestation.attestedBy || '',
          attestedAt: item.allergenAttestation.attestedAt || null,
        }
      : null,
  };

  return {
    ...base,
    displayImageUrl: resolveMenuItemImageUrl(base, id),
  };
};

const filterMenuItemsByMeal = <T extends { mealCategories?: string[] | null; category?: string | null }>(
  items: T[],
  meal?: string | null
) => {
  if (!meal || !isMealCategory(meal)) return items;
  return items.filter((item) => itemMatchesMeal(item, meal as MealCategory));
};

/**
 * GET /api/menus
 * Get available menus filtered by safety profile and delivery radius
 */
export async function GET(request: NextRequest) {
  try {
    if (await shouldUseMockData(request)) {
      const searchParams = request.nextUrl.searchParams;
      const vendorId = searchParams.get('vendorId') || undefined;
      const meal = searchParams.get('meal');
      const role = await getDebugRoleFromRequest(request);

      const items = getMockMenuItems(role, vendorId);
      const filteredItems =
        role === 'vendor' ? items : filterMenuItemsByMeal(items, meal);

      return NextResponse.json({
        items: filteredItems.map((item) => formatMenuItem(item)),
      });
    }

    await connectDB();
    
    const organization = await getCurrentOrganization();
    
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const vendorId = searchParams.get('vendorId');
    const meal = searchParams.get('meal');

    if (organization.type === 'vendor') {
      const vendorScopeId = vendorId === 'current' || !vendorId ? organization._id : vendorId;
      const menuItems = await MenuItem.find({ vendorId: vendorScopeId });

      return NextResponse.json({
        items: menuItems.map((item: any) => formatMenuItem(item, organization.name)),
      });
    }

    if (organization.type !== 'consumer') {
      return NextResponse.json(
        { error: 'Consumer organization required' },
        { status: 403 }
      );
    }
    
    // Build query - filter by availability and safety
    const query: any = {
      isAvailable: true,
      // Exclude items with critical allergens
      allergenTags: { $nin: organization.safetyProfile.criticalAllergens },
    };
    
    if (vendorId) {
      query.vendorId = vendorId;
    }

    if (meal && isMealCategory(meal)) {
      query.mealCategories = meal;
    }

    let menuItems = await MenuItem.find(query).populate(
      'vendorId',
      'name address marketplaceVisible vendorSettings safetyProfile'
    );

    const rules = await getActivePlatformRules();
    const staleRules = toStaleRules(rules.inventory);
    const criticalAllergens = organization.safetyProfile.criticalAllergens || [];
    const blockFacility = Boolean(
      (organization.safetyProfile as any).blockFacilityCrossContact
    );

    menuItems = menuItems.filter((item: any) => {
      const vendor = item.vendorId;
      if (!vendor || vendor.marketplaceVisible === false) {
        return false;
      }
      if (isMenuItemStale(item, staleRules)) {
        return false;
      }
      // Facility-level cross-contact hard block
      if (blockFacility && criticalAllergens.length) {
        const facility: string[] =
          (vendor.vendorSettings as any)?.facilityAllergensHandled || [];
        if (facility.some((tag) => criticalAllergens.includes(tag))) {
          return false;
        }
      }
      return true;
    });

    // Filter by delivery radius if consumer has coordinates
    if (organization.address?.coordinates) {
      const consumerCoords = organization.address.coordinates;
      menuItems = menuItems.filter((item: any) => {
        const vendor = item.vendorId;
        if (!vendor?.address?.coordinates) {
          return false; // Skip vendors without coordinates
        }
        
        return isWithinDeliveryRadius(
          consumerCoords,
          vendor.address.coordinates,
          10 // 10km default radius
        );
      });
    }

    return NextResponse.json({
      items: menuItems.map((item: any) =>
        formatMenuItem(item, (item.vendorId as any)?.name)
      ),
    });
  } catch (error) {
    console.error('Error fetching menus:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menus' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/menus
 * Create a new menu item (vendor)
 */
export async function POST(request: NextRequest) {
  try {
    if (await shouldUseMockData(request)) {
      const role = await getDebugRoleFromRequest(request);
      if (role !== 'vendor') {
        return NextResponse.json(
          { error: 'Vendor organization required' },
          { status: 403 }
        );
      }

      const body = await request.json();
      const validatedData = menuItemSchema.parse(body);
      const attestationValidation = validateAttestationPayload(
        validatedData.allergenTags,
        validatedData.allergenAttestation
      );
      if (attestationValidation) return attestationValidation;

      const vendorId = getMockVendorId();
      const nowIso = new Date().toISOString();
      const attesterId = validatedData.allergenAttestation.attestedBy || 'debug-vendor';
      const menuItem = createMockMenuItem(vendorId, {
        ...validatedData,
        mealCategories: normalizeMealCategoriesInput(validatedData.mealCategories),
        lastVerifiedAt: nowIso,
        allergenAttestation: {
          confirmedTags: validatedData.allergenAttestation.confirmedTags,
          confirmedAbsentTags: validatedData.allergenAttestation.confirmedAbsentTags,
          attestedBy: attesterId,
          attestedAt: nowIso,
        },
        lastAttestedAt: nowIso,
        lastAttestedBy: attesterId,
      });

      if (!menuItem) {
        return NextResponse.json(
          { error: 'Vendor not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        item: formatMenuItem(menuItem),
      });
    }

    await connectDB();

    const organization = await getCurrentOrganization();

    if (!organization || organization.type !== 'vendor') {
      return NextResponse.json(
        { error: 'Vendor organization required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = menuItemSchema.parse(body);
    const attestationValidation = validateAttestationPayload(
      validatedData.allergenTags,
      validatedData.allergenAttestation
    );
    if (attestationValidation) return attestationValidation;

    const withImage = assignGeneratedImageIfNeeded({
      ...validatedData,
      mealCategories: normalizeMealCategoriesInput(validatedData.mealCategories),
    });

    const { userId } = await auth();
    const attesterId =
      validatedData.allergenAttestation.attestedBy ||
      userId ||
      organization.name ||
      'vendor';
    const now = new Date();

    const menuItem = await MenuItem.create({
      ...withImage,
      mealCategories: normalizeMealCategoriesInput(validatedData.mealCategories),
      vendorId: organization._id,
      lastVerifiedAt: now,
      allergenAttestation: {
        confirmedTags: validatedData.allergenAttestation.confirmedTags,
        confirmedAbsentTags: validatedData.allergenAttestation.confirmedAbsentTags,
        attestedBy: attesterId,
        attestedAt: now,
      },
      lastAttestedAt: now,
      lastAttestedBy: attesterId,
    });

    return NextResponse.json({
      item: formatMenuItem(menuItem, organization.name),
    });
  } catch (error) {
    console.error('Error creating menu item:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create menu item' },
      { status: 500 }
    );
  }
}
