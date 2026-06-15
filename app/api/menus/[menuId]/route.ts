import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/mongodb';
import MenuItem from '@/lib/models/menu.model';
import { getCurrentOrganization } from '@/lib/utils/clerk';
import { shouldUseMockData, getDebugRoleFromRequest } from '@/lib/utils/debug';
import { deleteMockMenuItem, getMockVendorId, updateMockMenuItem } from '@/lib/mock-data';

const updateMenuItemSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  price: z.number().optional(),
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
 * PATCH /api/menus/[menuId]
 * Update a menu item
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { menuId: string } }
) {
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
      const validatedData = updateMenuItemSchema.parse(body);
      const vendorId = getMockVendorId();
      const menuItem = updateMockMenuItem(params.menuId, {
        ...validatedData,
        vendorId,
      });

      if (!menuItem) {
        return NextResponse.json(
          { error: 'Menu item not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ menuItem });
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
    const validatedData = updateMenuItemSchema.parse(body);

    const menuItem = await MenuItem.findById(params.menuId);
    
    if (!menuItem) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (menuItem.vendorId.toString() !== organization._id.toString()) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Update fields
    Object.assign(menuItem, validatedData);
    menuItem.lastVerifiedAt = new Date();
    
    await menuItem.save();

    return NextResponse.json({
      menuItem: {
        id: menuItem._id,
        name: menuItem.name,
        description: menuItem.description,
        price: menuItem.price,
        isAvailable: menuItem.isAvailable,
        allergenTags: menuItem.allergenTags,
        ingredients: menuItem.ingredients,
        imageUrl: menuItem.imageUrl,
        category: menuItem.category,
        stockQuantity: menuItem.stockQuantity ?? null,
        servingSizeOz: menuItem.servingSizeOz ?? null,
        maxPortionsPerOrder: menuItem.maxPortionsPerOrder ?? null,
      },
    });
  } catch (error) {
    console.error('Error updating menu item:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update menu item' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/menus/[menuId]
 * Delete a menu item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { menuId: string } }
) {
  try {
    if (await shouldUseMockData(request)) {
      const role = await getDebugRoleFromRequest(request);
      if (role !== 'vendor') {
        return NextResponse.json(
          { error: 'Vendor organization required' },
          { status: 403 }
        );
      }

      const deleted = deleteMockMenuItem(params.menuId);
      if (!deleted) {
        return NextResponse.json(
          { error: 'Menu item not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true });
    }

    await connectDB();
    
    const organization = await getCurrentOrganization();
    
    if (!organization || organization.type !== 'vendor') {
      return NextResponse.json(
        { error: 'Vendor organization required' },
        { status: 403 }
      );
    }

    const menuItem = await MenuItem.findById(params.menuId);
    
    if (!menuItem) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (menuItem.vendorId.toString() !== organization._id.toString()) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await menuItem.deleteOne();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return NextResponse.json(
      { error: 'Failed to delete menu item' },
      { status: 500 }
    );
  }
}
