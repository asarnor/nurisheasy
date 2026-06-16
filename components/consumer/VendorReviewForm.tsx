'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/utils/api';
import type { FulfillmentMethod } from '@/lib/contract-options';

interface VendorReviewFormProps {
  orderId: string;
  vendorId: string;
  vendorName: string;
  fulfillmentMethod: FulfillmentMethod;
  existingRating?: number;
  existingComment?: string;
  onSubmitted?: () => void;
}

export const VendorReviewForm: React.FC<VendorReviewFormProps> = ({
  orderId,
  vendorId,
  vendorName,
  fulfillmentMethod,
  existingRating,
  existingComment,
  onSubmitted,
}) => {
  const [rating, setRating] = useState(existingRating || 0);
  const [comment, setComment] = useState(existingComment || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(Boolean(existingRating));

  const handleSubmit = async () => {
    if (rating < 1) {
      alert('Please select a rating');
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiFetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          vendorId,
          rating,
          comment: comment.trim() || undefined,
          fulfillmentMethod,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit review');
      }

      setSubmitted(true);
      onSubmitted?.();
    } catch (error) {
      console.error('Error submitting review:', error);
      alert(error instanceof Error ? error.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        Thanks for rating {vendorName}! Your review helps other group homes choose vendors.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <h3 className="font-semibold text-slate-900">Rate {vendorName}</h3>
      <p className="mt-1 text-sm text-slate-500">
        How was your {fulfillmentMethod === 'delivery' ? 'delivery' : 'pickup'} experience?
      </p>

      <div className="mt-4 flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className={`text-2xl transition-colors ${
              star <= rating ? 'text-amber-400' : 'text-slate-300 hover:text-amber-200'
            }`}
            aria-label={`${star} star${star === 1 ? '' : 's'}`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional feedback for the vendor..."
        rows={3}
        className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
      />

      <Button onClick={handleSubmit} className="mt-3" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit review'}
      </Button>
    </div>
  );
};
