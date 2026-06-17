'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ConsumerAccountShell } from '@/components/layout/ConsumerAccountShell';
import { apiFetch } from '@/lib/utils/api';

interface Review {
  id: string;
  orderId: string;
  vendorId: string;
  rating: number;
  comment?: string;
  fulfillmentMethod: 'pickup' | 'delivery';
  createdAt: string;
}

export default function AccountReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/reviews')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setReviews(data?.reviews || []))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <ConsumerAccountShell
      active="reviews"
      title="Reviews"
      subtitle="Feedback you have submitted for vendors after pickup or delivery."
    >
      {loading ? (
        <p className="text-slate-500">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-slate-500">
            No reviews yet. You can rate vendors after an order is delivered.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    {'★'.repeat(review.rating)}
                    <span className="text-slate-300">{'★'.repeat(5 - review.rating)}</span>
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Order #{review.orderId.slice(-8)} •{' '}
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                  {review.comment && (
                    <p className="text-sm text-slate-700 mt-3">{review.comment}</p>
                  )}
                </div>
                <Badge variant="info" className="capitalize">
                  {review.fulfillmentMethod}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </ConsumerAccountShell>
  );
}
