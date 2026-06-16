import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/mongodb';
import Review from '@/lib/models/review.model';
import Order from '@/lib/models/order.model';
import { getCurrentOrganization } from '@/lib/utils/clerk';
import { shouldUseMockData, getDebugRoleFromRequest } from '@/lib/utils/debug';
import {
  createMockReview,
  getMockReviews,
  getMockVendorId,
} from '@/lib/mock-data';

const reviewSchema = z.object({
  orderId: z.string().min(1),
  vendorId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  fulfillmentMethod: z.enum(['pickup', 'delivery']),
});

export async function GET(request: NextRequest) {
  try {
    if (await shouldUseMockData(request)) {
      const role = await getDebugRoleFromRequest(request);
      const vendorId =
        request.nextUrl.searchParams.get('vendorId') === 'current'
          ? getMockVendorId()
          : request.nextUrl.searchParams.get('vendorId') || undefined;
      const orderId = request.nextUrl.searchParams.get('orderId') || undefined;

      if (role !== 'vendor' && role !== 'consumer' && role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      const reviews = getMockReviews({ vendorId, orderId });
      return NextResponse.json({ reviews });
    }

    await connectDB();
    const organization = await getCurrentOrganization();

    if (!organization) {
      return NextResponse.json({ error: 'Organization required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('orderId');
    const query: Record<string, unknown> = {};

    if (organization.type === 'vendor') {
      query.vendorId = organization._id;
    } else if (organization.type === 'consumer') {
      query.consumerId = organization._id;
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (orderId) {
      query.orderId = orderId;
    }

    const reviews = await Review.find(query).sort({ createdAt: -1 }).limit(100);

    return NextResponse.json({
      reviews: reviews.map((review) => ({
        id: review._id,
        orderId: review.orderId,
        vendorId: review.vendorId,
        consumerId: review.consumerId,
        consumerName: review.consumerName,
        rating: review.rating,
        comment: review.comment,
        fulfillmentMethod: review.fulfillmentMethod,
        createdAt: review.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = reviewSchema.parse(body);

    if (await shouldUseMockData(request)) {
      const role = await getDebugRoleFromRequest(request);
      if (role !== 'consumer') {
        return NextResponse.json({ error: 'Consumer organization required' }, { status: 403 });
      }

      const review = createMockReview(validated);
      if (!review) {
        const duplicate = getMockReviews({
          orderId: validated.orderId,
          vendorId: validated.vendorId,
        })[0];
        if (duplicate) {
          return NextResponse.json({ error: 'Review already submitted' }, { status: 409 });
        }
        return NextResponse.json(
          { error: 'Order not found or not yet fulfilled' },
          { status: 400 }
        );
      }

      return NextResponse.json({ review });
    }

    await connectDB();
    const organization = await getCurrentOrganization();

    if (!organization || organization.type !== 'consumer') {
      return NextResponse.json({ error: 'Consumer organization required' }, { status: 403 });
    }

    const order = await Order.findById(validated.orderId);
    if (!order || order.consumerId.toString() !== organization._id.toString()) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const subOrder = order.subOrders.find(
      (entry) => entry.vendorId.toString() === validated.vendorId
    );
    if (!subOrder || subOrder.status !== 'DELIVERED') {
      return NextResponse.json(
        { error: 'You can only review vendors after pickup or delivery' },
        { status: 400 }
      );
    }

    const existing = await Review.findOne({
      orderId: validated.orderId,
      vendorId: validated.vendorId,
    });
    if (existing) {
      return NextResponse.json({ error: 'Review already submitted' }, { status: 409 });
    }

    const review = await Review.create({
      orderId: validated.orderId,
      vendorId: validated.vendorId,
      consumerId: organization._id,
      consumerName: organization.name,
      rating: validated.rating,
      comment: validated.comment,
      fulfillmentMethod: validated.fulfillmentMethod,
    });

    return NextResponse.json({
      review: {
        id: review._id,
        orderId: review.orderId,
        vendorId: review.vendorId,
        rating: review.rating,
        comment: review.comment,
        fulfillmentMethod: review.fulfillmentMethod,
        createdAt: review.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating review:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
