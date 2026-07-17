import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/mongodb';
import MenuItem from '@/lib/models/menu.model';
import { getCurrentOrganization } from '@/lib/utils/clerk';
import { auth } from '@clerk/nextjs/server';
import { shouldUseMockData, getDebugRoleFromRequest } from '@/lib/utils/debug';
import { deleteMockMenuItem, getMockMenuItemById, getMockVendorId, updateMockMenuItem } from '@/lib/mock-data';
import {
  maybeRefreshGeneratedImage,
  resolveMenuItemImageUrl,
} from '@/lib/menu-item-images';
import { normalizeMealCategoriesInput } from '@/lib/meal-categories';

const mealCategorySchema = z.enum(['breakfast', 'lunch', 'dinner']);

const allergenAttestationSchema = z.object({
  confirmedTags: z.array(z.string()).default([]),
  confirmedAbsentTags: z.array(z.string()).default([]),
  attestedBy: z.string().optional(),
});

// If the vendor supplied new allergenTags or an attestation block we require
// each currently-marked tag to be re-confirmed. Partial updates (e.g. toggling
// availability) don't require attestation.
function checkAttestationConsistency(
  nextAllergenTags: string[] | undefined,
  attestation: { confirmedTags: string[]; confirmedAbsentTags: string[] } | undefined,
  existingAllergenTags: string[]
) {
  const touchesAllergens = nextAllergenTags !== undefined || attestation !== undefined;
  if (!touchesAllergens) return null;

  const present = nextAllergenTags ?? existingAllergenTags ?? [];
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

function buildAttestationPatch(
  validatedData: {
    allergenTags?: string[];
    allergenAttestation?: {
      confirmedTags: string[];
      confirmedAbsentTags: string[];
      attestedBy?: string;
    };
  },
  attesterFallback: string
): {
  allergenAttestation?: {
    confirmedTags: string[];
    confirmedAbsentTags: string[];
    attestedBy: string;
    attestedAt: Date;
  };
  lastAttestedAt?: Date;
  lastAttestedBy?: string;
} {
  if (
    validatedData.allergenAttestation === undefined &&
    validatedData.allergenTags === undefined
  ) {
    return {};
  }
  const now = new Date();
  const attesterId =
    validatedData.allergenAttestation?.attestedBy || attesterFallback;
  const attestation = {
    confirmedTags: validatedData.allergenAttestation?.confirmedTags || [],
    confirmedAbsentTags:
      validatedData.allergenAttestation?.confirmedAbsentTags || [],
    attestedBy: attesterId,
    attestedAt: now,
  };
  return {
    allergenAttestation: attestation,
    lastAttestedAt: now,
    lastAttestedBy: attesterId,
  };
}

const updateMenuItemSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  price: z.number().optional(),
  isAvailable: z.boolean().optional(),
  allergenTags: z.array(z.string()).optional(),
  ingredients: z.array(z.string()).optional(),
  imageUrl: z.string().optional(),
  mealCategories: z.array(mealCategorySchema).min(1).optional(),
  category: z.string().optional(),
  stockQuantity: z.number().int().min(0).nullable().optional(),
  servingSizeOz: z.number().min(0).nullable().optional(),
  maxPortionsPerOrder: z.number().int().min(1).nullable().optional(),
  allergenAttestation: allergenAttestationSchema.optional(),
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
      const existing = getMockMenuItemById(params.menuId);

      if (!existing) {
        return NextResponse.json(
          { error: 'Menu item not found' },
          { status: 404 }
        );
      }

      const attestationCheck = checkAttestationConsistency(
        validatedData.allergenTags,
        validatedData.allergenAttestation,
        existing.allergenTags
      );
      if (attestationCheck) return attestationCheck;

      const attestationPatch = buildAttestationPatch(
        validatedData,
        'debug-vendor'
      );
      const mockAttestationPatch = attestationPatch.allergenAttestation
        ? {
            allergenAttestation: {
              confirmedTags: attestationPatch.allergenAttestation.confirmedTags,
              confirmedAbsentTags:
                attestationPatch.allergenAttestation.confirmedAbsentTags,
              attestedBy: attestationPatch.allergenAttestation.attestedBy,
              attestedAt:
                attestationPatch.allergenAttestation.attestedAt.toISOString(),
            },
            lastAttestedAt: attestationPatch.lastAttestedAt!.toISOString(),
            lastAttestedBy: attestationPatch.lastAttestedBy!,
          }
        : {};

      const nextImageUrl = maybeRefreshGeneratedImage(existing, validatedData);
      const { allergenAttestation: _ignoreAttestation, ...restValidated } =
        validatedData;
      const menuItem = updateMockMenuItem(params.menuId, {
        ...restValidated,
        vendorId,
        ...(validatedData.mealCategories
          ? {
              mealCategories: normalizeMealCategoriesInput(validatedData.mealCategories),
            }
          : {}),
        ...(nextImageUrl !== undefined ? { imageUrl: nextImageUrl } : {}),
        ...mockAttestationPatch,
        lastVerifiedAt: new Date().toISOString(),
      });

      if (!menuItem) {
        return NextResponse.json(
          { error: 'Menu item not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        menuItem: {
          ...menuItem,
          displayImageUrl: resolveMenuItemImageUrl(menuItem, menuItem.id),
        },
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

    const attestationCheck = checkAttestationConsistency(
      validatedData.allergenTags,
      validatedData.allergenAttestation,
      menuItem.allergenTags || []
    );
    if (attestationCheck) return attestationCheck;

    const nextImageUrl = maybeRefreshGeneratedImage(
      {
        id: menuItem._id.toString(),
        name: menuItem.name,
        description: menuItem.description,
        ingredients: menuItem.ingredients,
        mealCategories: menuItem.mealCategories,
        category: menuItem.category,
        imageUrl: menuItem.imageUrl,
      },
      validatedData
    );

    const { allergenAttestation: _ignoreAttestation, ...restValidated } =
      validatedData;
    Object.assign(menuItem, restValidated);
    if (validatedData.mealCategories) {
      menuItem.mealCategories = normalizeMealCategoriesInput(validatedData.mealCategories);
    }
    if (nextImageUrl !== undefined) {
      menuItem.imageUrl = nextImageUrl;
    }
    menuItem.lastVerifiedAt = new Date();

    const { userId } = await auth();
    const attesterId = userId || organization.name || 'vendor';
    const attestationPatch = buildAttestationPatch(validatedData, attesterId);
    if (attestationPatch.allergenAttestation) {
      menuItem.allergenAttestation = attestationPatch.allergenAttestation as any;
      menuItem.lastAttestedAt = attestationPatch.lastAttestedAt;
      menuItem.lastAttestedBy = attestationPatch.lastAttestedBy;
    }

    await menuItem.save();

    const formatted = {
      id: menuItem._id,
      name: menuItem.name,
      description: menuItem.description,
      price: menuItem.price,
      isAvailable: menuItem.isAvailable,
      allergenTags: menuItem.allergenTags,
      ingredients: menuItem.ingredients,
      imageUrl: menuItem.imageUrl,
      mealCategories: menuItem.mealCategories,
      category: menuItem.category,
      stockQuantity: menuItem.stockQuantity ?? null,
      servingSizeOz: menuItem.servingSizeOz ?? null,
      maxPortionsPerOrder: menuItem.maxPortionsPerOrder ?? null,
      lastVerifiedAt: menuItem.lastVerifiedAt || null,
      lastAttestedAt: menuItem.lastAttestedAt || null,
      lastAttestedBy: menuItem.lastAttestedBy || null,
      allergenAttestation: menuItem.allergenAttestation
        ? {
            confirmedTags: menuItem.allergenAttestation.confirmedTags || [],
            confirmedAbsentTags:
              menuItem.allergenAttestation.confirmedAbsentTags || [],
            attestedBy: menuItem.allergenAttestation.attestedBy || '',
            attestedAt: menuItem.allergenAttestation.attestedAt || null,
          }
        : null,
    };

    return NextResponse.json({
      menuItem: {
        ...formatted,
        displayImageUrl: resolveMenuItemImageUrl(
          { ...formatted, imageUrl: menuItem.imageUrl },
          menuItem._id.toString()
        ),
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
