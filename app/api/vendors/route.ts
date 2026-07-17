import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Organization from '@/lib/models/organization.model';
import MenuItem from '@/lib/models/menu.model';
import { getCurrentOrganization } from '@/lib/utils/clerk';
import { isWithinDeliveryRadius } from '@/lib/utils/geospatial';
import { shouldUseMockData, getDebugRoleFromRequest } from '@/lib/utils/debug';
import { getMockMarketplaceVendors, getMockOrganization } from '@/lib/mock-data';
import {
  buildMarketplaceVendorListing,
  filterMarketplaceVendors,
  parseMarketplaceVendorFilters,
  type MarketplaceMenuSnapshot,
} from '@/lib/marketplace-vendors';
import { mergeVendorSettings } from '@/lib/vendor-settings';
import { getActivePlatformRules } from '@/lib/platform-rules';
import { isMenuItemStale, toStaleRules } from '@/lib/menu-verification';

/**
 * GET /api/vendors
 * Published vendors for the consumer marketplace with optional filters.
 */
export async function GET(request: NextRequest) {
  try {
    const filters = parseMarketplaceVendorFilters(request.nextUrl.searchParams);

    if (await shouldUseMockData(request)) {
      const role = await getDebugRoleFromRequest(request);
      const consumer = role === 'consumer' ? getMockOrganization('consumer') : null;
      const criticalAllergens = consumer?.safetyProfile?.criticalAllergens || [];
      const blockFacility = Boolean(
        (consumer?.safetyProfile as any)?.blockFacilityCrossContact
      );
      let vendors = getMockMarketplaceVendors(filters);
      if (blockFacility && criticalAllergens.length) {
        vendors = vendors.filter(
          (vendor) =>
            !(vendor.facilityAllergensHandled || []).some((tag) =>
              criticalAllergens.includes(tag)
            )
        );
      }
      return NextResponse.json({
        vendors,
        filters,
      });
    }

    await connectDB();

    const organization = await getCurrentOrganization();

    if (!organization || organization.type !== 'consumer') {
      return NextResponse.json(
        { error: 'Consumer organization required' },
        { status: 403 }
      );
    }

    const vendors = await Organization.find({ type: 'vendor', marketplaceVisible: true });

    let availableVendors = vendors;

    if (organization.address?.coordinates) {
      availableVendors = vendors.filter((vendor) => {
        if (!vendor.address?.coordinates) return false;

        return isWithinDeliveryRadius(
          organization.address!.coordinates!,
          vendor.address.coordinates,
          10
        );
      });
    }

    const vendorIds = availableVendors.map((vendor) => vendor._id);
    const rawMenuItems = await MenuItem.find({
      vendorId: { $in: vendorIds },
      isAvailable: true,
      allergenTags: { $nin: organization.safetyProfile.criticalAllergens },
    }).lean();

    const platformRules = await getActivePlatformRules();
    const staleRules = toStaleRules(platformRules.inventory);

    const menuItems: MarketplaceMenuSnapshot[] = rawMenuItems
      .filter((item: any) => !isMenuItemStale(item, staleRules))
      .map((item: any) => ({
        id: item._id?.toString?.() || String(item._id),
        vendorId: item.vendorId?.toString?.() || String(item.vendorId),
        name: item.name,
        description: item.description,
        allergenTags: item.allergenTags || [],
        ingredients: item.ingredients || [],
        mealCategories: item.mealCategories,
        category: item.category,
        isAvailable: item.isAvailable,
      }));

    // Facility cross-contact hard block
    const criticalAllergens = organization.safetyProfile.criticalAllergens || [];
    const blockFacility = Boolean(
      (organization.safetyProfile as any).blockFacilityCrossContact
    );
    if (blockFacility && criticalAllergens.length) {
      availableVendors = availableVendors.filter((vendor) => {
        const facility: string[] =
          ((vendor.vendorSettings as any)?.facilityAllergensHandled as string[]) || [];
        return !facility.some((tag) => criticalAllergens.includes(tag));
      });
    }

    const listings = availableVendors.map((vendor) => {
      const vendorId = vendor._id.toString();
      const settings = mergeVendorSettings(vendor.vendorSettings as any);

      return buildMarketplaceVendorListing({
        id: vendorId,
        name: vendor.name,
        address: vendor.address,
        vendorSettings: settings,
        menuItems,
      });
    });

    const settingsByVendorId = Object.fromEntries(
      availableVendors.map((vendor) => [
        vendor._id.toString(),
        mergeVendorSettings(vendor.vendorSettings as any),
      ])
    );

    const filteredVendors = filterMarketplaceVendors(
      listings,
      menuItems,
      filters,
      settingsByVendorId
    );

    return NextResponse.json({
      vendors: filteredVendors,
      filters,
    });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}
