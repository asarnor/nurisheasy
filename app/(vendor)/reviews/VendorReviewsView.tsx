'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { VendorShell } from '@/components/layout/VendorShell';
import { apiFetch } from '@/lib/utils/api';

interface Review {
  id: string;
  orderId: string;
  consumerName: string;
  rating: number;
  comment?: string;
  fulfillmentMethod: 'pickup' | 'delivery';
  createdAt: string;
}

export default function VendorReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const response = await apiFetch('/api/reviews?vendorId=current');
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

  return (
    <VendorShell
      active="reviews"
      title="Customer Reviews"
      subtitle="Feedback from group homes after pickup or delivery."
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <Card className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Average rating</p>
            <p className="text-3xl font-semibold text-slate-900">
              {reviews.length ? averageRating.toFixed(1) : '—'}
              <span className="ml-2 text-lg text-amber-400">★</span>
            </p>
          </div>
          <Badge variant="info">{reviews.length} review{reviews.length === 1 ? '' : 's'}</Badge>
        </Card>

        {loading ? (
          <Card className="text-center py-12">
            <p className="text-slate-500">Loading reviews...</p>
          </Card>
        ) : reviews.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-slate-500">No reviews yet. Reviews appear after orders are delivered or picked up.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{review.consumerName}</h3>
                    <p className="text-xs text-slate-500">
                      Order #{review.orderId.slice(-8)} ·{' '}
                      {review.fulfillmentMethod === 'delivery' ? 'Delivery' : 'Pickup'} ·{' '}
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-amber-400 text-lg">
                    {'★'.repeat(review.rating)}
                    <span className="text-slate-200">{'★'.repeat(5 - review.rating)}</span>
                  </div>
                </div>
                {review.comment ? (
                  <p className="text-sm text-slate-700">{review.comment}</p>
                ) : (
                  <p className="text-sm text-slate-400 italic">No written feedback</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </VendorShell>
  );
}
