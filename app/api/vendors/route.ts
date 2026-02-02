import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Organization from '@/lib/models/organization.model';
import MenuItem from '@/lib/models/menu.model';
import { getCurrentOrganization } from '@/lib/utils/clerk';
import { isWithinDeliveryRadius } from '@/lib/utils/geospatial';

/**
 * GET /api/vendors
 * Get available vendors within delivery radius
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const organization = await getCurrentOrganization();
    
    if (!organization || organization.type !== 'consumer') {
      return NextResponse.json(
        { error: 'Consumer organization required' },
        { status: 403 }
      );
    }

    // Find all vendors
    const vendors = await Organization.find({ type: 'vendor' });

    // Filter by delivery radius if consumer has coordinates
    let availableVendors = vendors;
    
    if (organization.address?.coordinates) {
      availableVendors = vendors.filter((vendor) => {
        if (!vendor.address?.coordinates) {
          return false;
        }
        
        return isWithinDeliveryRadius(
          organization.address!.coordinates!,
          vendor.address.coordinates,
          10 // 10km default radius
        );
      });
    }

    // Get menu counts for each vendor
    const vendorsWithMenus = await Promise.all(
      availableVendors.map(async (vendor) => {
        const menuCount = await MenuItem.countDocuments({
          vendorId: vendor._id,
          isAvailable: true,
        });

        return {
          id: vendor._id,
          name: vendor.name,
          address: vendor.address,
          menuItemCount: menuCount,
        };
      })
    );

    return NextResponse.json({
      vendors: vendorsWithMenus.filter((v) => v.menuItemCount > 0),
    });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}
