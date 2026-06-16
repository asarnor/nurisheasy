import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/mongodb';
import MenuItem from '@/lib/models/menu.model';
import { getCurrentOrganization } from '@/lib/utils/clerk';
import { isWithinDeliveryRadius } from '@/lib/utils/geospatial';
import { shouldUseMockData, getDebugRoleFromRequest } from '@/lib/utils/debug';
import { createMockMenuItem, getMockMenuItems, getMockVendorId } from '@/lib/mock-data';

const menuItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  isAvailable: z.boolean().optional(),
  allergenTags: z.array(z.string()).optional(),
  ingredients: z.array(z.string()).optional(),
  imageUrl: z.string().optional(),
  category: z.string().optional(),
  stockQuantity: z.number().int().min(0).nullable().optional(),
  servingSizeOz: z.number().min(0).nullable().optional(),
  maxPortionsPerOrder: z.number().int().min(1).nullable().optional(),
});

/**
 * GET /api/menus
 * Get available menus filtered by safety profile and delivery radius
 */
export async function GET(request: NextRequest) {
  try {
    if (await shouldUseMockData(request)) {
      const searchParams = request.nextUrl.searchParams;
      const vendorId = searchParams.get('vendorId') || undefined;
      const role = await getDebugRoleFromRequest(request);

      return NextResponse.json({
        items: getMockMenuItems(role, vendorId),
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

    if (organization.type === 'vendor') {
      const vendorScopeId = vendorId === 'current' || !vendorId ? organization._id : vendorId;
      const menuItems = await MenuItem.find({ vendorId: vendorScopeId });

      return NextResponse.json({
        items: menuItems.map((item: any) => ({
          id: item._id,
          vendorId: item.vendorId,
          vendorName: organization.name,
          name: item.name,
          description: item.description,
          price: item.price,
          allergenTags: item.allergenTags,
          ingredients: item.ingredients,
          imageUrl: item.imageUrl,
          category: item.category,
          isAvailable: item.isAvailable,
          stockQuantity: item.stockQuantity ?? null,
          servingSizeOz: item.servingSizeOz ?? null,
          maxPortionsPerOrder: item.maxPortionsPerOrder ?? null,
        })),
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

    let menuItems = await MenuItem.find(query).populate('vendorId', 'name address');

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
      items: menuItems.map((item: any) => ({
        id: item._id,
        vendorId: item.vendorId?._id || item.vendorId,
        vendorName: (item.vendorId as any)?.name || 'Unknown Vendor',
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
      const vendorId = getMockVendorId();
      const menuItem = createMockMenuItem(vendorId, validatedData);

      if (!menuItem) {
        return NextResponse.json(
          { error: 'Vendor not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ item: menuItem });
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

    const menuItem = await MenuItem.create({
      ...validatedData,
      vendorId: organization._id,
      lastVerifiedAt: new Date(),
    });

    return NextResponse.json({
      item: {
        id: menuItem._id,
        vendorId: menuItem.vendorId,
        name: menuItem.name,
        description: menuItem.description,
        price: menuItem.price,
        isAvailable: menuItem.isAvailable,
        allergenTags: menuItem.allergenTags,
        ingredients: menuItem.ingredients,
        imageUrl: menuItem.imageUrl,
        category: menuItem.category,
      },
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
