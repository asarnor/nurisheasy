import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import MenuItem from '@/lib/models/menu.model';
import { getCurrentOrganization } from '@/lib/utils/clerk';
import { auth } from '@clerk/nextjs/server';
import { shouldUseMockData, getDebugRoleFromRequest } from '@/lib/utils/debug';
import {
  getMockMenuItemById,
  updateMockMenuItem,
} from '@/lib/mock-data';

/**
 * POST /api/menus/[menuId]/verify
 *
 * Lightweight "still-accurate" re-verification for a menu item. Vendors call
 * this from the menu editor (or KDS "morning check" prompt) to bump
 * `lastVerifiedAt` and `lastAttestedAt` without re-editing every field. The
 * stored allergen attestation blob is preserved but its `attestedAt` is
 * refreshed so downstream audits see a fresh timestamp.
 */
export async function POST(
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

      const existing = getMockMenuItemById(params.menuId);
      if (!existing) {
        return NextResponse.json(
          { error: 'Menu item not found' },
          { status: 404 }
        );
      }

      const nowIso = new Date().toISOString();
      const attesterId =
        existing.lastAttestedBy ||
        existing.allergenAttestation?.attestedBy ||
        'debug-vendor';

      const updated = updateMockMenuItem(params.menuId, {
        lastVerifiedAt: nowIso,
        lastAttestedAt: nowIso,
        lastAttestedBy: attesterId,
        allergenAttestation: existing.allergenAttestation
          ? { ...existing.allergenAttestation, attestedAt: nowIso }
          : {
              confirmedTags: [...(existing.allergenTags || [])],
              confirmedAbsentTags: [],
              attestedBy: attesterId,
              attestedAt: nowIso,
            },
      });

      return NextResponse.json({
        menuItem: updated,
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

    const menuItem = await MenuItem.findById(params.menuId);

    if (!menuItem) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      );
    }

    if (menuItem.vendorId.toString() !== organization._id.toString()) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { userId } = await auth();
    const attesterId =
      userId ||
      menuItem.lastAttestedBy ||
      menuItem.allergenAttestation?.attestedBy ||
      organization.name ||
      'vendor';
    const now = new Date();

    menuItem.lastVerifiedAt = now;
    menuItem.lastAttestedAt = now;
    menuItem.lastAttestedBy = attesterId;

    if (menuItem.allergenAttestation) {
      menuItem.allergenAttestation.attestedAt = now;
      menuItem.allergenAttestation.attestedBy = attesterId;
    } else {
      menuItem.allergenAttestation = {
        confirmedTags: [...(menuItem.allergenTags || [])],
        confirmedAbsentTags: [],
        attestedBy: attesterId,
        attestedAt: now,
      } as any;
    }

    await menuItem.save();

    return NextResponse.json({
      menuItem: {
        id: menuItem._id,
        _id: menuItem._id,
        lastVerifiedAt: menuItem.lastVerifiedAt,
        lastAttestedAt: menuItem.lastAttestedAt,
        lastAttestedBy: menuItem.lastAttestedBy,
        allergenTags: menuItem.allergenTags,
        allergenAttestation: menuItem.allergenAttestation,
      },
    });
  } catch (error) {
    console.error('Error verifying menu item:', error);
    return NextResponse.json(
      { error: 'Failed to verify menu item' },
      { status: 500 }
    );
  }
}
