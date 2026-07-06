import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Organization from '@/lib/models/organization.model';
import MenuItem from '@/lib/models/menu.model';
import { getCurrentOrganization } from '@/lib/utils/clerk';
import { isWithinDeliveryRadius } from '@/lib/utils/geospatial';
import { shouldUseMockData } from '@/lib/utils/debug';
import { getMockMarketplaceVendors } from '@/lib/mock-data';
import {
  buildMarketplaceVendorListing,
  filterMarketplaceVendors,
  parseMarketplaceVendorFilters,
  type MarketplaceMenuSnapshot,
} from '@/lib/marketplace-vendors';
import { mergeVendorSettings } from '@/lib/vendor-settings';

/**
 * GET /api/vendors
 * Published vendors for the consumer marketplace with optional filters.
 */
export async function GET(request: NextRequest) {
  try {
    const filters = parseMarketplaceVendorFilters(request.nextUrl.searchParams);

    if (await shouldUseMockData(request)) {
      return NextResponse.json({
        vendors: getMockMarketplaceVendors(filters),
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

    const menuItems: MarketplaceMenuSnapshot[] = rawMenuItems.map((item: any) => ({
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
