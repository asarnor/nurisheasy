import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import MenuItem from '@/lib/models/menu.model';
import Organization from '@/lib/models/organization.model';
import { getCurrentOrganization } from '@/lib/utils/clerk';
import { isWithinDeliveryRadius } from '@/lib/utils/geospatial';

/**
 * GET /api/menus
 * Get available menus filtered by safety profile and delivery radius
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

    const searchParams = request.nextUrl.searchParams;
    const vendorId = searchParams.get('vendorId');
    
    // Build query - filter by availability and safety
    const query: any = {
      isAvailable: true,
      // Exclude items with critical allergens
      allergenTags: { $nin: organization.safetyProfile.criticalAllergens },
    };
    
    if (vendorId) {
      query.vendorId = vendorId;
    }

    let menuItems = await MenuItem.find(query).populate('vendorId', 'name address');

    // Filter by delivery radius if consumer has coordinates
    if (organization.address?.coordinates) {
      menuItems = menuItems.filter((item: any) => {
        const vendor = item.vendorId;
        if (!vendor?.address?.coordinates) {
          return false; // Skip vendors without coordinates
        }
        
        return isWithinDeliveryRadius(
          organization.address.coordinates,
          vendor.address.coordinates,
          10 // 10km default radius
        );
      });
    }

    return NextResponse.json({
      items: menuItems.map((item) => ({
        id: item._id,
        vendorId: item.vendorId._id,
        vendorName: item.vendorId.name,
        name: item.name,
        description: item.description,
        price: item.price,
        allergenTags: item.allergenTags,
        ingredients: item.ingredients,
        imageUrl: item.imageUrl,
        category: item.category,
      })),
    });
  } catch (error) {
    console.error('Error fetching menus:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menus' },
      { status: 500 }
    );
  }
}
